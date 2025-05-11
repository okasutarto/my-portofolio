# My Portfolio Chatbot

This project is a Vue.js-based chatbot that serves as a portfolio assistant for Oka. It utilizes OpenAI's API to provide dynamic responses to user queries about Oka's skills, projects, and background.

## Project Structure

```
my-portfolio
├── src
│   ├── components
│   │   └── ChatBot.vue         # Vue component for the chatbot interface
│   ├── services
│   │   └── openai.js           # Integration with OpenAI's API
│   ├── utils
│   │   └── tokenizer.js         # Utility functions for processing user input
│   └── config
│       └── api.js              # Configuration settings for the API
├── .env                         # Environment variables (API key)
├── package.json                 # npm configuration file
└── README.md                    # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd my-portfolio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file:**
   Copy the `.env.example` to `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. **Run the application:**
   ```bash
   npm run serve
   ```

## Usage

- Open the chatbot interface by clicking the chat icon in the bottom right corner.
- Ask questions about Oka's skills, projects, or background.
- The chatbot will respond using predefined responses and dynamic answers from OpenAI's API.

## Contributing

Feel free to submit issues or pull requests if you have suggestions or improvements for the project. 

## License

This project is licensed under the MIT License.