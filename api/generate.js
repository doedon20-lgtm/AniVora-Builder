export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const { prompt } = req.body || {};

    if (
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Website description is required."
      });
    }

    const apiUrl = (
      process.env.ANIVORA_API_URL ||
      "https://anivora-api-two.vercel.app"
    ).replace(/\/+$/, "");

    const apiKey = process.env.ANIVORA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "AniVora API key is not configured."
      });
    }

    const response = await fetch(
      `${apiUrl}/v1/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          prompt: [
            "You are AniVora Builder, an AI website generator.",
            "Create a complete, modern, responsive website.",
            "Return only valid JSON with these fields:",
            "name, headline, description, button, color, html.",
            "The html field must contain a complete HTML document.",
            "Use inline CSS, semantic HTML, and responsive design.",
            "Do not include JavaScript or script tags.",
            "Do not use Markdown fences.",
            "",
            "Website description:",
            prompt.trim()
          ].join("\n"),
          max_new_tokens: 2048,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(300000)
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(
        "AniVora API returned status:",
        response.status
      );

      return res.status(502).json({
        success: false,
        error: "AniVora API could not generate the website."
      });
    }

    // Current AniVora API wraps the engine response
    // in data.result. The engine's text is in result.output.
    const result = data?.result;
    const generatedText =
      typeof result?.output === "string"
        ? result.output
        : typeof result?.output?.text === "string"
          ? result.output.text
          : typeof data?.output?.text === "string"
            ? data.output.text
            : "";

    if (!generatedText.trim()) {
      return res.status(502).json({
        success: false,
        error:
          "AniVora API returned no generated website text."
      });
    }

    let website;

    try {
      const cleaned = generatedText
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      website = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({
        success: false,
        error:
          "AniVora returned text that was not valid website JSON."
      });
    }

    if (
      !website ||
      typeof website !== "object" ||
      typeof website.html !== "string" ||
      !website.html.trim()
    ) {
      return res.status(502).json({
        success: false,
        error:
          "AniVora did not return a valid website."
      });
    }

    return res.status(200).json({
      success: true,
      website: {
        name:
          typeof website.name === "string"
            ? website.name
            : "AniVora Website",
        headline:
          typeof website.headline === "string"
            ? website.headline
            : "Welcome",
        description:
          typeof website.description === "string"
            ? website.description
            : "",
        button:
          typeof website.button === "string"
            ? website.button
            : "Get Started",
        color:
          typeof website.color === "string"
            ? website.color
            : "#6C63FF",
        html: website.html
      }
    });
  } catch (error) {
    console.error(
      "AniVora Builder generation error:",
      error?.name || "UnknownError"
    );

    return res.status(502).json({
      success: false,
      error:
        "Could not connect to AniVora API. Please try again."
    });
  }
        }
