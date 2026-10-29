export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Use GET to check API status." });
  }

  const apiUrl = (process.env.ANIVORA_API_URL || "https://anivora-api-two.vercel.app").replace(/\\/+$/, "");
  try {
    const response = await fetch(apiUrl + "/v1/status", {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000)
    });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = null; }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: "AniVora API returned HTTP " + response.status + "."
      });
    }
    if (!data || typeof data !== "object") {
      return res.status(502).json({ success: false, error: "AniVora API returned an invalid status response." });
    }
    return res.status(200).json(data);
  } catch (error) {
    return res.status(502).json({
      success: false,
      error: error?.name === "TimeoutError" ? "AniVora API status check timed out." : "Builder could not connect to AniVora API."
    });
  }
}
