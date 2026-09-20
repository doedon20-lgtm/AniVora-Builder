export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Website description is required."
      });
    }

    return res.status(200).json({
      success: true,
      message: "AniVora AI backend is connected.",
      prompt: prompt
    });

  } catch (error) {
    return res.status(500).json({
      error: "Something went wrong."
    });
  }
        }
