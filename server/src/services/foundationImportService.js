// Part 9 — turns the two independent extraction results (AI shade
// labels/codes, CV swatch colors) into one reviewable draft list, and later
// turns an artist-reviewed draft into documents that fit the existing
// FoundationShade schema exactly (no second shade database — see spec
// section 12). Both halves are pure functions: no I/O, no MongoDB, easy to
// unit test without mocking anything.
const { classifyDepth, classifyUndertone, classifyHue } = require('../utils/colorClassification');
const { rgbToLab, labToLch, round } = require('../utils/colorUtils');
const { cleanString, cleanEnum, cleanRgb, cleanConfidence } = require('../utils/shadeChartValidation');
const { DEPTH_VALUES, UNDERTONE_VALUES, HUE_VALUES } = require('../constants/foundationEnums');

function swatchToRgb(swatch) {
  const mean = swatch?.rgb?.mean;
  if (!Array.isArray(mean) || mean.length !== 3) return null;
  return { r: Math.round(mean[0]), g: Math.round(mean[1]), b: Math.round(mean[2]) };
}

function swatchToLab(swatch) {
  const mean = swatch?.lab?.mean;
  if (!Array.isArray(mean) || mean.length !== 3) return null;
  return { l: round(mean[0], 2), a: round(mean[1], 2), b: round(mean[2], 2) };
}

// Builds one review-draft entry from an (optional) AI-extracted label and
// an (optional) CV-sampled swatch color, aligned positionally (see
// chart_parser.py / aiExtractionService.js — neither extraction step knows
// about the other, so index order is the only thing linking them).
function buildDraftShade(aiShade, swatch, index) {
  const rgb = swatchToRgb(swatch);
  const lab = swatchToLab(swatch);

  // A deterministic suggestion derived from the ACTUAL measured chart
  // color, using the same thresholds Part 6 seeding uses — not an AI
  // guess (the AI is never asked for these; see aiExtractionService.js).
  // Still just a pre-fill: the artist reviews and can change every field.
  const suggested = lab
    ? {
        depth: classifyDepth({ l: lab.l }),
        undertone: classifyUndertone({ a: lab.a, b: lab.b }),
        hue: classifyHue({ a: lab.a, b: lab.b }),
      }
    : { depth: null, undertone: null, hue: null };

  return {
    draftId: `draft-${index}`,
    name: aiShade?.name || null,
    code: aiShade?.code || null,
    label: aiShade?.label || null,
    depth: suggested.depth,
    undertone: suggested.undertone,
    hue: suggested.hue,
    rgb,
    lab,
    extractionConfidence: aiShade?.extractionConfidence ?? null,
    colorPixelCount: swatch?.pixelCount ?? null,
    notes: aiShade?.notes || [],
    metadataStatus: aiShade ? 'ai_extracted' : 'not_detected',
    colorStatus: swatch ? 'estimated_from_chart' : 'not_detected',
    categorySource: lab ? 'estimated_from_chart_color' : null,
    // Only pre-checked when there's at least a name to import — a
    // color-only or name-only candidate still needs the artist's eyes.
    include: Boolean(aiShade?.name),
  };
}

// aiShades / swatches are both already in reading order (top-to-bottom,
// left-to-right) from their respective extraction steps. Merges by
// position; when the counts differ, the extra entries on either side still
// appear in the draft (with the other half's fields left null) rather than
// being silently dropped.
function mergeExtractionResults(aiShades, swatches) {
  const count = Math.max(aiShades.length, swatches.length);
  const merged = [];
  for (let index = 0; index < count; index += 1) {
    merged.push(buildDraftShade(aiShades[index] || null, swatches[index] || null, index));
  }
  return merged;
}

// Converts one artist-reviewed draft shade into a document matching the
// FoundationShade schema exactly. Returns { doc } on success, or
// { error } with a human-readable reason when required fields are still
// missing — the caller (import-shades controller) surfaces that per-shade
// rather than failing the whole batch.
function toFoundationShadeDoc(reviewed, { brandId, productId, brandName, productName }) {
  const name = cleanString(reviewed?.name, 100);
  if (!name) return { error: 'Missing shade name.' };

  const rgb = cleanRgb(reviewed?.rgb);
  if (!rgb) return { error: 'Missing or invalid color (RGB) for this shade.' };

  const depth = cleanEnum(reviewed?.depth, DEPTH_VALUES);
  const undertone = cleanEnum(reviewed?.undertone, UNDERTONE_VALUES);
  const hue = cleanEnum(reviewed?.hue, HUE_VALUES);
  if (!depth || !undertone || !hue) {
    return { error: 'Depth, undertone and hue must all be set before this shade can be imported.' };
  }

  // Lab/LCh are always (re)computed from the confirmed RGB here — the one
  // reusable conversion (utils/colorUtils.js), never trusted from the
  // draft even if the CV step already supplied them, so a manually
  // corrected RGB can never end up paired with a stale Lab value.
  const lab = rgbToLab(rgb);
  const lch = labToLch(lab);

  const verified = reviewed?.verified === true;
  const extractionConfidence = cleanConfidence(reviewed?.extractionConfidence);
  // An artist who edited/confirmed a field is trusted more than a raw,
  // unreviewed AI/CV guess — but this is still a digital estimate, never
  // "calibrated" (see foundationEnums.js: calibration.status stays
  // 'estimated' unless real physical calibration exists).
  const confidence = verified ? Math.max(extractionConfidence ?? 0.5, 0.75) : (extractionConfidence ?? 0.5);

  return {
    doc: {
      brand: brandId,
      product: productId,
      brandName,
      productName,
      name,
      code: cleanString(reviewed?.code, 40) || undefined,
      depth,
      undertone,
      hue,
      color: {
        rgb,
        lab: { l: round(lab.l, 2), a: round(lab.a, 2), b: round(lab.b, 2) },
        lch: { l: round(lch.l, 2), c: round(lch.c, 2), h: round(lch.h, 2) },
      },
      source: {
        type: 'shade_chart',
        reference: 'Imported from an uploaded shade chart image (AI label + CV color extraction), reviewed by an artist.',
      },
      calibration: {
        status: 'estimated',
        confidence,
        colorSource: 'estimated_from_chart',
      },
      isActive: true,
    },
  };
}

// Identity used to detect duplicates within a product: normalized code
// when present (it's the more precise identifier brands use), otherwise
// normalized name.
function shadeIdentityKey({ code, name }) {
  const value = (code || name || '').trim().toLowerCase();
  return value;
}

module.exports = {
  mergeExtractionResults,
  buildDraftShade,
  toFoundationShadeDoc,
  shadeIdentityKey,
};
