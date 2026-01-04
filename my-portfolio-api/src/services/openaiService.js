const OpenAI = require("openai");
const { loadCV } = require("../utils/fileLoader");
const { generateSystemPrompt } = require("../config/prompts");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function createSystemMessage() {
  const cv = await loadCV();

  if (!cv) {
    console.warn("CV content could not be loaded. Chatbot may lack context.");
    // Fallback prompt when CV is missing/error
    return {
      role: "system",
      content:
        "You are a helpful assistant for Oka's portfolio. Currently, detailed CV information is unavailable due to a system error. Please apologize and ask the user to contact Oka directly at okasputra@gmail.com for specific inquiries.",
    };
  }

  return {
    role: "system",
    content: generateSystemPrompt(cv),
  };
}

module.exports = { openai, createSystemMessage };
