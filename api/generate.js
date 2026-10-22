
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
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
        error: "Describe the website you want to build."
      });
    }

    if (prompt.trim().length > 3000) {
      return res.status(400).json({
        success: false,
        error: "Keep your description under 3000 characters."
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
        error: "The Builder API key is not configured in Vercel."
      });
    }

    const instructions = [
      "You are AniVora Builder, a website-generation AI.",
      "Generate a complete, attractive, responsive website.",
      "Return ONLY the website's complete HTML document.",
      "Do not return Markdown fences, explanations, or JSON.",
      "Include CSS inside a style element.",
      "Use semantic HTML, a polished layout, and mobile responsiveness.",
      "Include useful sections appropriate to the user's request.",
      "Use realistic example content instead of placeholder paragraphs.",
      "Make buttons and navigation useful where possible.",
      "Use vanilla HTML, CSS and JavaScript only.",
      "Do not require build tools, npm packages, or external APIs.",
      "Never claim that a form, payment, or backend works unless implemented.",
      "",
      "USER WEBSITE REQUEST:",
      prompt.trim()
    ].join("\n");

    const response = await fetch(
      `${apiUrl}/v1/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          prompt: instructions,
          max_new_tokens:256,
          temperature: 0.6
        }),
        signal: AbortSignal.timeout(300000)
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(
        "AniVora API HTTP status:",
        response.status
      );

      return res.status(502).json({
        success: false,
        error: response.status === 401
          ? "The Builder API key was rejected. Check ANIVORA_API_KEY."
          : "The AI service could not generate the website. Try again."
      });
    }

    // Accept the current API response and compatible wrappers.
    let html =
      typeof data?.output === "string"
        ? data.output
        : typeof data?.result?.output === "string"
          ? data.result.output
          : typeof data?.result?.output?.text === "string"
            ? data.result.output.text
            : typeof data?.output?.text === "string"
              ? data.output.text
              : "";

    html = html
      .trim()
      .replace(/^```(?:html)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    if (
      !html ||
      !/<(?:!doctype\s+html|html|body|main|section)\b/i.test(html)
    ) {
      console.error("AniVora returned no recognizable HTML.");

      return res.status(502).json({
        success: false,
        error: "The AI response was incomplete. Please try a clearer description."
      });
    }

    // Supply a basic document shell if the model omitted it.
    if (!/<html\b/i.test(html)) {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AniVora Website</title>
</head>
<body>
${html}
</body>
</html>`;
    }

    return res.status(200).json({
      success: true,
      website: {
        name: "AniVora Website",
        html
      }
    });
  } catch (error) {
    console.error(
      "AniVora Builder error:",
      error?.name || "UnknownError"
    );

    return res.status(502).json({
      success: false,
      error: error?.name === "TimeoutError"
        ? "Website generation took too long. Please try again."
        : "Could not connect to AniVora API. Please try again."
    });
  }
}
