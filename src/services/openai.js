const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

/**
 * Get streaming response from the backend API
 * @param {string} prompt - User message
 * @param {function} onToken - Callback function that receives each token as it arrives
 * @returns {Promise<string>} - The complete response when done
 */
export const getStreamingResponse = async (prompt, onToken) => {
  try {
    // Use EventSource to handle server-sent events
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      const eventSource = new EventSource(`${API_URL}/api/chat/stream?message=${encodeURIComponent(prompt)}`);
      
      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          eventSource.close();
          resolve(fullResponse);
          return;
        }
        
        try {
          const data = JSON.parse(event.data);
          if (data.content) {
            fullResponse += data.content;
            onToken(data.content);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        eventSource.close();
        reject(error);
      };
    });
  } catch (error) {
    console.error('Streaming API error:', error);
    throw error;
  }
};