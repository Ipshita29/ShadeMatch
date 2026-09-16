const mongoose = require('mongoose');

const foundationProductSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    name: { type: String, required: true, trim: true },
    // Scoped to the brand (not globally unique) — two different brands can
    // both reasonably slugify a product to the same string.
    slug: { type: String, required: true, trim: true, lowercase: true },
    finish: { type: String, trim: true }, // e.g. "Matte", "Dewy" — free text, not enum-restricted
    coverage: { type: String, trim: true }, // e.g. "Light", "Medium", "Full"
    description: { type: String, trim: true },
    shadeCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

foundationProductSchema.index({ brand: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('FoundationProduct', foundationProductSchema);
