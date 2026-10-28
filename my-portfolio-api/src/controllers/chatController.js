const { openai, createSystemMessage } = require('../services/openaiService');
const {
  validateInput,
  validateInputWithAI,
  validateOutput,
  validateOutputContent,
  postProcessResponse,
  FALLBACK_RESPONSES
} = require('../utils/aiGuardrails');

const MAX_MESSAGE_LENGTH = 2000;

// SSE helpers
function openStream(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
}

function sendContent(res, content) {
  res.write(`data: ${JSON.stringify({ content })}\n\n`);
}

function endStream(res) {
  res.write('data: [DONE]\n\n');
  res.end();
}

// Runs both output guardrails on the accumulated response; returns the reason it failed, if any
function findOutputProblem(fullResponse, userMessage) {
  // Check for jailbreak indicators
  const outputValidation = validateOutput(fullResponse, userMessage);
  if (!outputValidation.isValid) return outputValidation.reason;

  // Check for unwanted content types (code, politics, etc.)
  const contentValidation = validateOutputContent(fullResponse);
  if (!contentValidation.isValid) return contentValidation.reason;

  return null;
}

// Streaming completion handler
async function streamChat(req, res) {
  // Aborts the OpenAI calls when the visitor leaves or the validator rejects
  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abortController.abort();
  });

  try {
    const { message } = req.query;

    // ===================
    // STEP 0: BASIC VALIDATION
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

    // Check message length
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
      });
    }

    // Helper function to send SSE fallback response
    const sendFallbackSSE = (fallbackMessage) => {
      openStream(res);
      sendContent(res, fallbackMessage);
      endStream(res);
    };

    // ===================
    // STEP 1: REGEX GUARDRAIL (Fast - catches obvious attacks)
    // ===================
    const regexValidation = validateInput(trimmedMessage);
    if (!regexValidation.isValid) {
      const fallbackMessage = FALLBACK_RESPONSES[regexValidation.reason] || FALLBACK_RESPONSES.error;
      return sendFallbackSSE(fallbackMessage);
    }

    // ===================
    // STEP 2 + 3: AI VALIDATOR AND MAIN RESPONSE, IN PARALLEL
    // ===================
    // The validator and the main completion start together so the visitor doesn't
    // wait for two OpenAI round trips back to back. Nothing from the main stream is
    // sent until the validator approves; if it rejects, the stream is aborted.
    const validationPromise = validateInputWithAI(openai, trimmedMessage);
    const systemMessage = await createSystemMessage();
    const streamPromise = openai.chat.completions.create(
      {
        // gpt-4.1-mini shuts down on 2027-01-14; this is OpenAI's recommended replacement.
        // It's a reasoning model, so reasoning is turned off to keep replies instant.
        model: 'gpt-6-luna',
        reasoning_effort: 'none',
        messages: [
          systemMessage,
          { role: 'user', content: trimmedMessage }
        ],
        stream: true,
        max_completion_tokens: 1000,
      },
      { signal: abortController.signal }
    );
    // Mark as handled so an early failure isn't an unhandled rejection while we
    // wait for the validator; the error still surfaces when it's awaited below
    streamPromise.catch(() => {});

    const aiValidation = await validationPromise;
    if (abortController.signal.aborted) return;
    if (!aiValidation.isValid) {
      abortController.abort();
      const fallbackMessage = FALLBACK_RESPONSES[aiValidation.reason] || FALLBACK_RESPONSES.off_topic;
      return sendFallbackSSE(fallbackMessage);
    }

    const stream = await streamPromise;
    openStream(res);

    // ===================
    // STEP 4: OUTPUT GUARDRAIL & POST-PROCESSING
    // ===================
    let fullResponse = '';
    let compromiseReason = null;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;

        // Check periodically (every 200 chars) if response seems compromised
        if (fullResponse.length % 200 < content.length) {
          compromiseReason = findOutputProblem(fullResponse, trimmedMessage);
          if (compromiseReason) break;
        }

        // Post-process and stream the content
        const processedContent = postProcessResponse(content);
        if (processedContent) {
          sendContent(res, processedContent);
        }
      }
    }

    // The tail after the last periodic check hasn't been validated yet
    if (!compromiseReason) {
      compromiseReason = findOutputProblem(fullResponse, trimmedMessage);
    }

    // If response was compromised, send fallback
    if (compromiseReason) {
      const fallbackMsg = FALLBACK_RESPONSES[compromiseReason] || FALLBACK_RESPONSES.response_compromised;
      sendContent(res, '\n\n' + fallbackMsg);
    }

    endStream(res);
  } catch (error) {
    // The visitor left; the abort error is expected and there's no one to answer
    if (abortController.signal.aborted) return;

    console.error('OpenAI streaming error:', error);

    // Once the stream has started, the status can't change; close it with a message instead
    if (res.headersSent) {
      sendContent(res, '\n\n' + FALLBACK_RESPONSES.error);
      return endStream(res);
    }
    res.status(500).json({ error: 'Error processing your request' });
  }
}

module.exports = { streamChat };
