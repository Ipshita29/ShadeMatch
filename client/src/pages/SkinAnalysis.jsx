import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import StepIndicator from '../components/matching/StepIndicator'
import Button from '../components/common/Button'
import { analyzeSkinRegions } from '../services/clientService'
import styles from './SkinAnalysis.module.css'

const QUALITY_WARNINGS = {
  too_dark: 'This photo looks quite dark — results may be less reliable. Natural daylight works best.',
  too_bright: 'This photo looks overexposed — results may be less reliable. Try softer, more even light.',
  small: 'The face is quite small in this photo — try moving closer for a more reliable sample.',
}

function SkinAnalysis() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clientId, previewUrl } = location.state || {}

  const [status, setStatus] = useState(clientId ? 'loading' : 'missing')
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(null)

  useEffect(() => {
    if (!clientId) return undefined
    let cancelled = false

    analyzeSkinRegions(clientId)
      .then((data) => {
        if (cancelled) return
        setAnalysis(data)
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
          {status === 'success' && (
            <ResultPanel
              analysis={analysis}
              onContinue={() =>
                navigate('/clients/new/foundation', {
                  state: { clientId, previewUrl, skinAnalysis: analysis },
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

function ResultPanel({ analysis, onContinue }) {
  const warningKey =
    analysis.quality?.brightness === 'too_dark'
      ? 'too_dark'
      : analysis.quality?.brightness === 'too_bright'
        ? 'too_bright'
        : analysis.quality?.faceSize === 'small'
          ? 'small'
          : null

  return (
    <div>
      <div className={`${styles.checklist} animate-in`}>
        <p className={styles.checkItem}>
          <CheckIcon /> Face detected
        </p>
        <p className={styles.checkItem}>
          <CheckIcon /> Skin regions identified
        </p>
      </div>

      <p className={styles.resultHeadline}>Skin regions successfully detected.</p>
      <p className={styles.resultBody}>
        We sampled your client&rsquo;s forehead and both cheeks, avoiding eyes, lips,
        hair and shadowed areas, to prepare a representative skin color sample.
      </p>

      {warningKey && <p className={styles.qualityWarning}>{QUALITY_WARNINGS[warningKey]}</p>}

      {analysis.debug?.annotatedImageBase64 && (
        <div className={styles.debugWrap}>
          <p className={styles.debugLabel}>Detected regions (development preview)</p>
          <img
            src={analysis.debug.annotatedImageBase64}
            alt="Debug visualization of detected face and sampled skin regions"
            className={styles.debugImage}
          />
        </div>
      )}

      <p className={styles.disclaimer}>
        ShadeMatch provides an assistive estimate. Lighting, camera settings and filters
        all affect the result — final shade selection should always be verified on the
        skin in suitable lighting.
      </p>

      <Button size="lg" onClick={onContinue}>
        Continue to Skin Profile
      </Button>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
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
