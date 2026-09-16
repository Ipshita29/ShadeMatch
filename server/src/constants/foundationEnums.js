// Centralized controlled vocabularies for the foundation shade database.
// Nowhere else in the codebase should these values be typed out literally —
// import from here so a future addition (e.g. a new depth bucket) is a
// one-line change instead of a hunt-and-replace.
//
// DEPTH_VALUES / UNDERTONE_VALUES / HUE_VALUES intentionally match the
// categories Part 5's skin profile engine produces (see
// ml-service/app/core/config.py) — the whole point of normalizing shade
// data this way is so Part 7 can compare a client profile and a foundation
// shade using the exact same vocabulary on both sides.

const DEPTH_VALUES = ['Light', 'Light Medium', 'Medium', 'Medium Deep', 'Deep', 'Very Deep'];

const UNDERTONE_VALUES = ['Warm', 'Cool', 'Neutral', 'Olive', 'Uncertain'];

const HUE_VALUES = ['Rosy', 'Neutral', 'Golden', 'Olive', 'Uncertain'];

// How trustworthy a shade's stored color values are, independent of how
// confident we are in the metadata (brand/name/code).
const CALIBRATION_STATUS_VALUES = ['uncalibrated', 'estimated', 'calibrated'];

// Where the numeric color values themselves came from. A shade can have
// solid metadata (real brand, real product, real shade name) while its
// color is still just an "estimated" digital approximation — these two
// axes are deliberately independent (see calibration.status vs colorSource).
const COLOR_SOURCE_VALUES = [
  'digital_swatch',
  'official_reference',
  'calibrated_photo',
  'artist_sample',
  'estimated',
];

// Where the shade's *metadata* (that it exists, its name/code) was sourced
// from — separate from colorSource above, which is about the color values.
const SOURCE_TYPE_VALUES = [
  'official_product_page',
  'official_shade_chart',
  'brand_website',
  'estimated',
];

module.exports = {
  DEPTH_VALUES,
  UNDERTONE_VALUES,
  HUE_VALUES,
  CALIBRATION_STATUS_VALUES,
  COLOR_SOURCE_VALUES,
  SOURCE_TYPE_VALUES,
};
