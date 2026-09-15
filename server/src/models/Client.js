const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    photoUrl: { type: String, required: true },
    photoPublicId: { type: String, required: true },
    // Raw Part 4 skin-region analysis output, cached so it isn't re-run
    // unnecessarily. Shape is owned by the ML service, not fixed here —
    // Part 5 will introduce the actual structured skin profile schema.
    lastSkinAnalysis: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
