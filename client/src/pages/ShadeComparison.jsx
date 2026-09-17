import { Link, useLocation } from 'react-router-dom'
import SkinProfileCard from '../components/matching/SkinProfileCard'
import MatchComparison from '../components/matching/MatchComparison'
import ColorComparison from '../components/matching/ColorComparison'
import { EmptyState } from '../components/common/StatusPanel'
import styles from './ShadeComparison.module.css'

function ShadeComparison() {
  const location = useLocation()
  const { clientId, previewUrl, skinProfile, productId, matches } = location.state || {}

  if (!clientId || !matches?.length) {
    return (
      <div>
        <h1 className={styles.title}>Compare shades</h1>
        <EmptyState
          title="Nothing to compare yet"
          body="Run a match first, then open the comparison from your results."
          actions={[{ label: 'Start New Match', to: '/clients/new' }]}
        />
      </div>
    )
  }

  const topMatch = matches[0]

  return (
    <div>
      <Link
        to="/clients/new/results"
        state={{ clientId, previewUrl, skinProfile, productId }}
        className={styles.back}
      >
        &larr; Back to matches
      </Link>

      <h1 className={styles.title}>Compare shades</h1>
      <p className={styles.subtitle}>
        Client skin profile against each candidate shade from the selected foundation.
      </p>

      {skinProfile?.profile && (
        <div className={styles.profileWrap}>
          <SkinProfileCard skinProfile={skinProfile} compact />
        </div>
      )}

      <MatchComparison matches={matches} />

      <div className={styles.colorWrap}>
        <ColorComparison
          clientRgb={skinProfile?.representativeColor?.rgb}
          shadeRgb={topMatch.color?.rgb}
          deltaE={topMatch.deltaE}
          shadeName={topMatch.name}
        />
      </div>

      {topMatch.reasons?.length > 0 && (
        <div className={styles.explanation}>
          <h2 className={styles.explanationTitle}>Why {topMatch.name}?</h2>
          <p className={styles.explanationBody}>
            {topMatch.name} ranked closest based on: {topMatch.reasons.join(', ').toLowerCase()}.
          </p>
        </div>
      )}
    </div>
  )
}

export default ShadeComparison
