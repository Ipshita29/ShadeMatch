// Confidence is a heuristic reliability score (region agreement, distance
// from classification boundaries, image quality) — never a validated
// model probability, so it's shown as a qualitative band, never a raw
// percentage. See ml-service/app/services/skin_profile.py for how it's
// computed. Shared by SkinAnalysis and the Results/Comparison pages so the
// bands stay consistent everywhere confidence is shown.
export function confidenceBand(overall) {
  if (overall >= 0.75) return { label: 'High', tone: 'sage' }
  if (overall >= 0.5) return { label: 'Moderate', tone: 'outline' }
  return { label: 'Low', tone: 'rose' }
}
