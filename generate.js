export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Use POST to generate a website.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Describe the website you want to build first.' });
  }
  if (prompt.length > 3000) {
    return res.status(400).json({ success: false, error: 'Keep your description under 3000 characters.' });
  }

  const apiUrl = (process.env.ANIVORA_API_URL || 'https://anivora-api-two.vercel.app').replace(/\/+$/, '');
  const apiKey = process.env.ANIVORA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'ANIVORA_API_KEY is missing from the AniVora Builder Vercel project.' });
  }

  const instructions = [
    'You are AniVora Builder, a website-generation AI.',
    'Generate a complete, attractive, responsive website as a single HTML document.',
    'Return only HTML. Do not use Markdown fences or explanatory text.',
    'Put all CSS inside a style element and JavaScript inside a script element.',
    'Use semantic HTML, polished visual design, responsive layouts and realistic content.',
    'Use vanilla HTML, CSS and JavaScript only. Do not require npm packages or external APIs.',
    'Buttons and navigation should work where practical. Never pretend a form, payment, or backend works when it does not.',
    'Keep the result compact enough to fit in a small local language model response. Prioritize a complete working page over excessive length.',
    '',
    'WEBSITE REQUEST:',
    prompt
  ].join('\n');

  let upstream;
  let raw = '';
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'Authorization': `Bearer ${apiKey}`
  };
  try {
    upstream = await fetch(`${apiUrl}/v1/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt: instructions, max_new_tokens: 256, temperature: 0.7 }),
      signal: AbortSignal.timeout(300000)
    });
    raw = await upstream.text();

    // Some deployments enforce a stricter generation-token limit than the schema documents.
    // Retry a 422 once with a smaller request; never retry authentication failures.
    if (upstream.status === 422) {
      console.error('AniVora API validation response for 256-token request:', String(raw).slice(0, 1200));
      upstream = await fetch(`${apiUrl}/v1/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: instructions, max_new_tokens: 128, temperature: 0.7 }),
        signal: AbortSignal.timeout(300000)
      });
      raw = await upstream.text();
    }
  } catch (error) {
    console.error('AniVora upstream connection error:', error?.name || 'UnknownError');
    return res.status(502).json({
      success: false,
      error: error?.name === 'TimeoutError'
        ? 'AniVora AI took too long to respond. Try a shorter website description.'
        : 'Could not connect to AniVora API. Check that the API deployment and Qwen connection are online.'
    });
  }

  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch (_) { /* The API may return plain text HTML. */ }

  if (!upstream.ok) {
    // Log the validation detail to Vercel logs; never log the authorization header or key.
    console.error('AniVora API HTTP status:', upstream.status, 'response:', String(raw).slice(0, 1200));
    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(502).json({ success: false, error: 'AniVora API rejected the Builder key. Check ANIVORA_API_KEY in the Builder Vercel project.' });
    }
    if (upstream.status === 422) {
      return res.status(502).json({ success: false, error: 'AniVora API rejected the generation request (422). Check the validation detail in the Builder Vercel function logs.' });
    }
    return res.status(502).json({ success: false, error: `AniVora API returned HTTP ${upstream.status}. Check the API deployment and try again.` });
  }

  // API versions may return either a JSON object or a plain JSON/string response.
  let html = '';
  if (typeof data === 'string') html = data;
  else if (typeof data?.output === 'string') html = data.output;
  else if (typeof data?.result === 'string') html = data.result;
  else if (typeof data?.text === 'string') html = data.text;
  else if (typeof data?.output?.text === 'string') html = data.output.text;
  else if (typeof data?.result?.output === 'string') html = data.result.output;
  else if (typeof data?.result?.output?.text === 'string') html = data.result.output.text;
  else if (!data && raw) html = raw;

  html = String(html || '').trim()
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  if (!html || !/<(?:!doctype\s+html|html|body|main|section)\b/i.test(html)) {
    console.error('AniVora API returned no recognizable HTML. Response preview:', String(raw).slice(0, 1000));
    return res.status(502).json({
      success: false,
      error: 'AniVora responded, but the model did not return a complete HTML website. Try a shorter and more specific prompt.'
    });
  }

  if (!/<html\b/i.test(html)) {
    html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AniVora Website</title></head><body>${html}</body></html>`;
  }

  return res.status(200).json({ success: true, website: { name: 'AniVora Website', html } });
}
