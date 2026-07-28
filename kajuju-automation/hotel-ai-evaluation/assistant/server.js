'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const path = require('path');
const express = require('express');
const { askAssistant } = require('./client');

const app = express();
const PORT = process.env.PORT || 3300;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'webapp')));

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Request body must include a non-empty "message" string.' });
  }

  try {
    const { reply, toolCalls } = await askAssistant(message, Array.isArray(history) ? history : []);
    res.json({ reply, toolCalls });
  } catch (err) {
    console.error('Error handling /api/chat:', err);
    res.status(500).json({ error: err.message || 'Internal error calling the assistant.' });
  }
});

app.listen(PORT, () => {
  console.log(`Kajuju Lodge evaluation assistant running at http://localhost:${PORT}`);
});
