const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.urlencoded({ extended: false }));

const RATE_CARD_URL = 'https://rates.idanbarnsuites.com';
const BOOK_URL = 'https://rates.idanbarnsuites.com/book';

app.post('/webhook', (req, res) => {
  const incomingMsg = (req.body.Body || '').trim().toLowerCase();
  const from = req.body.From;

  console.log(`Incoming message from ${from}: ${incomingMsg}`);

  const twiml = new twilio.twiml.MessagingResponse();

  // Channel 1: Guest initiates — send rate card + booking link
  const reply = twiml.message();
  reply.body(
`Hi! 👋 Welcome to *Idan Barn Suites & Café* — boutique lodge at the foot of Mt. Kenya.

🏡 *View our rooms & rates:*
${RATE_CARD_URL}

📅 *Book your stay:*
${BOOK_URL}

Questions about availability, meals, or special requests? Just reply here and we'll get back to you shortly!

_Idan Barn · Naromoru · +254 762 004 417_`
  );

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
