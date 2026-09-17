import ShadeSwatch from '../common/ShadeSwatch'
import Badge from '../common/Badge'
import { confidenceBand } from '../../utils/confidence'
import styles from './SkinProfileCard.module.css'

function swatchColor(rgb) {
  return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : null
}

// This page is only ever reached once Part 5 has flagged the profile
// `quality.usable === true` (the matching flow blocks otherwise), so the
// only image-quality state a user ever sees here is the usable one — shown
// as "Good" rather than inventing finer-grained tiers the backend doesn't
// currently measure.
const IMAGE_QUALITY_LABEL = 'Good'

function SkinProfileCard({ skinProfile, compact = false }) {
  if (!skinProfile?.profile) return null

  const { depth, undertone, hue } = skinProfile.profile
  const confidence = confidenceBand(skinProfile.confidence?.overall ?? 0)

  return (
    <div className={styles.card}>
      {!compact && <p className={styles.eyebrow}>Your Skin Profile</p>}

      <div className={styles.body}>
        <ShadeSwatch
          hex={swatchColor(skinProfile.representativeColor?.rgb)}
          size={compact ? 'lg' : 'xl'}
          label="Client's representative skin color"
        />

        <div className={styles.grid}>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>Depth</p>
            <p className={styles.fieldValue}>{depth}</p>
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>Undertone</p>
            <Badge tone="sage">{undertone}</Badge>
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>Hue</p>
            <Badge tone="rose">{hue}</Badge>
          </div>
        </div>
      </div>

      <div className={styles.meta}>
        <div className={styles.metaField}>
          <p className={styles.fieldLabel}>Analysis confidence</p>
          <Badge tone={confidence.tone}>{confidence.label}</Badge>
        </div>
        <div className={styles.metaField}>
          <p className={styles.fieldLabel}>Image quality</p>
          <p className={styles.fieldValue}>{IMAGE_QUALITY_LABEL}</p>
        </div>
      </div>

      {!compact && (
        <p className={styles.note}>
          This reflects how the skin was read from the photo — it is separate from how well any
          individual shade matches below.
        </p>
      )}
    </div>
  )
}

export default SkinProfileCard
