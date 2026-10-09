
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://hcleaningservices.github.io",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

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
    if (!env.HF_TOKEN) {
      return reply({ error: "Hugging Face token missing" }, 500);
    }

    const { prompt } = await request.json();

    if (typeof prompt !== "string" || !prompt.trim()) {
      return reply({ error: "Please describe your video" }, 400);
    }

    const endpoint =
      "https://vamo455-omni-videos-custom-auto-prompt-high-quality.hf.space/run/_submit_t2v";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.HF_TOKEN}`
      },
      body: JSON.stringify({
        scene_count: 1,
        seconds_per_scene: 3,
        resolution: 384,
        aspect_ratio: "16:9",
        base_prompt: prompt.trim(),
        s1: prompt.trim(),
        s2: "",
        s3: "",
        s4: ""
      }),
      signal: AbortSignal.timeout(25000)
    });

    const raw = await response.text();
    let result;

    try {
      result = JSON.parse(raw);
    } catch {
      return reply({
        error: "Hugging Face returned a non-JSON response",
        httpStatus: response.status
      }, 502);
    }

    if (!response.ok) {
      return reply({
        error: "Hugging Face rejected the request",
        httpStatus: response.status,
        details: result
      }, 502);
    }

    const videoUrl = result.output_1?.video?.url;

    return reply({
      success: Boolean(videoUrl),
      message: videoUrl
        ? "Video generated!"
        : "Hugging Face responded, but no video URL was returned.",
      videoUrl: videoUrl || null,
      status: result.output || null
    });

  } catch (error) {
    return reply({
      error: error.name === "TimeoutError"
        ? "Video generation took too long."
        : "Could not connect to the video generator."
    }, 502);
  }
}
