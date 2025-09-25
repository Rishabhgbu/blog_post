// Simple health endpoint for verifying API availability on Vercel
module.exports = (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
};
