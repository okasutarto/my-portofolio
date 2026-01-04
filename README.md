# Oka's Portfolio Website

This project is a modern, responsive portfolio website built with Vue.js that showcases Oka's skills, projects, and professional background. It features a clean design with interactive elements, dark mode support, GSAP animations, and an AI-powered chatbot assistant.

## Features

- **Responsive Design:** Fully responsive layout optimized for all device sizes
- **Dark/Light Mode:** Toggle between light and dark themes based on preference
- **Interactive UI:** GSAP-powered animations, transitions, and interactive elements
- **Enhanced Hero Section:** Floating gradient orbs, animated name, tech stack badges, and social links
- **Timeline Experience Section:** Standout vertical timeline with scroll-linked animations
- **Project Showcase:** Detailed project cards with case studies, links to live demos and repositories
- **Testimonials Carousel:** Mobile-optimized carousel with touch-friendly navigation
- **Vue Router Integration:** Smooth navigation between different sections
- **Contact Form:** EmailJS-powered contact form for potential employers or clients
- **AI-Powered Chatbot:** Virtual assistant with markdown rendering and mobile-optimized full-screen mode

## Technologies Used

- **Vue.js 3:** Modern JavaScript framework with Composition API
- **Vue Router:** For handling navigation and routing
- **Tailwind CSS:** Utility-first CSS framework for rapid UI development
- **GSAP (GreenSock):** Professional-grade animation library with ScrollTrigger
- **JavaScript/ES6+:** Modern JavaScript features
- **OpenAI API:** Powers the portfolio chatbot assistant
- **EmailJS:** Contact form email service integration
- **Vercel:** Serverless API deployment for the chatbot backend

## Project Structure

```
my-portfolio/
├── src/
│   ├── components/
│   │   ├── features/           # Standalone features
│   │   │   ├── ChatBot.vue         # AI chatbot with markdown support
│   │   │   └── ThemeSwitcher.vue   # Dark/light mode toggle
│   │   ├── layout/             # Layout components
│   │   │   ├── TheFooter.vue       # Footer component
│   │   │   └── TheNavbar.vue       # Navigation bar
│   │   ├── sections/           # Landing page sections
│   │   │   ├── AboutSection.vue    # About section with skills
│   │   │   ├── ContactSection.vue  # EmailJS contact form
│   │   │   ├── ExperienceSection.vue # Timeline work experience
│   │   │   ├── ProjectsSection.vue # Projects grid section
│   │   │   ├── TestimonialsSection.vue # Testimonials carousel
│   │   │   └── TheHero.vue         # Enhanced hero section
│   │   └── ui/                 # Reusable UI elements
│   │       └── CustomCursor.vue    # Custom cursor effect
│   ├── views/                  # Page components
│   │   ├── HomePage.vue        # Main landing page
│   │   ├── ProjectDetails.vue  # Project case study page
│   │   └── NotFound.vue        # 404 page
│   ├── layouts/                # Layout wrappers
│   │   └── MainLayout.vue      # Main layout wrapper
│   ├── composables/            # Reusable Vue composition functions
│   │   ├── useDarkMode.js      # Dark mode functionality
│   │   ├── useTheme.js         # Theme management
│   │   ├── useVoiceChat.js     # Voice chat logic
│   │   └── useIntersectionObserver.js # Scroll animation trigger
│   ├── services/               # External service integrations
│   │   └── openai.js           # OpenAI API client
│   ├── config/                 # Configuration files
│   ├── data/                   # Static data
│   │   └── projects.js         # Projects data with case studies
│   ├── router/                 # Vue Router configuration
│   ├── assets/                 # Static assets
│   ├── App.vue                 # Root Vue component
│   └── main.js                 # Vue application entry point
├── my-portfolio-api/           # Serverless API (Vercel)
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # Business logic (OpenAI)
│   │   └── utils/              # Helper functions
│   ├── index.js                # Server entry point
│   ├── package.json            # API dependencies
│   ├── vercel.json             # Vercel configuration
│   └── assets/
│       └── OkaSutartoCV.txt    # CV data for chatbot context
├── public/                     # Public static assets
├── tailwind.config.js          # Tailwind CSS configuration
├── vue.config.js               # Vue CLI configuration
├── package.json                # Project dependencies and scripts
└── README.md                   # Project documentation
```

## Key Sections

### Hero Section

- Floating gradient orbs and decorative shapes
- Animated gradient name with underline effect
- Tech stack badges (Vue.js, React, TypeScript, etc.)
- Social media links (GitHub, LinkedIn, Twitter)
- Waving hand emoji animation
- Enhanced CTA buttons with hover effects

### Experience Timeline

- Scroll-linked vertical timeline that grows as you scroll
- Glowing timeline nodes with company colors
- Year badges attached to timeline nodes
- Connector lines from nodes to cards
- Progressive reveal animation tied to scroll position
- Mobile-optimized layout with badges above cards

### Testimonials

- Carousel with auto-play functionality
- Touch-friendly navigation on mobile
- LinkedIn integration for recommendations
- Company badges and author information

### Chatbot Assistant

- Full-screen mode on mobile devices
- Markdown rendering (bold, italic, links, lists)
- Quick question buttons
- Typing indicators
- Clear chat functionality
- Safe area support for notched devices

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

3. **Set up environment variables:**
   Create a `.env` file in the root directory:

   ```
   VUE_APP_EMAILJS_SERVICE_ID=your_emailjs_service_id
   VUE_APP_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
   VUE_APP_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
   ```

4. **Set up the API (for chatbot):**

   ```bash
   cd my-portfolio-api
   npm install
   ```

   Create a `.env` file in the `my-portfolio-api` directory:

   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

5. **Run the application:**

   ```bash
   npm run serve
   ```

6. **Run the API locally (optional):**
   ```bash
   cd my-portfolio-api
   npm run dev
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
2. Modify the chatbot appearance in the `src/components/features/ChatBot.vue` component
3. Adjust the OpenAI prompt template in the services file to match your persona

## Deployment

This application can be deployed to various platforms:

- **Vercel (Recommended):**
  - Frontend: Connect your repository for automatic deployment
  - API: Deploy the `my-portfolio-api` folder as a serverless function
- **Netlify:** Connect your repository for automatic deployment
- **GitHub Pages:** Run `npm run build` and deploy the dist folder
- **Custom Server:** Deploy the built files to your web server

### Vercel Deployment

1. Import your repository to Vercel
2. Set up environment variables in Vercel dashboard
3. The API will be automatically deployed from `my-portfolio-api`

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
