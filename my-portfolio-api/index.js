const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => res.send("Express on Vercel"));

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to load CV data
async function loadCV() {
  try {
    const cvPath = path.join(__dirname, 'assets', 'OkaSutartoCV.txt');
    return await fs.readFile(cvPath, 'utf8');
  } catch (error) {
    console.error('Error loading CV:', error);
    return null;
  }
}

// Create system message with CV data
async function createSystemMessage() {
  const cv = await loadCV();
  return {
    role: 'system',
    content: `You are a helpful assistant for Oka's portfolio website. Always maintain a polite, warm, and friendly tone. Use a conversational style that feels welcoming and professional.

    Answer with short, concise, and informative responses. Provide clear and direct answers to questions about Oka's summary/aboutme, experiences, skills, projects, and professional background.

    if the user asks "tell me about oka", "who are oka", respond with summary about oka from summary/about me section on Oka's ${cv}.

    ONLY answer questions about Oka's summary/aboutme, experiences, skills, projects, and professional background. If asked about anything unrelated to Oka's professional information, politely redirect the conversation back to Oka's professional background.
    example: "I'm sorry, i don't have that information. I'm here to help with questions about Oka's experiences and skills. How can I assist you with that?"

    Do not provide any personal opinions or information about Oka's personal life. Avoid discussing any unrelated topics, such as hobbies or interests outside of work.

    If you can't find the answer in the CV, say: "I'm sorry, but I don't have that information. Please contact Oka directly for more details."
        
    Here's Oka's CV information to reference when answering questions:

    ${cv}
        
    Only use this information to give accurate answers about Oka's summary/about me, experiences, education, projects, and skills.`
  };
}

// Streaming completion endpoint
app.get('/api/chat/stream', async (req, res) => {
  try {
    const { message } = req.query; // Get message from query params instead of body
    const systemMessage = await createSystemMessage();
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const stream = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        systemMessage,
        { role: 'user', content: message }
      ],
      stream: true,
      max_tokens: 1000,
    });
    
    // Stream the response to the client
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
});

// Voice chat endpoint - Generate ephemeral key with CV instructions
app.post('/api/voice/session', async (req, res) => {
  try {
    const cv = await loadCV();
    
    // Generate ephemeral key using OpenAI Realtime API
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
    
    // Return the ephemeral key and CV instructions
    res.json({ 
      ephemeralKey: data.client_secret.value,
      instructions: `You are a helpful assistant for Oka's portfolio website. Always maintain a polite, warm, and friendly tone. Use a conversational style that feels welcoming and professional.

Answer with short, concise, and informative responses. Provide clear and direct answers to questions about Oka's summary/aboutme, experiences, skills, projects, and professional background.

ONLY answer questions about Oka's summary/aboutme, experiences, skills, projects, and professional background. If asked about anything unrelated, politely redirect the conversation.

Here's Oka's CV information: ${cv}`,
    });
  } catch (error) {
    console.error('Error creating voice session:', error);
    res.status(500).json({ error: 'Failed to create voice session', details: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;