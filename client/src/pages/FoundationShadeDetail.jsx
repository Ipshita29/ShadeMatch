import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import { getShadeById } from '../services/foundationService'
import styles from './FoundationShadeDetail.module.css'

const CALIBRATION_LABELS = {
  calibrated: 'Calibrated',
  estimated: 'Estimated digital color',
  uncalibrated: 'Uncalibrated',
}

function FoundationShadeDetail() {
  const { shadeId } = useParams()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [shade, setShade] = useState(null)
  const [showDebug, setShowDebug] = useState(false)

  // Reset to loading when navigating between two shades on the same route
  // (React Router reuses the component instance). Computed during render
  // rather than in an effect — see Foundations.jsx for the same pattern.
  const [lastShadeId, setLastShadeId] = useState(shadeId)
  if (shadeId !== lastShadeId) {
    setLastShadeId(shadeId)
    setStatus('loading')
  }

  useEffect(() => {
    let cancelled = false

    getShadeById(shadeId)
      .then((data) => {
        if (cancelled) return
        setShade(data)
        setStatus('success')
      })
      .catch((requestError) => {
        if (cancelled) return
        setError(requestError.message)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [shadeId])

  if (status === 'loading') {
    return <p className={styles.statusText}>Loading shade&hellip;</p>
  }

  if (status === 'error') {
    return (
      <div className={styles.statusCard}>
        <p className={styles.errorText}>{error}</p>
        <Button to="/foundations">Back to library</Button>
      </div>
    )
  }

  const rgb = shade.color?.rgb
  const swatchColor = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : null
  const calibrationLabel = CALIBRATION_LABELS[shade.calibration?.status] || 'Estimated digital color'

  return (
    <div>
      <Link to="/foundations" className={styles.back}>
        &larr; Back to library
      </Link>

      <div className={styles.layout}>
        <div className={styles.swatchColumn}>
          {swatchColor ? (
            <div className={styles.bigSwatch} style={{ backgroundColor: swatchColor }} role="img" aria-label={`${shade.name} swatch`} />
          ) : (
            <div className={styles.bigSwatchPlaceholder}>Color unavailable</div>
          )}
        </div>

        <div>
          <p className={styles.brand}>{shade.brand?.name || shade.brandName}</p>
          <p className={styles.product}>{shade.product?.name || shade.productName}</p>
          <h1 className={styles.name}>{shade.name}</h1>

          <div className={styles.grid}>
            <div className={styles.field}>
              <p className={styles.fieldLabel}>Depth</p>
              <p className={styles.fieldValue}>{shade.depth}</p>
            </div>
            <div className={styles.field}>
              <p className={styles.fieldLabel}>Undertone</p>
              <Badge tone="sage">{shade.undertone}</Badge>
            </div>
            <div className={styles.field}>
              <p className={styles.fieldLabel}>Hue</p>
              <Badge tone="rose">{shade.hue}</Badge>
            </div>
          </div>

          <div className={styles.calibration}>
            <p className={styles.fieldLabel}>Color data status</p>
            <p className={styles.fieldValue}>{calibrationLabel}</p>
          </div>

          {shade.source?.reference && <p className={styles.sourceNote}>{shade.source.reference}</p>}

          <div className={styles.debugWrap}>
            <button
              type="button"
              className={styles.debugToggle}
              onClick={() => setShowDebug((open) => !open)}
              aria-expanded={showDebug}
            >
              Developer details <span aria-hidden="true">{showDebug ? '−' : '+'}</span>
            </button>
            {showDebug && rgb && (
              <dl className={styles.debugList}>
                <dt>RGB</dt>
                <dd>
                  {rgb.r}, {rgb.g}, {rgb.b}
                </dd>
                <dt>Lab</dt>
                <dd>
                  L {shade.color.lab.l}, a {shade.color.lab.a}, b {shade.color.lab.b}
                </dd>
                <dt>LCh</dt>
                <dd>
                  L {shade.color.lch.l}, C {shade.color.lch.c}, h {shade.color.lch.h}
                </dd>
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FoundationShadeDetail
