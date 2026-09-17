const mongoose = require('mongoose');

// A Match record is a snapshot of the recommendation the Part 7 engine
// generated at a point in time — it powers Match History, not a live
// re-computable cache. It deliberately does NOT store the client's photo,
// raw pixel samples, or the full skin-region data — only the compact
// scoring result needed to show "what we recommended and why" later.
const matchSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundationProduct', required: true },

    status: { type: String, enum: ['ok', 'low_confidence', 'blocked', 'no_candidates'], required: true },
    profileConfidence: { type: String, enum: ['normal', 'low'] },
    message: { type: String, trim: true },

    matches: [
      {
        _id: false,
        shade: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundationShade' },
        name: String,
        code: String,
        brandName: String,
        productName: String,
        score: Number,
        breakdown: {
          color: Number,
          depth: Number,
          undertone: Number,
          hue: Number,
          calibration: Number,
        },
        deltaE: Number,
        reasons: [String],
        calibration: {
          status: String,
          confidence: Number,
          colorSource: String,
        },
      },
    ],
  },
  { timestamps: true }
);

matchSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('Match', matchSchema);
