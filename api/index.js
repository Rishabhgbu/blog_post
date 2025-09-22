// Vercel serverless function entry point for the Express app
// Exports the Express app so @vercel/node can handle it
const app = require('../middleware/app');

module.exports = app;
