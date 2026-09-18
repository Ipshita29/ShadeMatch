const rateLimit = require('express-rate-limit');

// Guards the one endpoint that spends real money per request (OpenAI
// vision extraction — see services/aiExtractionService.js). Deliberately
// scoped to just that route rather than the whole API: every other
// endpoint only costs a database/Cloudinary call, which is much cheaper
// to over-allow than to under-allow for a small demo.
const chartExtractionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many shade chart uploads. Please wait a few minutes and try again.' },
});

module.exports = { chartExtractionLimiter };
