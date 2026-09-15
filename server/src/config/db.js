const mongoose = require('mongoose');

// Connects to MongoDB in the background. The API server starts and serves
// requests (like /api/health) whether or not this succeeds.
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn('MONGO_URI not set — skipping MongoDB connection.');
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
}

module.exports = connectDB;
