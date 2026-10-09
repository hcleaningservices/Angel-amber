
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
