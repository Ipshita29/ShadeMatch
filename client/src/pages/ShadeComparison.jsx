import { Link } from 'react-router-dom'
import SkinProfilePanel from '../components/matching/SkinProfilePanel'
import ComparisonTable from '../components/matching/ComparisonTable'
import { demoMatchScenario } from '../utils/mockData'
import styles from './ShadeComparison.module.css'

function ShadeComparison() {
  const { skinProfile, comparison } = demoMatchScenario

  return (
    <div>
      <Link to="/clients/new/results" className={styles.back}>
        &larr; Back to matches
      </Link>

      <h1 className={styles.title}>Compare shades</h1>
      <p className={styles.subtitle}>
        Client skin profile against each candidate shade from the selected foundation.
      </p>

      <div className={styles.profileWrap}>
        <SkinProfilePanel profile={skinProfile} compact />
      </div>

      <ComparisonTable shades={comparison.shades} />

      <div className={styles.explanation}>
        <h2 className={styles.explanationTitle}>Why NC40?</h2>
        <p className={styles.explanationBody}>{comparison.explanation}</p>
      </div>
    </div>
  )
}

export default ShadeComparison
