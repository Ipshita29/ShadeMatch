const { DEPTH_VALUES, UNDERTONE_VALUES, HUE_VALUES } = require('../constants/foundationEnums');

// Builds a Mongoose filter object for GET /api/foundations/shades from
// query params. Kept in one place so every route that lists shades filters
// the same way, and so adding a new filterable field later is a one-line
// change here rather than a hunt through controllers.
function buildShadeFilter(query) {
  const filter = { isActive: true };

  if (query.brand) {
    filter.brandName = new RegExp(escapeRegex(query.brand), 'i');
  }
  if (query.product) {
    filter.productName = new RegExp(escapeRegex(query.product), 'i');
  }
  if (query.depth && DEPTH_VALUES.includes(query.depth)) {
    filter.depth = query.depth;
  }
  if (query.undertone && UNDERTONE_VALUES.includes(query.undertone)) {
    filter.undertone = query.undertone;
  }
  if (query.hue && HUE_VALUES.includes(query.hue)) {
    filter.hue = query.hue;
  }

  return filter;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { buildShadeFilter };
