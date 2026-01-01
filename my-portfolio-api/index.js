const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables first
dotenv.config();

const apiRoutes = require('./src/routes/api');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

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