// Generates an abstract, editorial placeholder "photo" (an SVG data URI) used
// where a real client photo would appear. Part 2 has no real image assets or
// upload pipeline, so this stands in for a natural-light portrait without
// resorting to generic stock-photo iconography.
const SAMPLE_PORTRAIT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800">
  <defs>
    <radialGradient id="bg" cx="65%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#4a2f37" />
      <stop offset="55%" stop-color="#2a1b20" />
      <stop offset="100%" stop-color="#171315" />
    </radialGradient>
    <linearGradient id="silhouette" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#c99c9f" />
      <stop offset="100%" stop-color="#9f6f7d" />
    </linearGradient>
  </defs>
  <rect width="640" height="800" fill="url(#bg)" />
  <ellipse cx="320" cy="330" rx="120" ry="150" fill="url(#silhouette)" opacity="0.85" />
  <path d="M150 800c10-140 90-230 170-230s160 90 170 230z" fill="url(#silhouette)" opacity="0.7" />
  <circle cx="480" cy="140" r="140" fill="#b98291" opacity="0.12" />
</svg>
`.trim();

export function getSamplePortrait() {
  return `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_PORTRAIT_SVG)}`;
}
