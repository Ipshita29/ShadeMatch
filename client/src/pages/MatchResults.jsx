import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import StepIndicator from '../components/matching/StepIndicator'
import SectionHeading from '../components/common/SectionHeading'
import Button from '../components/common/Button'
import { LoadingState, EmptyState, ErrorState } from '../components/common/StatusPanel'
import SkinProfileCard from '../components/matching/SkinProfileCard'
import { BestMatchCard, MatchResultCard } from '../components/matching/MatchCard'
import ColorComparison from '../components/matching/ColorComparison'
import MatchComparison from '../components/matching/MatchComparison'
import { matchClient } from '../services/clientService'
import styles from './MatchResults.module.css'

// Known Part 7 validation/guard messages, mapped to friendlier copy and a
// relevant next step. Anything not listed here falls back to a generic,
// safe message — the raw backend string is never shown directly.
function errorPanelFor(message, { foundationState }) {
  const known = {
    'Run skin analysis for this client before matching.': {
      title: 'Skin profile not ready',
      body: "Your skin profile hasn't been analyzed yet.",
      actions: [{ label: 'Back to Skin Analysis', to: '/clients/new' }],
    },
    'Client not found.': {
      title: 'Client not found',
      body: "We couldn't find this client. They may have been removed.",
      actions: [{ label: 'Start New Match', to: '/clients/new' }],
    },
    'Invalid client id.': {
      title: 'Something went wrong',
      body: "We couldn't load this client. Please start a new match.",
      actions: [{ label: 'Start New Match', to: '/clients/new' }],
    },
    'Foundation product not found.': {
      title: 'Product unavailable',
      body: "This product doesn't have enough shade data to generate a match.",
      actions: [{ label: 'Choose another product', to: '/clients/new/foundation', state: foundationState }],
    },
    'A valid productId is required.': {
      title: 'No product selected',
      body: 'Please choose a foundation product to match against.',
      actions: [{ label: 'Choose a product', to: '/clients/new/foundation', state: foundationState }],
    },
  }

  return (
    known[message] || {
      title: "We couldn't complete the match",
      body: "We couldn't complete the match right now. Please try again.",
      actions: null,
    }
  )
}

function MatchResults() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clientId, previewUrl, skinProfile, productId } = location.state || {}
  const foundationState = { clientId, previewUrl, skinProfile }

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

  const retry = () => {
    setStatus('loading')
    setRetryKey((k) => k + 1)
  }

  const goToComparison = () => {
    navigate('/clients/new/compare', {
      state: { clientId, previewUrl, skinProfile, productId, matches: result?.matches },
    })
  }

  if (status === 'missing') {
    return (
      <div>
        <h1 className={styles.title}>Foundation Match</h1>
        <EmptyState
          title="Start a new match"
          body="Analyze a client's skin and choose a foundation to see matches here."
          actions={[{ label: 'Start New Match', to: '/clients/new' }]}
        />
      </div>
    )
  }

  return (
    <div>
      <h1 className={styles.title}>Foundation Match</h1>
      <p className={styles.subtitle}>Here&rsquo;s what we found for your skin profile.</p>

      <StepIndicator current={4} />

      {skinProfile?.profile && (
        <div className={styles.profileWrap}>
          <SkinProfileCard skinProfile={skinProfile} />
        </div>
      )}

      {status === 'loading' && <LoadingState />}

      {status === 'error' && <ErrorPanel message={error} foundationState={foundationState} onRetry={retry} />}

      {status === 'success' && (
        <ResultBody
          result={result}
          skinProfile={skinProfile}
          foundationState={foundationState}
          onCompare={goToComparison}
          navigate={navigate}
        />
      )}
    </div>
  )
}

function ErrorPanel({ message, foundationState, onRetry }) {
  const panel = errorPanelFor(message, { foundationState })
  const actions = panel.actions || [{ label: 'Try again', onClick: onRetry }]
  return <ErrorState title={panel.title} body={panel.body} actions={actions} />
}

function ResultBody({ result, skinProfile, foundationState, onCompare, navigate }) {
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
        <ErrorState
          title="Photo needs improvement"
          body={message}
          actions={[{ label: 'Upload a clearer photo', to: '/clients/new' }]}
        />
      )}

      {status === 'no_candidates' && (
        <EmptyState
          title="No shades to compare"
          body={message}
          actions={[{ label: 'Choose another product', to: '/clients/new/foundation', state: foundationState }]}
        />
      )}

      {status === 'low_confidence' && (
        <div>
          <div className={styles.lowConfidenceNotice}>
            <p className={styles.resultHeadline}>No strong match found</p>
            <p className={styles.lowConfidenceBody}>
              We couldn&rsquo;t find a close enough shade in this product range.
            </p>
          </div>

          {matches.length > 0 && (
            <>
              <SectionHeading title="Closest available shades" className={styles.sectionHeading} />
              <div className={styles.lowConfidenceGrid}>
                {matches.map((match, index) => (
                  <MatchResultCard key={match.shadeId} match={match} rank={index + 1} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {status === 'ok' && matches.length > 0 && (
        <>
          <SectionHeading
            eyebrow="Top Foundation Matches"
            title="Your closest matches"
            subtitle="Based on color, depth, undertone and hue."
            className={styles.sectionHeading}
          />

          <div className={styles.topWrap}>
            <BestMatchCard match={matches[0]} onCompare={onCompare} />
          </div>

          {matches.length > 1 && (
            <>
              <h2 className={styles.secondaryHeading}>Other close matches</h2>
              <div className={styles.secondaryGrid}>
                {matches.slice(1).map((match, index) => (
                  <MatchResultCard key={match.shadeId} match={match} rank={index + 2} />
                ))}
              </div>
            </>
          )}

          <SectionHeading
            title="Compare Top Matches"
            subtitle="A side-by-side comparison of the recommended shades."
            className={styles.sectionHeading}
          />
          <MatchComparison matches={matches} />
        </>
      )}

      {(status === 'ok' || status === 'low_confidence') && matches.length > 0 && (
        <>
          <SectionHeading title="Color Comparison" className={styles.sectionHeading} />
          <ColorComparison
            clientRgb={skinProfile?.representativeColor?.rgb}
            shadeRgb={matches[0].color?.rgb}
            deltaE={matches[0].deltaE}
            shadeName={matches[0].name}
          />
        </>
      )}

      <div className={styles.footer}>
        <Button
          variant="secondary"
          onClick={() => navigate('/clients/new/foundation', { state: foundationState })}
        >
          Try another foundation
        </Button>
        <Button onClick={() => navigate('/clients/new')}>Analyze another client</Button>
      </div>

      <p className={styles.disclaimer}>
        ShadeMatch provides an assistive recommendation based on available color data, not a
        guaranteed or exact match. Always test foundation on the skin in suitable lighting
        before final application.
      </p>
    </div>
  )
}

export default MatchResults
