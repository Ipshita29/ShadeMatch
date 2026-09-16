import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import StepIndicator from '../components/matching/StepIndicator'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import { analyzeSkin } from '../services/clientService'
import styles from './SkinAnalysis.module.css'

const ESTIMATION_POINTS = [
  'Multiple facial regions analyzed',
  'Color represented in CIE Lab',
  'Regional measurements compared',
  'Lighting/quality factors considered',
]

// Confidence is a heuristic reliability score (region agreement, distance
// from classification boundaries, image quality) — never a validated
// model probability, so it's shown as a qualitative band, never a raw
// percentage. See ml-service/app/services/skin_profile.py for how it's
// computed.
function confidenceBand(overall) {
  if (overall >= 0.75) return { label: 'High', tone: 'sage' }
  if (overall >= 0.5) return { label: 'Moderate', tone: 'outline' }
  return { label: 'Low', tone: 'rose' }
}

function SkinAnalysis() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clientId, previewUrl } = location.state || {}

  const [status, setStatus] = useState(clientId ? 'loading' : 'missing')
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!clientId) return undefined
    let cancelled = false

    analyzeSkin(clientId)
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setStatus('success')
      })
      .catch((analysisError) => {
        if (cancelled) return
        setError(analysisError.message)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [clientId])

  if (status === 'missing') {
    return (
      <div>
        <h1 className={styles.title}>Skin Analysis</h1>
        <div className={styles.missingCard}>
          <p>Start a new match to run skin analysis on a client photo.</p>
          <Button to="/clients/new">Start New Match</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className={styles.title}>Skin Analysis</h1>
      <StepIndicator current={2} />

      <div className={styles.layout}>
        <div className={styles.imageColumn}>
          <img
            src={previewUrl}
            alt="Client's uploaded photo used for skin analysis"
            className={styles.image}
          />
        </div>

        <div className={styles.profileColumn}>
          {status === 'loading' && <LoadingPanel />}
          {status === 'error' && <ErrorPanel message={error} />}
          {status === 'success' && !profile.quality?.usable && (
            <NeedsBetterPhotoPanel reason={profile.quality?.reason} />
          )}
          {status === 'success' && profile.quality?.usable && (
            <ResultPanel
              profile={profile}
              onContinue={() =>
                navigate('/clients/new/foundation', {
                  state: { clientId, previewUrl, skinProfile: profile },
                })
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingPanel() {
  return (
    <div className={styles.statusCard}>
      <span className={styles.spinner} aria-hidden="true" />
      <p className={styles.statusText}>Preparing your skin analysis&hellip;</p>
    </div>
  )
}

function ErrorPanel({ message }) {
  return (
    <div className={styles.statusCard}>
      <p className={styles.errorText}>{message}</p>
      <Button to="/clients/new">Try a different photo</Button>
    </div>
  )
}

function NeedsBetterPhotoPanel({ reason }) {
  return (
    <div className={styles.statusCard}>
      <p className={styles.resultHeadline}>Profile needs a better photo</p>
      <p className={styles.errorText}>
        {reason || 'The lighting or facial-region measurements were inconsistent.'}
      </p>
      <Button to="/clients/new">Upload a clearer photo</Button>
    </div>
  )
}

function ResultPanel({ profile, onContinue }) {
  const [showDetails, setShowDetails] = useState(false)
  const { depth, undertone, hue } = profile.profile
  const confidence = confidenceBand(profile.confidence.overall)

  return (
    <div>
      <p className={styles.eyebrow}>Skin Profile</p>

      <div className={`${styles.profileGrid} animate-in`}>
        <div className={styles.profileField}>
          <p className={styles.fieldLabel}>Depth</p>
          <p className={styles.fieldValue}>{depth}</p>
        </div>
        <div className={styles.profileField}>
          <p className={styles.fieldLabel}>Undertone</p>
          <Badge tone="sage">{undertone}</Badge>
        </div>
        <div className={styles.profileField}>
          <p className={styles.fieldLabel}>Hue</p>
          <Badge tone="rose">{hue}</Badge>
        </div>
        <div className={styles.profileField}>
          <p className={styles.fieldLabel}>Confidence</p>
          <Badge tone={confidence.tone}>{confidence.label}</Badge>
        </div>
      </div>

      <p className={styles.resultBody}>
        Your profile is estimated from color measurements across multiple facial
        regions.
      </p>

      {profile.debug?.annotatedImageBase64 && (
        <div className={styles.debugWrap}>
          <p className={styles.debugLabel}>Detected regions (development preview)</p>
          <img
            src={profile.debug.annotatedImageBase64}
            alt="Debug visualization of detected face and sampled skin regions"
            className={styles.debugImage}
          />
        </div>
      )}

      <div className={styles.detailsWrap}>
        <button
          type="button"
          className={styles.detailsToggle}
          onClick={() => setShowDetails((open) => !open)}
          aria-expanded={showDetails}
        >
          How was this estimated? <span aria-hidden="true">{showDetails ? '−' : '+'}</span>
        </button>
        {showDetails && (
          <ul className={styles.detailsList}>
            {ESTIMATION_POINTS.map((point) => (
              <li key={point}>
                <CheckIcon /> {point}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className={styles.disclaimer}>
        ShadeMatch provides an assistive estimate. Final shade selection should
        always be verified on the skin in suitable lighting.
      </p>

      <Button size="lg" onClick={onContinue}>
        Continue to Foundation
      </Button>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6 10.2l2.4 2.4L14 7.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default SkinAnalysis
