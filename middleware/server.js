const app = require('./app');

const PORT = process.env.PORT || 5000;

// Start local dev server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));