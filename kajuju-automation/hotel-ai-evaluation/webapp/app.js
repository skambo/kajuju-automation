(function () {
  'use strict';

  const chatEl = document.getElementById('chat');
  const formEl = document.getElementById('chat-form');
  const inputEl = document.getElementById('chat-input');
  const debugLogEl = document.getElementById('debug-log');

  // Full history sent with every request — this test harness has no server-side
  // session store, which keeps the demo server stateless and simple.
  const history = [];

  function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = text;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
    return div;
  }

  // Renders to the separate debug panel only — never into the #chat conversation
  // thread. This is internal QA visibility into tool calls, not guest-facing text.
  function addDebugEntry(toolCalls) {
    if (!toolCalls || toolCalls.length === 0) return;
    const div = document.createElement('div');
    div.className = 'debug-entry';
    div.textContent = toolCalls
      .map((tc) => `🔧 ${tc.name}(${JSON.stringify(tc.input)}) → ${JSON.stringify(tc.result)}`)
      .join('\n');
    debugLogEl.appendChild(div);
  }

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = inputEl.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    inputEl.value = '';
    inputEl.disabled = true;

    const thinkingEl = addMessage('...', 'bot');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });

      const data = await response.json();

      if (!response.ok) {
        thinkingEl.remove();
        addMessage(`Error: ${data.error || 'Something went wrong.'}`, 'error');
        return;
      }

      thinkingEl.textContent = data.reply;
      addDebugEntry(data.toolCalls);

      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: data.reply });
    } catch (err) {
      thinkingEl.remove();
      addMessage(`Network error: ${err.message}`, 'error');
    } finally {
      inputEl.disabled = false;
      inputEl.focus();
    }
  });
})();
