// Mirrors server/src/constants/foundationEnums.js — the frontend has no
// endpoint that serves these back (they're a fixed, small vocabulary), so
// they're kept here as the one client-side source of truth, matching how
// Foundations.jsx already hardcodes its own filter option lists.
export const DEPTH_VALUES = ['Light', 'Light Medium', 'Medium', 'Medium Deep', 'Deep', 'Very Deep'];

export const UNDERTONE_VALUES = ['Warm', 'Cool', 'Neutral', 'Olive', 'Uncertain'];

export const HUE_VALUES = ['Rosy', 'Neutral', 'Golden', 'Olive', 'Uncertain'];
