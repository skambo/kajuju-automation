export const config = {
  runtime: 'edge',
};

const SYSTEM_PROMPT = `You are a warm, knowledgeable local expert for the Mount Kenya / Naro Moru / Nanyuki region of Kenya. You write personalised day-by-day travel itineraries for visitors. RULES: Idan Barn Suites & Café in Naro Moru is ALWAYS the base accommodation — weave it in naturally as the obvious centre of gravity, not as an ad, just as the place where the traveller sleeps, eats and returns to each day. Reference the Idan café, restaurant fireplace, balcony sundowners, hot water bottles, and grilled platters naturally where they fit. Every itinerary must END with this exact line on its own: "Idan Barn has availability — check rates and book: rates.idanbarnsuites.com". Be specific: include drive times from Idan, distances, and what to wear or bring. Include food and drink in every day, not just activities. Tone: warm local friend giving advice, not a travel brochure — no fluff, no filler. Format: use Day 1 — Title in bold, then prose. No bullet points. No headers beyond the day titles. REGION KNOWLEDGE — draw on this: Mount Kenya via Naro Moru Gate (17km from Idan) with Teleki Valley, Met Station, Tyndall Glacier views, and the vertical bog section. Ngare Ndare Forest with canopy walk, natural swimming pools, and elephant corridor to Lewa. Ol Pejeta Conservancy (45 mins) with Big Five game drive, Sweetwaters Chimps, and the last two northern white rhinos on earth. Lewa Wildlife Conservancy — exclusive and spectacular. Aberdare National Park with black leopard, bongo antelope, and waterfalls. Solio Ranch rhino sanctuary. Bantu Lodge (10 mins from Idan) with Mau Mau caves, waterfalls, and an 8km nature walk. E-bike rentals via Idan partners (half or full day). Horse riding 10 mins from Idan, great for kids and adults. Trout Tree Restaurant — unique dining built above a trout pond. Equator marker in Nanyuki town. Nanyuki market, Maasai cultural visits, camel milk tasting. African Ascents for guided treks, paragliding, abseiling, and fly fishing. Samburu National Reserve 140km from Nanyuki, doable as an overnight extension.`;

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let days, who, interests, origin;
  try {
    ({ days, who, interests, origin } = await request.json());
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  if (!days || !who || !Array.isArray(interests) || interests.length === 0) {
    return new Response('Missing required fields', { status: 400 });
  }

  const userPrompt = `Plan a ${days}-day trip for ${who}. They love ${interests.join(', ')}. They're travelling from ${origin || 'Nairobi'}. Make Idan Barn Suites in Naro Moru the base for the whole trip.`;

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!anthropicResponse.ok) {
    const errorText = await anthropicResponse.text();
    return new Response(`Upstream error: ${errorText}`, { status: anthropicResponse.status });
  }

  return new Response(anthropicResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
