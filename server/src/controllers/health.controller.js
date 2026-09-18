const mongoose = require('mongoose');

// readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting.
// A deployment platform's health check should reflect whether the app can
// actually serve requests, not just that the Express process is alive —
// Express responding while Mongo is down is not "healthy".
function getHealth(req, res) {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    message: dbConnected ? 'ShadeMatch API is running' : 'ShadeMatch API is running but the database is unavailable',
    database: dbConnected ? 'connected' : 'disconnected',
  });
}

module.exports = { getHealth };
