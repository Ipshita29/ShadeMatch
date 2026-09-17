import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import StepIndicator from '../components/matching/StepIndicator'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import { TopMatchCard, SecondaryMatchCard } from '../components/matching/MatchCard'
import { matchClient } from '../services/clientService'
import styles from './MatchResults.module.css'

function MatchResults() {
  const location = useLocation()
  const { clientId, skinProfile, productId } = location.state || {}

  const [status, setStatus] = useState(clientId && productId ? 'loading' : 'missing')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!clientId || !productId) return undefined
    let cancelled = false

    matchClient(clientId, productId)
      .then((data) => {
        if (cancelled) return
        setResult(data)
        setStatus('success')
      })
      .catch((matchError) => {
        if (cancelled) return
        setError(matchError.message)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [clientId, productId, retryKey])

  if (status === 'missing') {
    return (
      <div>
        <h1 className={styles.title}>Your closest matches</h1>
        <div className={styles.statusCard}>
          <p>Start a new match to see foundation shade results.</p>
          <Button to="/clients/new">Start New Match</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className={styles.title}>Your closest matches</h1>
      <p className={styles.subtitle}>
        Based on the client&rsquo;s estimated profile and the selected foundation.
      </p>

      <StepIndicator current={4} />

      {skinProfile?.profile && (
        <div className={styles.profileBar}>
          <div className={styles.profileTags}>
            <Badge tone="sage">{skinProfile.profile.undertone}</Badge>
            <Badge tone="outline">{skinProfile.profile.depth}</Badge>
            <Badge tone="rose">{skinProfile.profile.hue}</Badge>
          </div>
          <p className={styles.profileNote}>Estimated profile</p>
        </div>
      )}

      {status === 'loading' && (
        <div className={styles.statusCard}>
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.statusText}>Finding the closest matches&hellip;</p>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.statusCard}>
          <p className={styles.errorText}>{error}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setStatus('loading')
              setRetryKey((k) => k + 1)
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {status === 'success' && <ResultBody result={result} />}
    </div>
  )
}

function ResultBody({ result }) {
  const { status, message, profileConfidence, matches } = result

  return (
    <div>
      {profileConfidence === 'low' && (
        <p className={styles.profileWarning}>
          This client&rsquo;s estimated profile had lower measurement confidence — treat these
          matches as a starting point and verify carefully on the skin.
        </p>
      )}

      {status === 'blocked' && (
        <div className={styles.statusCard}>
          <p className={styles.resultHeadline}>Photo needs improvement</p>
          <p className={styles.errorText}>{message}</p>
          <Button to="/clients/new">Upload a clearer photo</Button>
        </div>
      )}

      {status === 'no_candidates' && (
        <div className={styles.statusCard}>
          <p className={styles.resultHeadline}>No shades to compare</p>
          <p className={styles.errorText}>{message}</p>
          <Button to="/clients/new/foundation">Choose a different foundation</Button>
        </div>
      )}

      {status === 'low_confidence' && (
        <div>
          <div className={styles.lowConfidenceNotice}>
            <p className={styles.resultHeadline}>No close match found</p>
            <p className={styles.lowConfidenceBody}>
              The available shades in this foundation range differ significantly from the
              estimated client profile.
            </p>
          </div>

          {matches.length > 0 && (
            <>
              <h2 className={styles.secondaryHeading}>Closest available shades</h2>
              <div className={styles.lowConfidenceGrid}>
                {matches.map((match, index) => (
                  <SecondaryMatchCard key={match.shadeId} match={match} rank={index + 1} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {status === 'ok' && matches.length > 0 && (
        <>
          <div className={styles.topWrap}>
            <TopMatchCard match={matches[0]} />
          </div>

          {matches.length > 1 && (
            <>
              <h2 className={styles.secondaryHeading}>Other close matches</h2>
              <div className={styles.secondaryGrid}>
                {matches.slice(1).map((match, index) => (
                  <SecondaryMatchCard key={match.shadeId} match={match} rank={index + 2} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <p className={styles.disclaimer}>
        ShadeMatch provides an assistive recommendation based on available color data, not a
        guaranteed or exact match. Always test foundation on the skin in suitable lighting
        before final application.
      </p>
    </div>
  )
}

export default MatchResults
