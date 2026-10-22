
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Use POST to generate a website."
    });
  }

  const body = req.body && typeof req.body === "object"
    ? req.body
    : {};

  const prompt = typeof body.prompt === "string"
    ? body.prompt.trim()
    : "";

  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: "Describe the website you want to build first."
    });
  }

  if (prompt.length > 3000) {
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
      error: "ANIVORA_API_KEY is missing from the Builder Vercel project."
    });
  }

  const instructions = [
    "You are AniVora Builder, an AI website generator.",
    "Create a real, responsive, usable website, not a picture or mockup.",
    "Return one complete HTML document and no Markdown fences.",
    "Include doctype, html, head, body, title and viewport metadata.",
    "Put CSS in style elements and JavaScript in script elements.",
    "Use semantic HTML, accessible controls and responsive CSS.",
    "Use polished design, consistent spacing, typography and colors.",
    "Include useful navigation, a hero section, relevant content and footer.",
    "Make buttons, menus, tabs, filters and other controls work when included.",
    "Forms must validate input and explain their behavior.",
    "Never pretend that payment, authentication, database storage, email delivery or backend services work unless actually connected.",
    "Do not invent testimonials, business results or customer counts as real facts.",
    "",
    "ANIMATION REQUIREMENTS:",
    "Use real CSS animations and transitions, not screenshots of effects.",
    "Choose animations suitable for the requested website type.",
    "Available effects include fade, slide, zoom, reveal, lift, hover,",
    "bounce, rotate, blur, animated gradients, text reveal and floating motion.",
    "Use IntersectionObserver for reveal-on-scroll effects where appropriate.",
    "Use sensible durations, delays and easing; avoid excessive motion.",
    "Support prefers-reduced-motion and avoid blocking page interaction.",
    "Ensure animations do not hide essential content if JavaScript fails.",
    "",
    "FUNCTIONALITY AND QUALITY:",
    "Use vanilla HTML, CSS and JavaScript without build tools.",
    "Do not rely on unavailable API keys or fake backend integrations.",
    "Ensure navigation links point to real sections or destinations.",
    "Make the layout work on mobile, tablet and desktop.",
    "Keep the code compact because the configured local model has a limited output budget.",
    "Prioritize valid HTML, working interactions and the requested core content.",
    "",
    "USER WEBSITE REQUEST:",
    prompt
  ].join("\n");

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
    "Authorization": `Bearer ${apiKey}`
  };

  let upstream;
  let raw = "";

  try {
    upstream = await fetch(`${apiUrl}/v1/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: instructions,
        max_new_tokens: 256,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(300000)
    });

    raw = await upstream.text();

    if (upstream.status === 422) {
      console.error(
        "AniVora API validation response:",
        String(raw).slice(0, 1000)
      );

      upstream = await fetch(`${apiUrl}/v1/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: instructions,
          max_new_tokens: 128,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(300000)
      });

      raw = await upstream.text();
    }
  } catch (error) {
    console.error(
      "AniVora upstream connection error:",
      error?.name || "UnknownError"
    );

    return res.status(502).json({
      success: false,
      error: error?.name === "TimeoutError"
        ? "AniVora AI took too long to respond. Try a shorter website description."
        : "Could not connect to AniVora API. Check that the API and Qwen connection are online."
    });
  }

  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (_) {
    // The upstream service may return plain text.
  }

  if (!upstream.ok) {
    console.error(
      "AniVora API HTTP status:",
      upstream.status,
      "response:",
      String(raw).slice(0, 1000)
    );

    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(502).json({
        success: false,
        error: "AniVora API rejected the Builder key. Check ANIVORA_API_KEY in Vercel."
      });
    }

    if (upstream.status === 422) {
      return res.status(502).json({
        success: false,
        error: "AniVora API rejected the request (422). Check the API validation details in Vercel logs."
      });
    }

    return res.status(502).json({
      success: false,
      error: `AniVora API returned HTTP ${upstream.status}.`
    });
  }

  let html = "";

  if (typeof data === "string") html = data;
  else if (typeof data?.output === "string") html = data.output;
  else if (typeof data?.result === "string") html = data.result;
  else if (typeof data?.text === "string") html = data.text;
  else if (typeof data?.output?.text === "string") html = data.output.text;
  else if (typeof data?.result?.output?.text === "string") {
    html = data.result.output.text;
  } else if (!data && raw) {
    html = raw;
  }

  html = String(html || "")
    .trim()
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  if (!html || !/<(?:!doctype\s+html|html|body|main|section)\b/i.test(html)) {
    console.error(
      "AniVora returned no recognizable HTML:",
      String(raw).slice(0, 800)
    );

    return res.status(502).json({
      success: false,
      error: "AniVora responded, but did not return a recognizable HTML website. Try a shorter, more specific prompt."
    });
  }

  if (!/<html\b/i.test(html)) {
    html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AniVora Website</title>
</head>
<body>${html}</body>
</html>`;
  }

  return res.status(200).json({
    success: true,
    website: {
      name: "AniVora Website",
      html
    }
  });
}
