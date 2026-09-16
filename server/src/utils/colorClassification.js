// Classifies a Lab color into the same depth/undertone/hue vocabulary Part
// 5's skin profile engine uses (ml-service/app/core/config.py +
// app/services/skin_profile.py). Used at foundation-shade seed time so a
// shade's category is DERIVED from its actual color, not hand-typed —
// guaranteeing shades are categorized under the exact same rules a client's
// skin profile is, which is what makes them comparable at all in Part 7.
//
// KEEP THESE THRESHOLDS IN SYNC with ml-service/app/core/config.py. They are
// duplicated here only because Node can't import Python — the numbers
// themselves are not meant to diverge. Like Part 5, these are INITIAL MVP
// CALIBRATION VALUES, not validated against a labeled dataset.

const DEPTH_THRESHOLDS = [
  [20.0, 'Very Deep'],
  [35.0, 'Deep'],
  [50.0, 'Medium Deep'],
  [62.0, 'Medium'],
  [75.0, 'Light Medium'],
  [101.0, 'Light'],
];

const UNDERTONE_WARM_RATIO = 1.15;
const UNDERTONE_COOL_RATIO = 0.85;

const HUE_OLIVE_MAX_A = 8.0;
const HUE_OLIVE_MIN_B = 12.0;

function classifyDepth({ l }) {
  for (const [maxL, label] of DEPTH_THRESHOLDS) {
    if (l < maxL) return label;
  }
  return DEPTH_THRESHOLDS[DEPTH_THRESHOLDS.length - 1][1];
}

function classifyUndertone({ a, b }) {
  if (Math.abs(a) < 1e-3) {
    return b > 0 ? 'Warm' : 'Cool';
  }
  const ratio = b / a;
  if (ratio >= UNDERTONE_WARM_RATIO) return 'Warm';
  if (ratio <= UNDERTONE_COOL_RATIO) return 'Cool';
  return 'Neutral';
}

function classifyHue(lab) {
  const { a, b } = lab;
  const isOlive = a <= HUE_OLIVE_MAX_A && b >= HUE_OLIVE_MIN_B;
  if (isOlive) return 'Olive';

  const undertone = classifyUndertone(lab);
  if (undertone === 'Cool') return 'Rosy';
  if (undertone === 'Warm') return 'Golden';
  return 'Neutral';
}

module.exports = { classifyDepth, classifyUndertone, classifyHue };
