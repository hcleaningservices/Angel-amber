
export async function onRequestPost({ request, env }) {
  try {
    if (!env.HF_TOKEN) {
      return Response.json(
        { error: "Hugging Face token missing" },
        { status: 500 }
      );
    }

    const { prompt } = await request.json();

    if (!prompt || !prompt.trim()) {
      return Response.json(
        { error: "Please describe your video" },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "Angel Amber API is connected.",
      prompt: prompt.trim(),
      tokenConfigured: true
    });

  } catch (error) {
    return Response.json(
      { error: "Request could not be processed" },
      { status: 500 }
    );
  }
}
