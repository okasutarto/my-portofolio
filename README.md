# Oka's Portfolio Website

This project is a modern, responsive portfolio website built with Vue.js that showcases Oka's skills, projects, and professional background. It features a clean design with interactive elements, dark mode support, and an AI-powered chatbot assistant.

## Features

- Responsive Design: Fully responsive layout that works on all device sizes
- Dark/Light Mode: Toggle between light and dark themes based on preference
- Interactive UI: Animations, transitions, and interactive elements enhance user experience
- Project Showcase: Detailed project cards with links to live demos and code repositories
- Animated Background: Dynamic, customizable background animations
- Vue Router Integration: Smooth navigation between different sections
- Contact Form: Easy-to-use contact form for potential employers or clients
- AI-Powered Chatbot: Virtual assistant to answer questions about skills and experience

## Technologies Used

- Vue.js 3: Modern JavaScript framework for building user interfaces
- Vue Router: For handling navigation and routing
- Tailwind CSS: Utility-first CSS framework for rapid UI development
- JavaScript/ES6+: Modern JavaScript features
- OpenAI API: Powers the portfolio chatbot assistant
- CSS Animations: Custom animations for enhanced user experience

## Project Structure

```
my-portfolio/
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── AboutSection.vue    # About section component
│   │   ├── AnimatedBackground.vue # Background animation component
│   │   ├── ChatBot.vue         # AI chatbot component
│   │   ├── ContactSection.vue  # Contact form component
│   │   ├── ProjectCard.vue     # Project display component
│   │   ├── TheNavbar.vue       # Navigation bar component
│   │   ├── TheHero.vue         # Hero section component
│   │   └── ThemeSwitcher.vue   # Dark/light mode toggle
│   ├── views/                  # Page components
│   │   ├── HomePage.vue        # Main landing page
│   │   ├── AboutPage.vue       # About page
│   │   ├── ContactPage.vue     # Contact page
│   │   ├── ProjectDetails.vue  # Project details page
│   │   └── NotFound.vue        # 404 page
│   ├── layouts/                # Layout components
│   │   └── MainLayout.vue      # Main layout wrapper
│   ├── composables/            # Reusable Vue composition functions
│   │   ├── useDarkMode.js      # Dark mode functionality
│   │   └── useIntersectionObserver.js # Scroll animation trigger
│   ├── services/               # External service integrations
│   │   └── openai.js           # OpenAI API integration
│   ├── utils/                  # Utility functions
│   │   └── tokenizer.js        # Text processing utilities
│   ├── router/                 # Vue Router configuration
│   │   └── index.js            # Routes definition
│   ├── assets/                 # Static assets
│   │   └── styles/             # Global styles
│   │       └── index.css       # Main CSS file with Tailwind
│   ├── App.vue                 # Root Vue component
│   └── main.js                 # Vue application entry point
├── public/                     # Public static assets
│   └── assets/                 # Other static assets
│       └── OkaSutartoCV.txt    # CV data for chatbot
├── .env                        # Environment variables
├── tailwind.config.js          # Tailwind CSS configuration
├── vue.config.js               # Vue CLI configuration
├── package.json                # Project dependencies and scripts
└── README.md                   # Project documentation
```

## Chatbot Assistant

The portfolio includes an AI-powered chatbot that can answer questions about Oka's skills, projects, and professional background:

- Conversational Interface: Natural language processing allows users to ask questions
- Custom Knowledge Base: Pre-loaded with information from Oka's CV
- Real-time Responses: Streaming API integration for smooth typing effect
- Mobile Responsive: Works seamlessly on all devices

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
- Example questions:
  - "What are your technical skills?"
  - "Tell me about your most recent project"
  - "What's your professional background?"

## Customization

To customize the chatbot for your own portfolio:

1. Update the knowledge base in `src/config/knowledge.js` with your personal information
2. Modify the chatbot appearance in the ChatBot.vue component
3. Adjust the OpenAI prompt template in the services file to match your persona

## Deployment

This application can be deployed to various platforms:

- **Netlify/Vercel:** Connect your repository for automatic deployment
- **GitHub Pages:** Run `npm run build` and deploy the dist folder
- **Custom Server:** Deploy the built files to your web server

## Troubleshooting

Common issues:

- **API Key Issues:** Ensure your OpenAI API key is correctly set in the .env file
- **CORS Errors:** When testing locally, you may need to use a CORS proxy
- **Rate Limiting:** Be aware of OpenAI API usage limits on your account

## Contributing

Feel free to submit issues or pull requests if you have suggestions or improvements for the project.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

Oka - okasputra@gmail.com

GitHub: https://github.com/okasutarto 
LinkedIn: https://linkedin.com/in/okasutarto