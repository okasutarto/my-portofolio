const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables first
dotenv.config();

const apiRoutes = require('./src/routes/api');

// Initialize Express app
const app = express();

// ===================
// SECURITY MIDDLEWARE
// ===================

// 1. Helmet - Security headers (XSS protection, content-type sniffing prevention, etc.)
app.use(helmet());

// 2. CORS - Origin restriction (only allow specific domains)
const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://okasp.dev',
  'https://www.okasp.dev',
  'https://okasutartoputra.vercel.app/',
  'https://www.okasutartoputra.vercel.app/',
  // Add your production frontend URL here
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman in dev)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// 3. Rate Limiting - Prevent abuse (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use('/api', limiter); // Apply rate limiting to API routes only

// 4. Request Body Size Limit - Prevent large payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Root endpoint
app.get("/", (req, res) => res.send("Express on Vercel"));

// API Routes
app.use('/api', apiRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;