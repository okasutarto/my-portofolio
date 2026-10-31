const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';
// Earlier turns sent with each question; the API keeps at most this many as well
const HISTORY_LIMIT = 8;

/**
 * Turns displayed chat messages ({ sender: 'user' | 'bot', text }) into the API's history
 * @param {Array<{ sender: string, text: string }>} messages - Finished messages, oldest first
 * @returns {Array<{ role: string, content: string }>}
 */
export const toHistory = (messages) => messages
  .filter((m) => m.text && m.text.trim())
  .slice(-HISTORY_LIMIT)
  .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

/**
 * Get streaming response from the backend API
 * @param {string} prompt - User message
 * @param {function} onToken - Callback function that receives each token as it arrives
 * @param {Array<{ role: string, content: string }>} history - Earlier turns, oldest first
 * @returns {Promise<string>} - The complete response when done
 */
export const getStreamingResponse = async (prompt, onToken, history = []) => {
  const response = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt, history }),
  });
  if (!response.ok || !response.body) throw new Error(`Chat request failed (${response.status})`);

  // Read the server-sent events off the body: "data: ..." lines, events split by a blank line
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let fullResponse = '';
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) throw new Error('Chat stream ended before completion');
      buffer += value;
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop();
      for (const event of events) {
        const data = event.replace(/^data: ?/, '');
        if (data === '[DONE]') return fullResponse;

        const parsed = JSON.parse(data);
        if (typeof parsed.content === 'string' && parsed.content) {
          fullResponse += parsed.content;
          onToken(parsed.content);
        }
      }
    }
  } finally {
    // Release the connection on completion, parsing errors, and callback failures.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
};
