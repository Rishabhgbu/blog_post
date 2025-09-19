const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Set mongoose options
mongoose.set('strictQuery', false);
// Disable buffering so operations fail fast if DB is down instead of hanging
mongoose.set('bufferCommands', false);

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        console.log('Starting server without MongoDB connection...');
        // Don't exit, allow server to start for development
    }
};

connectDB();

// Log connection state changes
mongoose.connection.on('connected', () => console.log('Mongoose event: connected'));
mongoose.connection.on('disconnected', () => console.log('Mongoose event: disconnected'));
mongoose.connection.on('error', (err) => console.error('Mongoose event: error', err.message));

// Middleware
app.use(express.json());
app.use(cors());

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
app.use('/api/auth', require('../routes/auth'));
app.use('/api/posts', require('../routes/posts'));
app.use('/api/comments', require('../routes/comments'));
app.use('/api/uploads', require('../routes/uploads'));

// Static file serving for uploaded media
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Created uploads directory at', uploadsDir);
    } catch (e) {
        console.error('Failed to create uploads directory:', e.message);
    }
}
app.use('/uploads', express.static(uploadsDir));

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));