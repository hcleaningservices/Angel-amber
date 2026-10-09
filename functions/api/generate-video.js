
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://hcleaningservices.github.io",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const baseUrl =
  "https://vamo455-omni-videos-custom-auto-prompt-high-quality.hf.space";

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestPost({ request, env }) {
  const reply = (data, status = 200) =>
    Response.json(data, { status, headers: corsHeaders });

  try {
    const { prompt } = await request.json();

    if (typeof prompt !== "string" || !prompt.trim()) {
      return reply({ error: "Please describe your video" }, 400);
    }

    const headers = {
      "Content-Type": "application/json"
    };

    if (env.HF_TOKEN) {
      headers.Authorization = `Bearer ${env.HF_TOKEN}`;
    }

    const response = await fetch(
      `${baseUrl}/gradio_api/call/_submit_t2v`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: [
            1,
            3,
            384,
            "16:9",
            prompt.trim(),
            prompt.trim(),
            "",
            "",
            ""
          ]
        }),
        signal: AbortSignal.timeout(25000)
      }
    );

    const raw = await response.text();
    let result;

    try {
      result = JSON.parse(raw);
    } catch {
      return reply({
        error: `Queue returned HTTP ${response.status}`,
        details: raw.slice(0, 200)
      }, 502);
    }

    if (!response.ok) {
      return reply({
        error: `Queue error ${response.status}`,
        details: result
      }, 502);
    }

    if (!result.event_id) {
      return reply({
        error: "No queue event ID returned",
        details: result
      }, 502);
    }

    return reply({
      success: true,
      queued: true,
      eventId: result.event_id,
      message: "Video request accepted into queue"
    });

  } catch (error) {
    return reply({
      error: error.name === "TimeoutError"
        ? "Queue connection timed out"
        : "Could not connect to video queue"
    }, 502);
  }
}

export async function onRequestGet({ request, env }) {
  const reply = (data, status = 200) =>
    Response.json(data, {
      status,
      headers: corsHeaders
    });

  const eventId = new URL(request.url).searchParams.get("eventId");

  if (!eventId || !/^[a-zA-Z0-9_-]+$/.test(eventId)) {
    return reply({ error: "Invalid queue event ID" }, 400);
  }

  try {
    const headers = {
      Accept: "text/event-stream"
    };

    if (env.HF_TOKEN) {
      headers.Authorization = `Bearer ${env.HF_TOKEN}`;
    }

    const response = await fetch(
      `${baseUrl}/gradio_api/call/_submit_t2v/${encodeURIComponent(eventId)}`,
      {
        headers,
        signal: AbortSignal.timeout(20000)
      }
    );

    if (!response.ok) {
      return reply({
        error: `Queue status error ${response.status}`
      }, 502);
    }

    const raw = await response.text();
    const events = raw.split(/\r?\n\r?\n/);

    for (const block of events) {
      const event = block.match(/^event:\s*(.+)$/m)?.[1];
      const dataLine = block.match(/^data:\s*(.+)$/m)?.[1];

      if (!event || !dataLine) continue;

      if (event === "complete") {
        const data = JSON.parse(dataLine);
        const videoUrl = data?.[1]?.video?.url || null;

        return reply({
          success: Boolean(videoUrl),
          finished: true,
          videoUrl,
          message: videoUrl
            ? "Your video is ready!"
            : "Generation finished without a video."
        });
      }

      if (event === "error") {
        return reply({
          error: "Video generation failed",
          details: dataLine.slice(0, 300)
        }, 502);
      }
    }

    return reply({
      success: true,
      finished: false,
      message: "Video is still processing"
    });

  } catch (error) {
    return reply({
      error: error.name === "TimeoutError"
        ? "Video is still processing"
        : "Could not check video status"
    }, 502);
  }
}
