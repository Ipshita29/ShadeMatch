// Deterministic sRGB -> CIE Lab -> LCh color conversions.
//
// The ML service (ml-service/app/utils/color_utils.py) already does RGB<->Lab
// conversion in Python for skin analysis, but that code runs in a separate
// service/runtime — Node can't import it directly. Rather than shelling out
// to Python for a well-known, standard color formula, this reimplements the
// same CIE Lab math natively in JS using the standard sRGB (D65 illuminant)
// reference formulas. Both implementations follow the same published color
// science, so results are consistent in spirit even though exact
// floating-point output won't be bit-identical to OpenCV's implementation.

const D65 = { x: 95.047, y: 100.0, z: 108.883 };

function srgbChannelToLinear(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToXyz({ r, g, b }) {
  const rl = srgbChannelToLinear(r);
  const gl = srgbChannelToLinear(g);
  const bl = srgbChannelToLinear(b);

  return {
    x: (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) * 100,
    y: (rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175) * 100,
    z: (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) * 100,
  };
}

function xyzChannelToF(t) {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

function xyzToLab({ x, y, z }) {
  const xr = x / D65.x;
  const yr = y / D65.y;
  const zr = z / D65.z;

  const fx = xyzChannelToF(xr);
  const fy = xyzChannelToF(yr);
  const fz = xyzChannelToF(zr);

  const l = yr > 0.008856 ? 116 * fy - 16 : 903.3 * yr;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { l, a, b };
}

// { r, g, b } (0-255 each) -> { l, a, b } in standard CIE Lab ranges
// (L: 0-100, a/b: roughly -128 to 127).
function rgbToLab(rgb) {
  return xyzToLab(rgbToXyz(rgb));
}

// { l, a, b } -> { l, c, h } — polar form of Lab. h is in degrees, 0-360.
function labToLch({ l, a, b }) {
  const c = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return { l, c, h };
}

// Convenience: { r, g, b } -> { l, c, h } in one step.
function rgbToLch(rgb) {
  return labToLch(rgbToLab(rgb));
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.substring(0, 2), 16),
    g: parseInt(value.substring(2, 4), 16),
    b: parseInt(value.substring(4, 6), 16),
  };
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

module.exports = { rgbToXyz, xyzToLab, rgbToLab, labToLch, rgbToLch, hexToRgb, round };
