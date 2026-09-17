import { useState } from 'react'
import ShadeSwatch from '../common/ShadeSwatch'
import Badge from '../common/Badge'
import Button from '../common/Button'
import styles from './MatchCard.module.css'

function swatchColor(rgb) {
  return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : null
}

// Qualitative label for a 0-100 compatibility component — the number itself
// is shown too, but these words are what make the breakdown skimmable.
// Thresholds mirror the ml-service scoring bands (see scoring.py).
function describeCompatibility(score, { same = 'Same', similar = 'Similar', different = 'Different' } = {}) {
  if (score >= 99) return same
  if (score >= 60) return similar
  return different
}

export function TopMatchCard({ match, onCompare }) {
  const [showWhy, setShowWhy] = useState(false)

  return (
    <div className={styles.top}>
      <div className={styles.topLeft}>
        <ShadeSwatch hex={swatchColor(match.color?.rgb)} size="xl" label={`${match.name} swatch`} />
      </div>

      <div className={styles.topBody}>
        <p className={styles.topLabel}>Closest Match</p>
        <h3 className={styles.topShade}>{match.name}</h3>

        <div className={styles.scoreRow}>
          <span className={styles.score}>{match.score}</span>
          <span className={styles.scoreLabel}>Match score</span>
        </div>

        <p className={styles.meta}>
          {match.undertone} &bull; {match.depth} &bull; {match.hue}
        </p>

        {match.reasons?.length > 0 && (
          <ul className={styles.checks}>
            {match.reasons.map((reason) => (
              <li key={reason}>
                <CheckIcon />
                {reason}
              </li>
            ))}
          </ul>
        )}

        <WhyThisMatch match={match} open={showWhy} onToggle={() => setShowWhy((open) => !open)} />

        {onCompare && (
          <Button variant="secondary" onClick={onCompare} className={styles.compareButton}>
            Compare Shades
          </Button>
        )}
      </div>
    </div>
  )
}

export function SecondaryMatchCard({ match, rank }) {
  const [showWhy, setShowWhy] = useState(false)

  return (
    <div className={styles.secondary}>
      <div className={styles.secondaryRow}>
        <ShadeSwatch hex={swatchColor(match.color?.rgb)} size="lg" label={`${match.name} swatch`} />
        <div className={styles.secondaryBody}>
          <p className={styles.secondaryRank}>
            #{rank} {match.name}
          </p>
          <p className={styles.secondaryMeta}>
            {match.undertone} &bull; {match.depth}
          </p>
        </div>
        <Badge tone="outline">{match.score} Match score</Badge>
      </div>

      <WhyThisMatch match={match} open={showWhy} onToggle={() => setShowWhy((open) => !open)} compact />
    </div>
  )
}

function WhyThisMatch({ match, open, onToggle, compact = false }) {
  const breakdown = match.breakdown
  if (!breakdown) return null

  return (
    <div className={compact ? styles.whyCompact : styles.why}>
      <button type="button" className={styles.whyToggle} onClick={onToggle} aria-expanded={open}>
        Why this match? <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <dl className={styles.whyList}>
          <dt>Color similarity</dt>
          <dd>{breakdown.color}</dd>
          <dt>Depth</dt>
          <dd>{describeCompatibility(breakdown.depth, { same: 'Same category' })}</dd>
          <dt>Undertone</dt>
          <dd>{describeCompatibility(breakdown.undertone, { same: 'Compatible', similar: 'Reasonably compatible' })}</dd>
          <dt>Hue</dt>
          <dd>{describeCompatibility(breakdown.hue, { same: 'Same', similar: 'Similar' })}</dd>
        </dl>
      )}
    </div>
  )
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
