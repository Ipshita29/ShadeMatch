import styles from './MatchReasonList.module.css'

// The backend (Part 7) already returns deterministic reasons for almost
// every match. This fallback only exists for the rare case where `reasons`
// is missing/empty but a breakdown is still present — it derives minimal,
// literal statements strictly from those existing 0-100 component scores,
// using the same thresholds the ml-service itself uses to decide whether a
// component "counts" as close (see scoring.py::_generate_reasons). It never
// invents anything the numbers don't already support.
function deriveReasonsFromBreakdown(breakdown) {
  const reasons = []
  if (!breakdown) return reasons

  if (breakdown.color >= 90) reasons.push('Close color profile')

  if (breakdown.depth >= 99) reasons.push('Same depth category')
  else if (breakdown.depth >= 60) reasons.push('Similar depth')

  if (breakdown.undertone >= 99) reasons.push('Compatible undertone')
  else if (breakdown.undertone >= 55) reasons.push('Reasonably compatible undertone')

  if (breakdown.hue >= 99) reasons.push('Similar hue')
  else if (breakdown.hue >= 65) reasons.push('Reasonably similar hue')

  return reasons
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="var(--sage-muted)" strokeWidth="1.4" />
      <path
        d="M6 10.2l2.4 2.4L14 7.4"
        stroke="var(--sage-muted)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MatchReasonList({ reasons, breakdown, className = '' }) {
  const list = reasons?.length > 0 ? reasons : deriveReasonsFromBreakdown(breakdown)
  if (list.length === 0) return null

  return (
    <ul className={`${styles.list} ${className}`}>
      {list.map((reason) => (
        <li key={reason}>
          <CheckIcon />
          {reason}
        </li>
      ))}
    </ul>
  )
}

export default MatchReasonList
