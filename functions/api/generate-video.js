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
  try {
    if (!env.HF_TOKEN) {
      return Response.json(
        { error: "Hugging Face token missing" },
        { status: 500, headers: corsHeaders }
      );
    }

    const { prompt } = await request.json();

    if (typeof prompt !== "string" || !prompt.trim()) {
      return Response.json(
        { error: "Please describe your video" },
        { status: 400, headers: corsHeaders }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Amber API is connected successfully!",
        prompt: prompt.trim()
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    return Response.json(
      { error: "Request could not be processed" },
      { status: 500, headers: corsHeaders }
    );
  }
}
