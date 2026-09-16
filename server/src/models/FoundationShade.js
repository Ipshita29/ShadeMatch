const mongoose = require('mongoose');
const {
  DEPTH_VALUES,
  UNDERTONE_VALUES,
  HUE_VALUES,
  CALIBRATION_STATUS_VALUES,
  COLOR_SOURCE_VALUES,
  SOURCE_TYPE_VALUES,
} = require('../constants/foundationEnums');

const rgbChannel = {
  type: Number,
  required: true,
  min: 0,
  max: 255,
};

// Lab a*/b* don't have a hard theoretical bound, but real-world reflective
// colors (including skin and foundation) never approach the extremes of the
// color space — this is a sanity bound against bad data, not a claim of
// precision.
const labAB = { type: Number, required: true, min: -128, max: 128 };

const foundationShadeSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundationProduct', required: true },

    // Denormalized brand/product names, kept in sync at seed time. This is
    // a deliberate read-model shortcut so /search can match brand, product
    // and shade text in a single collection query instead of joining
    // across three collections for a simple MVP search feature.
    brandName: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },

    name: { type: String, required: true, trim: true }, // e.g. "NC40"
    code: { type: String, trim: true }, // populated when distinct from name

    depth: { type: String, required: true, enum: DEPTH_VALUES },
    undertone: { type: String, required: true, enum: UNDERTONE_VALUES },
    // The brand's own undertone terminology, if known — preserved
    // separately since it may not match our normalized category exactly
    // (e.g. a brand's "Golden" vs. our normalized "Warm").
    originalUndertone: { type: String, trim: true },
    hue: { type: String, required: true, enum: HUE_VALUES },

    color: {
      rgb: {
        r: rgbChannel,
        g: rgbChannel,
        b: rgbChannel,
      },
      lab: {
        l: { type: Number, required: true, min: 0, max: 100 },
        a: labAB,
        b: labAB,
      },
      lch: {
        l: { type: Number, min: 0, max: 100 },
        c: { type: Number, min: 0 },
        h: { type: Number, min: 0, max: 360 },
      },
    },

    // Where the shade's METADATA (that it exists, its name/code) came from.
    source: {
      type: { type: String, enum: SOURCE_TYPE_VALUES, default: 'estimated' },
      reference: { type: String, trim: true },
    },

    // Independent of source above: how trustworthy the COLOR VALUES are.
    // See constants/foundationEnums.js for why these two are kept separate.
    calibration: {
      status: { type: String, enum: CALIBRATION_STATUS_VALUES, default: 'estimated' },
      confidence: { type: Number, min: 0, max: 1 },
      colorSource: { type: String, enum: COLOR_SOURCE_VALUES, default: 'estimated' },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

foundationShadeSchema.index({ brand: 1 });
foundationShadeSchema.index({ product: 1 });
foundationShadeSchema.index({ name: 1 });
foundationShadeSchema.index({ code: 1 });
foundationShadeSchema.index({ undertone: 1 });
foundationShadeSchema.index({ depth: 1 });
foundationShadeSchema.index({ hue: 1 });
// Powers GET /api/foundations/search — a single text index across every
// field an artist might search by.
foundationShadeSchema.index({ brandName: 'text', productName: 'text', name: 'text', code: 'text' });

module.exports = mongoose.model('FoundationShade', foundationShadeSchema);
