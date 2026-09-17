// Defensive validation for the AI vision extraction response (Part 9,
// section 5/6 of the spec). The model is instructed to only return null for
// anything it can't determine, and to never invent RGB/Lab/undertone/depth
// values — but instructions in a prompt are not a guarantee, so every field
// is re-checked here before it's allowed anywhere near the review UI or the
// database. Anything that doesn't match the expected shape is dropped to
// null rather than trusted, exactly like a value the model never returned.

function cleanString(value, maxLength = 200) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanEnum(value, allowed) {
  if (typeof value !== 'string') return null;
  return allowed.includes(value) ? value : null;
}

function cleanConfidence(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.min(1, Math.max(0, value));
}

function cleanRgbChannel(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const rounded = Math.round(value);
  return rounded >= 0 && rounded <= 255 ? rounded : null;
}

function cleanRgb(value) {
  if (!value || typeof value !== 'object') return null;
  const r = cleanRgbChannel(value.r);
  const g = cleanRgbChannel(value.g);
  const b = cleanRgbChannel(value.b);
  if (r === null || g === null || b === null) return null;
  return { r, g, b };
}

function cleanNotes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((note) => typeof note === 'string' && note.trim())
    .map((note) => note.trim().slice(0, 200))
    .slice(0, 10);
}

// Sanitizes one shade candidate from the raw AI JSON response. `rgb`/`lab`
// are intentionally NOT read from the AI response at all, even if present —
// per the Part 9 spec, color values only ever come from the CV pipeline
// (shade_chart/shade_color_extractor.py), never from the language model.
function sanitizeExtractedShade(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const name = cleanString(raw.name);
  if (!name) return null; // a candidate with no readable name isn't a usable shade

  return {
    name,
    code: cleanString(raw.code, 40),
    label: cleanString(raw.label, 200),
    // depth/undertone/hue are ALWAYS discarded here, regardless of what the
    // AI response contains — even a value that happens to be a real enum
    // member (e.g. "Warm") is still a category judgment the model was never
    // supposed to make (see aiExtractionService.js's prompt). The only
    // legitimate source for these fields is the deterministic CV-based
    // classifier in foundationImportService.buildDraftShade, applied to an
    // actually-measured swatch color. cleanEnum() is intentionally not used
    // for these three — that would only catch a malformed value, not an
    // AI-guessed-but-syntactically-valid one, which is the actual risk.
    depth: null,
    undertone: null,
    hue: null,
    extractionConfidence: cleanConfidence(raw.extractionConfidence),
    notes: cleanNotes(raw.notes),
  };
}

// Validates the AI response's top-level envelope. Returns
// { brand, product, shades } with every shade sanitized, or throws if the
// response isn't usable JSON in roughly the right shape at all (a
// malformed/empty response is a clean extraction failure, not silently
// zero shades).
function sanitizeExtractionResponse(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.shades)) {
    const error = new Error('AI extraction returned an unexpected response.');
    error.status = 502;
    throw error;
  }

  const shades = raw.shades.map(sanitizeExtractedShade).filter(Boolean);

  return {
    brand: cleanString(raw.brand, 100),
    product: cleanString(raw.product, 150),
    shades,
  };
}

module.exports = {
  cleanString,
  cleanEnum,
  cleanConfidence,
  cleanRgb,
  sanitizeExtractedShade,
  sanitizeExtractionResponse,
};
