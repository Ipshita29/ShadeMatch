// Escapes regex special characters in user-supplied text before it's used
// to build a RegExp for a MongoDB query. Without this, a query param like
// `?brand=(a+)+$` can build a pathological regex (ReDoS) or simply match
// unintended documents. Every place that turns request input into a
// case-insensitive RegExp filter should route through this.
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
