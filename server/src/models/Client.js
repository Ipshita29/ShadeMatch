const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    photoUrl: { type: String, required: true },
    photoPublicId: { type: String, required: true },
    // Raw Part 4 skin-region analysis output, cached so it isn't re-run
    // unnecessarily. Shape is owned by the ML service.
    lastSkinAnalysis: { type: mongoose.Schema.Types.Mixed },
    // Part 5's structured skin profile (depth/undertone/hue/confidence),
    // built from the same Part 4 extraction. Also ML-service-owned — Part 7
    // will define how it's consumed, not how it's stored.
    lastSkinProfile: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
