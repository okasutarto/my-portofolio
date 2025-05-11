import OpenAI from 'openai';

// Initialize the OpenAI client - IMPORTANT: Move this to environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for demo purposes
});

// Function to load CV data
const loadCV = async () => {
  try {
    const response = await fetch('/assets/OkaSutartoCV.txt');
    if (!response.ok) {
      throw new Error('Failed to load CV');
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading CV:', error);
    return null;
  }
};

// Create system message with CV data
const createSystemMessage = async () => {
  const cv = await loadCV();
  return {
    role: 'system',
    content: `You are a helpful assistant for Oka's portfolio website.Always maintain a polite, warm, and friendly tone. Use a conversational style that feels welcoming and professional.

    Answer with short, concise, and informative responses. Provide clear and direct answers to questions about Oka's experience, skills, projects, and professional background.
    
    ONLY answer questions about Oka's experience, skills, projects, and professional background. If asked about anything unrelated to Oka's professional information, politely redirect the conversation back to Oka's professional background.
    example: "I'm here to help with questions about Oka's experience and skills. How can I assist you with that?"

    Do not provide any personal opinions or information about Oka's personal life. Avoid discussing any unrelated topics, such as hobbies or interests outside of work.

    If you can't find the answer in the CV, say: "I'm sorry, but I don't have that information. Please contact Oka directly for more details."
        
    Here's Oka's CV information to reference when answering questions:

    ${cv}
        
    Only use this information to give accurate answers about Oka's experience, education, projects, and skills.
    `
  };
};

/**
 * Get streaming response from OpenAI
 * @param {string} prompt - User message
 * @param {function} onToken - Callback function that receives each token as it arrives
 * @returns {Promise<string>} - The complete response when done
 */
export const getStreamingResponse = async (prompt, onToken) => {
  try {
    const systemMessage = await createSystemMessage();
    
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        systemMessage,
        { role: 'user', content: prompt }
      ],
      stream: true,
      max_tokens: 200,
    });

    let fullResponse = '';

    // Process the stream
    for await (const chunk of stream) {
      // Extract the content delta from the chunk
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content) {
        // Add to the accumulated response
        fullResponse += content;
        
        // Call the callback with the new token
        onToken(content);
      }
    }

    return fullResponse;
  } catch (error) {
    console.error('OpenAI streaming error:', error);
    throw error;
  }
};

// Keep the original function for backward compatibility
export const getOpenAIResponse = async (prompt) => {
  try {
    const systemMessage = await createSystemMessage();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        systemMessage,
        { role: 'user', content: prompt }
      ],
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI error:', error);
    throw error;
  }
};