import { useNavigate } from 'react-router-dom'
import StepIndicator from '../components/matching/StepIndicator'
import SkinProfilePanel from '../components/matching/SkinProfilePanel'
import { TopMatchCard, SecondaryMatchCard } from '../components/matching/MatchCard'
import { demoMatchScenario } from '../utils/mockData'
import styles from './MatchResults.module.css'

function MatchResults() {
  const navigate = useNavigate()
  const { skinProfile, brand, product, topMatch, otherMatches } = demoMatchScenario

  return (
    <div>
      <h1 className={styles.title}>Your closest matches</h1>
      <p className={styles.subtitle}>
        Based on the client&rsquo;s skin profile and the selected foundation.
      </p>

      <StepIndicator current={4} />

      <div className={styles.profileBar}>
        <SkinProfilePanel profile={skinProfile} compact />
        <div className={styles.productTag}>
          <span className={styles.productLabel}>Matched against</span>
          <span className={styles.productName}>
            {brand} {product}
          </span>
        </div>
      </div>

      <div className={styles.topWrap}>
        <TopMatchCard match={topMatch} onCompare={() => navigate('/clients/new/compare')} />
      </div>

      <h2 className={styles.secondaryHeading}>Other close matches</h2>
      <div className={styles.secondaryGrid}>
        {otherMatches.map((match) => (
          <SecondaryMatchCard key={match.shade} match={match} />
        ))}
      </div>
    </div>
  )
}

export default MatchResults
