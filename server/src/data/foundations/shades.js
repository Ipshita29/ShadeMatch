// IMPORTANT — read before adding to this file:
//
// Shade NAMES and CODES below are real, publicly documented shades from
// each brand's actual foundation range (the kind of information printed on
// the product packaging or an official shade-finder page).
//
// The RGB VALUES are NOT lab measurements, official brand color data, or
// scraped from any brand asset — they are ShadeMatch's own visual
// approximations, originally created for the Part 2 UI mockups and reused
// here. Every shade below is seeded with calibration.status = "estimated"
// and calibration.colorSource = "estimated" for exactly this reason. Depth,
// undertone and hue are NOT hand-typed — the seed script computes them from
// these RGB values via the same thresholds Part 5 uses (see
// utils/colorClassification.js), so real physical/calibrated color data can
// replace these RGB values later without needing to also redo the category
// labels by hand.
//
// This file intentionally does not try to reach a large shade count per
// brand — see PRODUCT CONTEXT in the Part 6 spec: a smaller, honest dataset
// is preferred over a padded, fabricated one.

const SOURCE_REFERENCE =
  'Shade name/code reflects this brand’s publicly documented shade range. ' +
  'RGB value is a ShadeMatch visual estimate, not a brand-published or lab-measured color.';

function shade(brandSlug, productSlug, name, hex, code) {
  return {
    brandSlug,
    productSlug,
    name,
    code: code || name,
    hex,
    source: { type: 'official_shade_chart', reference: SOURCE_REFERENCE },
  };
}

module.exports = [
  // --- MAC Studio Fix Fluid (NC range) --------------------------------
  shade('mac', 'studio-fix-fluid', 'NC15', '#F1CBA4'),
  shade('mac', 'studio-fix-fluid', 'NC20', '#EABF95'),
  shade('mac', 'studio-fix-fluid', 'NC25', '#E3B285'),
  shade('mac', 'studio-fix-fluid', 'NC30', '#D9A375'),
  shade('mac', 'studio-fix-fluid', 'NC35', '#CB916A'),
  shade('mac', 'studio-fix-fluid', 'NC37', '#C6885F'),
  shade('mac', 'studio-fix-fluid', 'NC40', '#B87950'),
  shade('mac', 'studio-fix-fluid', 'NC42', '#AD6F49'),
  shade('mac', 'studio-fix-fluid', 'NC44', '#9E6140'),
  shade('mac', 'studio-fix-fluid', 'NC45', '#95583A'),
  shade('mac', 'studio-fix-fluid', 'NC50', '#5C331F'),

  // --- MAC Studio Fix Fluid (NW range — cooler/pinker family than NC) ---
  shade('mac', 'studio-fix-fluid', 'NW25', '#E8B7B0'),
  shade('mac', 'studio-fix-fluid', 'NW30', '#D9A79E'),
  shade('mac', 'studio-fix-fluid', 'NW40', '#BC8477'),
  shade('mac', 'studio-fix-fluid', 'NW45', '#8F5F55'),

  // --- Maybelline Fit Me Matte + Poreless -----------------------------
  shade('maybelline', 'fit-me-matte-poreless', '112 Natural Ivory', '#EFC9A3', '112'),
  shade('maybelline', 'fit-me-matte-poreless', '128 Warm Nude', '#E1AE83', '128'),
  shade('maybelline', 'fit-me-matte-poreless', '220 Natural Beige', '#D3A07A', '220'),
  shade('maybelline', 'fit-me-matte-poreless', '310 Sun Beige', '#C48D67', '310'),
  shade('maybelline', 'fit-me-matte-poreless', '330 Toffee', '#A9714B', '330'),
  shade('maybelline', 'fit-me-matte-poreless', '345 Coconut', '#8F5B3A', '345'),
  shade('maybelline', 'fit-me-matte-poreless', '356 Warm Coconut', '#5A3420', '356'),

  // --- NARS Light Reflecting -------------------------------------------
  shade('nars', 'light-reflecting', 'Gobi', '#EFCBA8'),
  shade('nars', 'light-reflecting', 'Mackinac', '#E1B695'),
  shade('nars', 'light-reflecting', 'Vallauris', '#CFA090'),
  shade('nars', 'light-reflecting', 'Syracuse', '#C38C68'),
  shade('nars', 'light-reflecting', 'Huahine', '#A86F4B'),
  shade('nars', 'light-reflecting', 'Fiji', '#3D2213'),

  // --- Fenty Beauty Pro Filt'r Soft Matte -------------------------------
  shade('fenty-beauty', 'pro-filtr-soft-matte', '130', '#F0CFAE'),
  shade('fenty-beauty', 'pro-filtr-soft-matte', '180', '#E3B78F'),
  shade('fenty-beauty', 'pro-filtr-soft-matte', '240', '#D2A57E'),
  shade('fenty-beauty', 'pro-filtr-soft-matte', '310', '#C0946D'),
  shade('fenty-beauty', 'pro-filtr-soft-matte', '370', '#A97D58'),
  shade('fenty-beauty', 'pro-filtr-soft-matte', '420', '#8A6041'),
  shade('fenty-beauty', 'pro-filtr-soft-matte', '480', '#4E2E1C'),

  // --- Estée Lauder Double Wear ------------------------------------------
  shade('estee-lauder', 'double-wear', '1N1 Ivory Nude', '#EFCFAC', '1N1'),
  shade('estee-lauder', 'double-wear', '2N1 Desert Beige', '#E0B78E', '2N1'),
  shade('estee-lauder', 'double-wear', '3N1 Ivory Beige', '#D1A67D', '3N1'),
  shade('estee-lauder', 'double-wear', '4N1 Shell Beige', '#C79987', '4N1'),
  shade('estee-lauder', 'double-wear', '5N1 Rich Ginger', '#A97650', '5N1'),
  shade('estee-lauder', 'double-wear', '6N1 Mocha', '#5C331E', '6N1'),
];
