const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import DB configurations
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');

// Initialize express
const app = express();

// Add middleware
app.use(express.json());
app.use(cors({
  // origin: ['http://localhost:3000', 'http://localhost'],
  origin: '*', // Allow all origins for development
  credentials: true
}));

// Debugging middleware for token inspection
app.use((req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader) {
    // debug: log the token
    // console.log('Auth header present:', authHeader.startsWith('Bearer '));
  }
  next();
});

// Connect to MongoDB
connectDB();

// Connect to Redis (but continue if it fails)
connectRedis()
  .then(client => {
    if (client) {
      console.log('Redis connection established successfully');
    } else {
      console.warn('Redis connection failed, continuing without caching');
    }
  })
  .catch(err => {
    console.warn('Redis connection error, continuing without caching:', err.message);
  });

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/playlist', require('./routes/playlist'));
app.use('/api/video', require('./routes/video'));
app.use('/api/badge', require('./routes/badge'));

// Set port
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
