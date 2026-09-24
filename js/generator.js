export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Website description is required."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured in Vercel."
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: [
          {
            role: "system",
            content: `
You are AniVora Builder, an AI website generator.

Create a unique modern website based entirely on the user's description.

Return ONLY a JSON object with these fields:

{
  "name": "website name",
  "headline": "main headline",
  "description": "short description",
  "button": "main button text",
  "color": "#hexcolor",
  "html": "complete HTML for the website"
}

Rules for the html field:
- Return a complete website body suitable for insertion into a preview.
- Use inline CSS inside the HTML.
- Make the design unique according to the user's request.
- Do not use JavaScript.
- Do not use <script> tags.
- Do not use external CSS files.
- Make it responsive for phones and desktops.
- Include appropriate sections based on the user's description.
- Do not force the usual Hero → Features → Pricing layout.
- A restaurant should look like a restaurant.
- A portfolio should look like a portfolio.
- A school should look like a school.
- An online store should look like an online store.
- A SaaS product should look like a SaaS product.
- Choose sections that make sense for the requested website.
`
          },
          {
            role: "user",
            content: prompt.trim()
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);

      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI API request failed."
      });
    }

    const output = data.output_text;

    if (!output) {
      return res.status(500).json({
        error: "OpenAI returned an empty response."
      });
    }

    let website;

    try {
      website = JSON.parse(output);
    } catch (parseError) {
      console.error("JSON parse error:", output);

      return res.status(500).json({
        error: "AniVora AI returned an invalid website format."
      });
    }

    return res.status(200).json({
      success: true,
      website
    });

  } catch (error) {
    console.error("AniVora backend error:", error);

    return res.status(500).json({
      error: "AniVora AI generation failed."
    });
  }
}
