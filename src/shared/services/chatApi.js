const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';
// Earlier turns sent with each question; the API keeps at most this many as well
const HISTORY_LIMIT = 8;

/**
 * Turns displayed chat messages ({ sender: 'user' | 'bot', text, signature? }) into the API's
 * history. Answers keep the signature the API gave them; the API drops turns without one.
 * @param {Array<{ sender: string, text: string, signature?: string }>} messages - Finished messages, oldest first
 * @returns {Array<{ role: string, content: string, signature?: string }>}
 */
export const toHistory = (messages) => messages
  .filter((m) => m.text && m.text.trim())
  .slice(-HISTORY_LIMIT)
  .map((m) => (m.sender === 'user'
    ? { role: 'user', content: m.text }
    : { role: 'assistant', content: m.text, signature: m.signature }));

/**
 * What the bot says when a question fails, the same in both chats (the 2D bot and the desk
 * phone): for a rate limit, how long to wait or that it's resting for the day.
 * @param {Error & { status?: number, scope?: string, retryAfter?: number }} error - From getStreamingResponse
 * @returns {string}
 */
export const chatErrorReply = (error) => {
  if (error.status !== 429) return "Oops, my wires got tangled for a sec 😅 Mind trying that again?";
  if (error.scope === 'everyone') return "I've talked a lot today and my circuits need a rest 😴 Try me again tomorrow, or reach Oka directly through the contact page!";
  const minutes = Math.max(1, Math.ceil((error.retryAfter || 60) / 60));
  const wait = minutes >= 60 ? 'a few hours' : `${minutes} minute${minutes === 1 ? '' : 's'}`;
  return `Whoa, that's a lot of questions! Give me ${wait} to catch my breath 😅 Or reach Oka directly through the contact page.`;
};

/**
 * Get streaming response from the backend API
 * @param {string} prompt - User message
 * @param {function} onToken - Callback function that receives each token as it arrives
 * @param {Array<{ role: string, content: string, signature?: string }>} history - Earlier turns, oldest first
 * @returns {Promise<{ text: string, signature?: string }>} - The complete response when done,
 *   with the signature to send back in the history (absent when the API refused the question)
 */
export const getStreamingResponse = async (prompt, onToken, history = []) => {
  const response = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt, history }),
  });
  if (!response.ok || !response.body) {
    const error = new Error(`Chat request failed (${response.status})`);
    error.status = response.status;
    // A rate limit says how long to wait, and whether it's this visitor or everyone
    if (response.status === 429) {
      const body = await response.json().catch(() => ({}));
      error.retryAfter = body.retryAfter;
      error.scope = body.scope;
    }
    throw error;
  }

  // Read the server-sent events off the body: "data: ..." lines, events split by a blank line
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let fullResponse = '';
  let signature;
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
        if (data === '[DONE]') return { text: fullResponse, signature };

        const parsed = JSON.parse(data);
        if (typeof parsed.signature === 'string') signature = parsed.signature;
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
