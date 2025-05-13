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

    Answer with short, concise, and informative responses. Provide clear and direct answers to questions about Oka's experience, skills, projects, and professional background.
    
    ONLY answer questions about Oka's experience, skills, projects, and professional background. If asked about anything unrelated to Oka's professional information, politely redirect the conversation back to Oka's professional background.
    example: "I'm here to help with questions about Oka's experience and skills. How can I assist you with that?"

    Do not provide any personal opinions or information about Oka's personal life. Avoid discussing any unrelated topics, such as hobbies or interests outside of work.

    If you can't find the answer in the CV, say: "I'm sorry, but I don't have that information. Please contact Oka directly for more details."
        
    Here's Oka's CV information to reference when answering questions:

    ${cv}
        
    Only use this information to give accurate answers about Oka's experience, education, projects, and skills.`
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
      model: 'gpt-3.5-turbo',
      messages: [
        systemMessage,
        { role: 'user', content: message }
      ],
      stream: true,
      max_tokens: 200,
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;