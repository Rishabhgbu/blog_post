const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const isVercel = !!process.env.VERCEL;
const API_PREFIX = process.env.API_PREFIX !== undefined ? process.env.API_PREFIX : (isVercel ? '' : '/api');

// Set mongoose options
mongoose.set('strictQuery', false);
// Disable buffering so operations fail fast if DB is down instead of hanging
mongoose.set('bufferCommands', false);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Starting server without MongoDB connection...');
    // Don't exit, allow server to start for development/serverless cold starts
  }
};

// Only connect once in serverless environment
if (mongoose.connection.readyState === 0) {
  connectDB();
}

// Log connection state changes (no-op if not connected)
mongoose.connection.on('connected', () => console.log('Mongoose event: connected'));
mongoose.connection.on('disconnected', () => console.log('Mongoose event: disconnected'));
mongoose.connection.on('error', (err) => console.error('Mongoose event: error', err.message));

// Middleware
app.use(express.json());
app.use(cors());

// When running on Vercel behind a rewrite from /api/* to a single serverless function,
// normalize the incoming path to remove the "/api" base so Express routes match.
const baseStrip = isVercel ? '/api' : '';
if (baseStrip) {
  app.use((req, _res, next) => {
    if (req.url.startsWith(baseStrip)) {
      req.url = req.url.slice(baseStrip.length) || '/';
    }
    next();
  });
}

// Optionally short-circuit when DB is not connected
if (process.env.REQUIRE_DB === 'true') {
  app.use((req, res, next) => {
    const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
    if (state !== 1) {
      return res.status(503).json({
        msg: 'Service Unavailable: Database not connected',
        dbState: state,
      });
    }
    next();
  });
}

// Define Routes
app.use(`${API_PREFIX}/auth`, require('../routes/auth'));
app.use(`${API_PREFIX}/posts`, require('../routes/posts'));
app.use(`${API_PREFIX}/comments`, require('../routes/comments'));
app.use(`${API_PREFIX}/uploads`, require('../routes/uploads'));

// Static file serving for uploaded media (best-effort on serverless; ephemeral FS)
const uploadsDir = path.join(__dirname, '..', 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Ensured uploads directory at', uploadsDir);
  }
} catch (e) {
  console.error('Failed to ensure uploads directory:', e.message);
}
app.use('/uploads', express.static(uploadsDir));

module.exports = app;
