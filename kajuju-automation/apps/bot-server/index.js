'use strict';

require('dotenv').config();

const express = require('express');
const twilio = require('twilio');
const OpenAI = require('openai');
const { matchFaq } = require('./faqs');

const app = express();
app.use(express.urlencoded({ extended: false }));

let openai;
function getOpenAI() {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

const SYSTEM_PROMPT = `You are a friendly and professional assistant for Idan Barn Suites & Café, a boutique lodge at the base of Mt. Kenya in Naromoru, Kenya.
Answer guest questions helpfully and warmly. Keep responses concise — this is WhatsApp.
If you don't know the answer, say "Let me check with the team and get back to you shortly!"
Do not make up prices, policies, or availability.
When a guest asks about availability for specific dates, acknowledge the dates they mentioned, let them know you'll check and get back to them shortly, and ask how many guests will be staying. Always include the booking link: https://rates.idanbarnsuites.com/book`;

const WELCOME_MESSAGE = `Hi! 👋 Welcome to *Idan Barn Suites & Café* — boutique lodge at the foot of Mt. Kenya.

🏡 *View our rooms & rates:*
https://rates.idanbarnsuites.com

📅 *Book your stay:*
https://rates.idanbarnsuites.com/book

Questions about availability, meals, or special requests? Just reply here and we'll get back to you shortly!

_Idan Barn · Naromoru · +254 762 004 417_`;

app.post('/webhook', async (req, res) => {
  const incomingMsg = (req.body.Body || '').trim();
  const from = req.body.From;

  console.log(`Incoming message from ${from}: ${incomingMsg}`);

  const twiml = new twilio.twiml.MessagingResponse();
  const reply = twiml.message();

  // First message or greeting — send welcome
  const isGreeting = /^(hi|hello|hey|hujambo|habari|sasa|good morning|good afternoon|good evening|howdy|greetings)[\s!?.]*$/i.test(incomingMsg);

  if (!incomingMsg || isGreeting) {
    reply.body(WELCOME_MESSAGE);
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  // Check scripted FAQ responses first
  const faqResponse = matchFaq(incomingMsg);
  if (faqResponse) {
    reply.body(faqResponse);
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  // Fall back to OpenAI for anything unmatched
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: incomingMsg },
      ],
      max_tokens: 300,
    });

    const aiReply = completion.choices[0]?.message?.content?.trim()
      || "Let me check with the team and get back to you shortly!";

    reply.body(aiReply);
  } catch (err) {
    console.error('OpenAI error:', err.message);
    reply.body("Let me check with the team and get back to you shortly!");
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'idan-barn-bot' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
