# 🤖 Ultimate AI Portfolio Chatbot (RAG Starter Kit)

> **Stop letting recruiters read PDFs. Let them interview your Digital Twin.**

A production-ready, full-stack AI chatbot boilerplate. It uses **Retrieval-Augmented Generation (RAG)** to answer questions based strictly on your personal data (Resume, Portfolio, CV), ensuring zero hallucinations.

Built with **Node.js, Express, OpenAI, and React/Next.js**.

---

## 🚀 Features

* **RAG Engine:** Smartly queries your custom data (PDF/Text) to answer questions.
* **Edge Streaming:** Real-time character-by-character typing effect (Server-Sent Events).
* **Context Awareness:** Remembers the conversation history for follow-up questions.
* **Guardrails:** Pre-configured to strictly refuse answering non-professional questions.
* **Headless Architecture:** Separate Backend API that works with React, Vue, Angular, or any frontend.
* **Ready-to-Deploy:** Includes Docker support and Vercel configuration.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express, OpenAI SDK
* **Frontend:** React (Custom Hook provided), Next.js 14+
* **AI Logic:** GPT-4o-mini (Cost-optimized) + Vector Context Injection

---

## 📦 Project Structure

```text
├── backend/
│   ├── src/
│   │   ├── controllers/   # Chat logic & OpenAI streaming
│   │   ├── utils/         # Resume parser & Context loader
│   │   └── routes/        # API Endpoints
│   ├── assets/
│   │   └── context.txt    # 📍 PUT YOUR RESUME CONTENT HERE
│   └── server.js          # Entry point
│
├── frontend-example/      # (Next.js App)
│   ├── hooks/
│   │   └── useChatBot.ts  # 💎 The Magic Hook
│   └── components/
│       └── ChatWidget.tsx # Ready-to-use UI Component
```

---

## ⚡ Quick Start Guide

### 1. Backend Setup (The Brain)

Navigate to the backend folder and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the backend/ root:

```env
PORT=3000
OPENAI_API_KEY=sk-your-openai-key-here
```

**Crucial Step:** Open `backend/assets/context.txt` and paste your Resume or Portfolio text. The bot will ONLY know what is in this file.

Start the server:

```bash
npm run dev
# Server running on http://localhost:3000
```

### 2. Frontend Setup (The UI)

Navigate to the frontend folder:

```bash
cd frontend-example
npm install
npm run dev
```

Open http://localhost:3001 to see your bot in action!

---

## 🧩 Integration Guide (For Existing Apps)

Already have a portfolio? You don't need the full frontend app. Just grab the Hook and Component.

### Step 1: Copy the Hook

Copy `frontend-example/hooks/useChatBot.ts` into your project.

### Step 2: Use it in your Component

```typescript
import { useChatBot } from './hooks/useChatBot';

export function MyPortfolio() {
  const { messages, sendMessage, isLoading } = useChatBot('http://localhost:3000/api/chat/stream');

  return (
    <div>
      {messages.map((msg, idx) => (
        <div key={idx} className={msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}>
          {msg.content}
        </div>
      ))}
      
      <button onClick={() => sendMessage("Tell me about your React skills")}>
        Ask about React
      </button>
    </div>
  );
}
```

---

## ⚙️ Customization

### Changing the "Personality"

Go to `backend/src/controllers/chatController.js`. You will find the `systemPrompt` variable.

```javascript
// Modify this to change how the bot speaks
const systemPrompt = `
  You are a witty, senior software engineer. 
  Answer briefly and use emojis. 
  Only talk about the data provided in the context.
`;
```

### Adjusting Strictness

If you want the bot to be more creative (and less factual), increase the `temperature` in the OpenAI config (Range: 0.0 to 1.0).

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  temperature: 0.7, // Higher = More creative, Lower = More factual
  // ...
});
```

---

## 🚢 Deployment

### Deploying Backend to Render/Vercel

1. Push the backend folder to a GitHub repo.
2. Connect to Render.com or Vercel.
3. Add your `OPENAI_API_KEY` in the dashboard Environment Variables.

**Important:** If using Vercel Serverless Functions, ensure you use the Edge runtime for streaming support.

---

## ❓ FAQ

**Q: Can I use PDF files instead of text?**  
A: Yes! This starter kit includes a text parser for simplicity, but you can easily swap `fs.readFile` with `pdf-parse` in `utils/contextLoader.js` if you prefer raw PDFs.

**Q: How much does it cost to run?**  
A: Using `gpt-4o-mini`, a typical portfolio conversation costs less than $0.01 per 10 visitors.

---

## 📜 License & Rights

### 1. Standard License (Personal)
* ✅ **Allowed:** Use this code to build **one** personal portfolio or resume bot for yourself.
* ✅ **Allowed:** Host the bot publicly on your personal domain.
* ❌ **Not Allowed:** Resell this code, share it publicly, or use it for client work.

---

### 2. 💎 Agency / Commercial License (Unlimited)
*Purchasing the Agency License grants you the following rights:*

* ✅ **Unlimited Client Projects:** You may use this boilerplate to build and deploy chatbots for an unlimited number of clients (e.g., local businesses, real estate agents, agencies).
* ✅ **White Label Rights:** You can remove all references to this starter kit and brand the final product as your own work.
* ✅ **Charge Your Own Fees:** You are free to charge your clients any setup fee or monthly maintenance fee you choose.
* ❌ **No Resale of Source Code:** You **cannot** resell, redistribute, or open-source the original code template itself (e.g., you cannot put this zip file on Gumroad or GitHub). You may only deliver the *compiled/finished* application to your clients.

**Disclaimer:** This software is provided "as is" without warranty of any kind. You are responsible for any OpenAI API costs incurred by your usage.