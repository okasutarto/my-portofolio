const { openai, createSystemMessage } = require('../services/openaiService');

// Streaming completion handler
async function streamChat(req, res) {
  try {
    const { message } = req.query;
    
    // ===================
    // INPUT VALIDATION
    // ===================
    
    // Check if message exists
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Check message type
    if (typeof message !== 'string') {
      return res.status(400).json({ error: 'Message must be a string' });
    }
    
    // Trim and check for empty message
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    // Check message length (max 2000 characters)
    const MAX_MESSAGE_LENGTH = 2000;
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ 
        error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` 
      });
    }
    
    const systemMessage = await createSystemMessage();
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const stream = await openai.chat.completions.create({
      model: 'gpt-4.1-mini', // Assuming this is a valid custom model name or mapping
      messages: [
        systemMessage,
        { role: 'user', content: trimmedMessage }
      ],
      stream: true,
      max_tokens: 1000,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('OpenAI streaming error:', error);
    res.status(500).json({ error: 'Error processing your request' });
  }
}

// Voice session handler
async function createVoiceSession(req, res) {
  try {
    const systemMessage = await createSystemMessage();
    
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      return res.status(response.status).json({ error: errorData });
    }
    
    const data = await response.json();
    
    res.json({ 
      ephemeralKey: data.client_secret.value,
      instructions: systemMessage.content,
    });
  } catch (error) {
    console.error('Error creating voice session:', error);
    res.status(500).json({ error: 'Failed to create voice session', details: error.message });
  }
}

module.exports = { streamChat, createVoiceSession };
