import ShadeSwatch from '../common/ShadeSwatch'
import Button from '../common/Button'
import MatchScore from './MatchScore'
import MatchReasonList from './MatchReasonList'
import DataQualityBadge from './DataQualityBadge'
import styles from './MatchCard.module.css'

function swatchColor(rgb) {
  return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : null
}

export function BestMatchCard({ match, onCompare }) {
  return (
    <div className={styles.top}>
      <div className={styles.topLeft}>
        <ShadeSwatch hex={swatchColor(match.color?.rgb)} size="xl" label={`${match.name} swatch`} />
      </div>

      <div className={styles.topBody}>
        <p className={styles.topLabel}>Closest Match</p>

        <p className={styles.brandLine}>
          {match.brandName} &bull; {match.productName}
        </p>
        <h3 className={styles.topShade}>{match.name}</h3>

        <MatchScore score={match.score} deltaE={match.deltaE} size="lg" />

        <p className={styles.meta}>
          {match.undertone} &bull; {match.depth} &bull; {match.hue}
        </p>

        <MatchReasonList reasons={match.reasons} breakdown={match.breakdown} className={styles.checks} />

        <div className={styles.topFooter}>
          <DataQualityBadge status={match.calibration?.status} />
          {onCompare && (
            <Button variant="secondary" onClick={onCompare} className={styles.compareButton}>
              View comparison
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function MatchResultCard({ match, rank }) {
  return (
    <div className={styles.secondary}>
      <div className={styles.secondaryRow}>
        <ShadeSwatch hex={swatchColor(match.color?.rgb)} size="lg" label={`${match.name} swatch`} />
        <div className={styles.secondaryBody}>
          <p className={styles.secondaryRank}>
            #{rank} {match.name}
          </p>
          <p className={styles.secondaryBrand}>
            {match.brandName} &bull; {match.productName}
          </p>
          <p className={styles.secondaryMeta}>
            {match.undertone} &bull; {match.depth} &bull; {match.hue}
          </p>
        </div>
        <MatchScore score={match.score} deltaE={match.deltaE} size="sm" />
      </div>

      <MatchReasonList reasons={match.reasons} breakdown={match.breakdown} className={styles.secondaryChecks} />

      <DataQualityBadge status={match.calibration?.status} />
    </div>
  )
}
