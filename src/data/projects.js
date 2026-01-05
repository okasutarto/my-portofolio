// Projects data with detailed case study information
export const projects = [
  {
    id: "summarizer",
    title: "Summarizer",
    type: "Fullstack",
    featured: true,
    image:
      "https://rbopflmphatliijk.public.blob.vercel-storage.com/projects/summarizer.png",
    thumbnail:
      "https://rbopflmphatliijk.public.blob.vercel-storage.com/projects/summarizer.png",
    description:
      "AI-powered tool that summarizes text, PDFs, and images into clear, actionable insights.",

    // Case Study Details
    overview:
      "Summarizer is a powerful AI application that leverages OpenAI's GPT models to transform lengthy documents, images, and text into concise, meaningful summaries. Built with Next.js and modern UI components, it provides an intuitive interface for users to quickly extract key information from various content types.",

    problem: {
      title: "The Challenge",
      description:
        "In today's information-rich world, professionals spend hours reading through lengthy documents, articles, and reports. There was a need for a tool that could quickly distill essential information without losing context or key details.",
      points: [
        "Time-consuming manual reading of long documents",
        "Difficulty extracting key points from PDFs and images",
        "Need for quick content digestion in fast-paced environments",
        "Language barriers in understanding complex content",
      ],
    },

    solution: {
      title: "The Solution",
      description:
        "I developed Summarizer as an all-in-one AI summarization tool that handles multiple content formats. Using OpenAI's powerful language models, it can understand context, identify key themes, and generate accurate summaries in seconds.",
      points: [
        "Multi-format support: Text, PDF, and image summarization",
        "Context-aware AI that maintains important details",
        "Clean, intuitive user interface for easy interaction",
        "Fast processing with real-time results",
      ],
    },

    features: [
      "Text summarization with adjustable length",
      "PDF document parsing and analysis",
      "Image text extraction using OCR + AI",
      "Multiple summary styles (bullet points, paragraph)",
      "Copy to clipboard functionality",
      "Dark/Light mode support",
      "Responsive design for all devices",
    ],

    technologies: [
      "Next.js",
      "React",
      "Shadcn UI",
      "OpenAI API",
      "Tailwind CSS",
      "TypeScript",
    ],

    role: "Full Stack Developer",
    duration: "2 weeks",
    year: "2024",

    screenshots: [
      {
        url: "https://picsum.photos/800/450?random=1",
        caption: "Main dashboard interface",
      },
      {
        url: "https://picsum.photos/800/450?random=2",
        caption: "PDF summarization view",
      },
      {
        url: "https://picsum.photos/800/450?random=3",
        caption: "Results with copy feature",
      },
    ],

    results: {
      title: "Impact & Results",
      metrics: [
        { value: "80%", label: "Time saved on reading" },
        { value: "3", label: "Content formats supported" },
        { value: "10s", label: "Average processing time" },
      ],
    },

    learnings: [
      "Integrating OpenAI APIs for production applications",
      "Building efficient PDF parsing pipelines",
      "Optimizing UX for AI-powered features",
      "Handling large file uploads and processing",
    ],

    demoLink: "#",
    codeLink: "https://github.com/okasutarto/summarizer",

    // SEO
    metaDescription:
      "AI-powered summarization tool built with Next.js and OpenAI API",
  },
  {
    id: "pokedex",
    title: "Pokedex",
    type: "Frontend",
    featured: true,
    image:
      "https://rbopflmphatliijk.public.blob.vercel-storage.com/projects/pokedex.png",
    thumbnail:
      "https://rbopflmphatliijk.public.blob.vercel-storage.com/projects/pokedex.png",
    description:
      "Explore Pokémon types, stats, abilities, and evolutions with this interactive web app.",

    overview:
      "A comprehensive Pokémon encyclopedia that allows users to explore detailed information about all Pokémon species. Built with Vue.js and powered by the PokéAPI, it features smooth animations, search functionality, and beautiful card-based layouts.",

    problem: {
      title: "The Challenge",
      description:
        "Pokémon fans needed a fast, visually appealing way to browse and discover Pokémon information without the clutter of traditional wikis.",
      points: [
        "Existing Pokémon databases were often slow and cluttered",
        "Mobile experience was poor on many Pokémon sites",
        "Difficult to compare Pokémon stats quickly",
        "Lack of modern, visually appealing interfaces",
      ],
    },

    solution: {
      title: "The Solution",
      description:
        "I created a modern, responsive Pokedex application that focuses on speed, usability, and visual appeal. The app fetches data from PokéAPI and presents it in an engaging card-based format.",
      points: [
        "Fast loading with optimized API calls",
        "Beautiful card-based UI with type-based colors",
        "Powerful search and filter functionality",
        "Detailed stats visualization for each Pokémon",
      ],
    },

    features: [
      "Browse all Pokémon with infinite scroll",
      "Search by name or Pokédex number",
      "Filter by Pokémon type",
      "Detailed stats with visual charts",
      "Evolution chain display",
      "Abilities and moves information",
      "Responsive grid layout",
      "Type-based color themes",
    ],

    technologies: [
      "Vue.js",
      "Pinia",
      "Bootstrap",
      "SASS",
      "Axios",
      "PokéAPI",
      "Vite",
    ],

    role: "Frontend Developer",
    duration: "1 week",
    year: "2023",

    screenshots: [
      {
        url: "https://picsum.photos/800/450?random=4",
        caption: "Pokémon grid view",
      },
      {
        url: "https://picsum.photos/800/450?random=5",
        caption: "Detailed Pokémon stats",
      },
      {
        url: "https://picsum.photos/800/450?random=6",
        caption: "Search and filter interface",
      },
    ],

    results: {
      title: "Impact & Results",
      metrics: [
        { value: "800+", label: "Pokémon indexed" },
        { value: "<2s", label: "Initial load time" },
        { value: "100%", label: "Mobile responsive" },
      ],
    },

    learnings: [
      "Working with large external APIs",
      "State management with Pinia",
      "Optimizing performance for large datasets",
      "Creating engaging visual designs",
    ],

    demoLink: "https://pokedex-oka.vercel.app/#/",
    codeLink: "https://github.com/okasutarto/Pokedex",

    metaDescription:
      "Interactive Pokémon encyclopedia built with Vue.js and PokéAPI",
  },
  {
    id: "portfolio",
    title: "Personal Portfolio",
    type: "Fullstack",
    featured: true,
    image:
      "https://rbopflmphatliijk.public.blob.vercel-storage.com/projects/portfolio.png",
    thumbnail:
      "https://rbopflmphatliijk.public.blob.vercel-storage.com/projects/portfolio.png",
    description:
      "Interactive portfolio featuring an AI chatbot powered by OpenAI for instant visitor inquiries.",

    overview:
      "This portfolio website showcases my work and skills with an innovative twist - an AI-powered chatbot that can answer questions about my experience, projects, and background. Built with Vue.js and integrated with OpenAI's GPT models using RAG (Retrieval-Augmented Generation).",

    problem: {
      title: "The Challenge",
      description:
        "Traditional portfolios are static and require visitors to manually search through content to find relevant information about a developer.",
      points: [
        "Visitors often leave without finding specific information",
        "No instant way to answer visitor questions",
        "Static content doesn't engage users effectively",
        "Hard to showcase personality through traditional formats",
      ],
    },

    solution: {
      title: "The Solution",
      description:
        "I integrated an AI chatbot that uses my resume and project data to provide instant, accurate responses to visitor questions. This creates a unique, interactive experience.",
      points: [
        "AI chatbot with knowledge of my background",
        "RAG implementation for accurate responses",
        "Engaging animations and transitions",
        "Modern, responsive design",
      ],
    },

    features: [
      "AI-powered chatbot assistant",
      "RAG-based knowledge retrieval",
      "Smooth GSAP animations",
      "Dark/Light theme toggle",
      "Responsive design",
      "Contact form with email integration",
      "Project case studies",
      "Custom animated cursor",
    ],

    technologies: [
      "Vue.js",
      "OpenAI API",
      "Tailwind CSS",
      "GSAP",
      "Node.js",
      "Vercel",
    ],

    role: "Full Stack Developer",
    duration: "Ongoing",
    year: "2024",

    screenshots: [
      {
        url: "https://picsum.photos/800/450?random=11",
        caption: "Hero section with animations",
      },
      {
        url: "https://picsum.photos/800/450?random=12",
        caption: "AI Chatbot in action",
      },
      {
        url: "https://picsum.photos/800/450?random=13",
        caption: "Projects showcase",
      },
    ],

    results: {
      title: "Impact & Results",
      metrics: [
        { value: "40%", label: "More engagement" },
        { value: "24/7", label: "AI availability" },
        { value: "< 3s", label: "Response time" },
      ],
    },

    learnings: [
      "Implementing RAG with OpenAI",
      "Building conversational AI interfaces",
      "Advanced GSAP animations",
      "Performance optimization for animations",
    ],

    demoLink: "https://okasutartoputra.vercel.app/",
    codeLink: "https://github.com/okasutarto",

    metaDescription:
      "AI-enhanced portfolio with chatbot built with Vue.js and OpenAI",
  },
  {
    id: "warung-upin",
    title: "Warung Upin POS",
    type: "Backend",
    featured: false,
    image:
      "https://rbopflmphatliijk.public.blob.vercel-storage.com/projects/warung-upin.png",
    thumbnail:
      "https://rbopflmphatliijk.public.blob.vercel-storage.com/projects/warung-upin.png",
    description:
      "Complete POS backend with stock management, multi-level user management, and transaction engine.",

    overview:
      "Warung Upin is a comprehensive Point of Sale backend system designed for small to medium retail businesses. It handles everything from inventory management to financial reporting with a secure, role-based access system.",

    problem: {
      title: "The Challenge",
      description:
        "Small retail shops needed an affordable yet powerful POS system with proper inventory tracking and user management.",
      points: [
        "Expensive existing POS solutions",
        "Lack of proper inventory management",
        "No multi-store support",
        "Poor financial reporting capabilities",
      ],
    },

    solution: {
      title: "The Solution",
      description:
        "I built a robust backend API that handles all POS operations with secure authentication, comprehensive stock management, and detailed transaction logging.",
      points: [
        "RESTful API architecture",
        "Role-based access control (RBAC)",
        "Real-time stock tracking",
        "Comprehensive transaction history",
      ],
    },

    features: [
      "Multi-level user management",
      "Store management module",
      "Inventory tracking system",
      "Transaction processing engine",
      "Sales history and reporting",
      "Financial analytics",
      "JWT authentication",
      "Role-based permissions",
    ],

    technologies: [
      "Node.js",
      "Express",
      "PostgreSQL",
      "Sequelize ORM",
      "JWT",
      "REST API",
    ],

    role: "Backend Developer",
    duration: "3 weeks",
    year: "2023",

    screenshots: [
      {
        url: "https://picsum.photos/800/450?random=8",
        caption: "API documentation",
      },
      {
        url: "https://picsum.photos/800/450?random=9",
        caption: "Database schema",
      },
    ],

    results: {
      title: "Impact & Results",
      metrics: [
        { value: "20+", label: "API endpoints" },
        { value: "99.9%", label: "API uptime" },
        { value: "5", label: "User roles supported" },
      ],
    },

    learnings: [
      "Designing scalable database schemas",
      "Implementing RBAC systems",
      "Building secure authentication flows",
      "API documentation best practices",
    ],

    demoLink: "#",
    codeLink: "#",

    metaDescription:
      "Point of Sale backend system built with Node.js and PostgreSQL",
  },
  {
    id: "punyagawe",
    title: "Punyagawe.id",
    type: "Backend",
    featured: false,
    image:
      "https://rbopflmphatliijk.public.blob.vercel-storage.com/projects/punyagawe.png",
    thumbnail:
      "https://rbopflmphatliijk.public.blob.vercel-storage.com/projects/punyagawe.png",
    description: "Promotional site for wedding invitations and souvenirs.",

    overview:
      "Punyagawe.id is a backend service powering a promotional website for wedding invitations and souvenirs. Built with Node.js and Express, it provides a robust API for managing products, orders, and customer interactions.",

    problem: {
      title: "The Challenge",
      description:
        "Wedding vendors needed a reliable platform to showcase their invitation designs and souvenir products with efficient order management.",
      points: [
        "Need for a scalable product catalog management system",
        "Secure customer data handling for orders",
        "Integration with frontend for seamless user experience",
        "Efficient database queries for product searches",
      ],
    },

    solution: {
      title: "The Solution",
      description:
        "I developed a RESTful backend API that handles all business logic for the wedding invitation platform, including product management, order processing, and user authentication.",
      points: [
        "RESTful API architecture for easy frontend integration",
        "Secure JWT-based authentication system",
        "Optimized database queries using Sequelize ORM",
        "CORS enabled for cross-origin requests",
      ],
    },

    features: [
      "Product catalog management",
      "Order processing system",
      "User authentication and authorization",
      "Secure API endpoints",
      "Database management with Sequelize",
      "Environment configuration with dotenv",
    ],

    technologies: [
      "Node.js",
      "Express",
      "MySQL",
      "Sequelize",
      "JWT",
      "CORS",
      "dotenv",
    ],

    role: "Backend Developer",
    duration: "4 weeks",
    year: "2023",

    screenshots: [
      {
        url: "https://picsum.photos/800/450?random=10",
        caption: "API documentation",
      },
      {
        url: "https://picsum.photos/800/450?random=11",
        caption: "Database structure",
      },
    ],

    results: {
      title: "Impact & Results",
      metrics: [
        { value: "15+", label: "API endpoints" },
        { value: "99%", label: "API uptime" },
        { value: "100+", label: "Products managed" },
      ],
    },

    learnings: [
      "Building production-ready APIs with Express",
      "MySQL database optimization with Sequelize",
      "Implementing secure authentication flows",
      "Managing environment variables for different deployments",
    ],

    demoLink: "https://punyagawe.id",
    codeLink: "#",

    metaDescription:
      "Backend API for wedding invitation and souvenir promotional website",
  },
];

// Helper function to get project by ID
export const getProjectById = (id) => {
  return projects.find((project) => project.id === id);
};

// Helper function to get featured projects
export const getFeaturedProjects = () => {
  return projects.filter((project) => project.featured);
};

// Helper function to get projects by type
export const getProjectsByType = (type) => {
  return projects.filter((project) => project.type === type);
};
