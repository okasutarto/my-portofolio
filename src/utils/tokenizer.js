// filepath: my-portfolio/src/utils/tokenizer.js
export const tokenizeInput = (input) => {
  // Split the input into tokens based on whitespace and punctuation
  return input
    .toLowerCase()
    .replace(/[.,!?;]|\s+/g, ' ')
    .trim()
    .split(' ');
};

export const prepareInputForAPI = (tokens) => {
  // Join tokens back into a string for API consumption
  return tokens.join(' ');
};