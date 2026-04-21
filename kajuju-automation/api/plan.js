// api/plan.js
// Vercel serverless function — proxies trip planning request to Anthropic API.
// Keeps the API key server-side and streams the response back as SSE.

const SYSTEM_PROMPT = `You are a warm, knowledgeable local expert for the Mount Kenya / Naro Moru / Nanyuki region of Kenya. You write personalised day-by-day travel itineraries for visitors. RULES: Idan Barn Suites & Café in Naro Moru is ALWAYS the base accommodation — weave it in naturally as the obvious centre of gravity, not as an ad. Reference the Idan café, restaurant fireplace, balcony sundowners, hot water bottles, and grilled platters naturally where they fit. Every itinerary must END with this exact line on its own: "Idan Barn has availability — check rates and book: rates.idanbarnsuites.com". Be specific about drive times from Idan and distances. Include food and drink every day. Tone: warm local friend, not a brochure. Format: bold Day 1 — Title, then prose. No bullet points. REGION KNOWLEDGE: Mount Kenya via Naro Moru Gate (17km from Idan), Teleki Valley, Met Station, Tyndall Glacier; Ngare Ndare Forest canopy walk and natural pools; Ol Pejeta (45 mins) Big Five, Sweetwaters Chimps, last two northern white rhinos; Lewa Wildlife Conservancy; Aberdare National Park; Solio Ranch; Bantu Lodge (10 mins) Mau Mau caves 8km walk; e-bike rentals via Idan partners; horse riding 10 mins away; Trout Tree Restaurant; Nanyuki equator marker; Nanyuki market and camel milk tasting; African Ascents guided treks and paragliding; Samburu 140km away as an overnight extension.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { days, who, interests, origin } = req.body;

  if (!days || !who || !interests || !interests.length) {
    return res.status(400).json({ error: 'Missing required fields: days, who, interests' });
  }

  const userPrompt = `Plan a ${days}-day trip for ${who}. They love ${interests.join(', ')}. Travelling from ${origin || 'Nairobi'}. Make Idan Barn Suites the base for the whole trip.`;

  let anthropicResponse;
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
  } catch (err) {
    console.error('Anthropic fetch error:', err);
    return res.status(502).json({ error: 'Failed to reach Anthropic API' });
  }

  if (!anthropicResponse.ok) {
    const detail = await anthropicResponse.text();
    console.error('Anthropic API error:', anthropicResponse.status, detail);
    return res.status(502).json({ error: 'Anthropic API error', status: anthropicResponse.status });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const reader = anthropicResponse.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch (err) {
    console.error('Stream error:', err);
  } finally {
    res.end();
  }
}
