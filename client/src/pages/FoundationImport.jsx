import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepIndicator from '../components/matching/StepIndicator'
import UploadBox from '../components/matching/UploadBox'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import { LoadingState, ErrorState } from '../components/common/StatusPanel'
import ShadeReviewRow from '../components/foundations/ShadeReviewRow'
import { getBrands, getFoundations, importChart, importShades } from '../services/foundationService'
import styles from './FoundationImport.module.css'

const WIZARD_STEPS = [
  { id: 1, label: 'Product' },
  { id: 2, label: 'Upload' },
  { id: 3, label: 'Extract' },
  { id: 4, label: 'Review' },
  { id: 5, label: 'Import' },
]

const STAGE_TO_STEP = {
  product: 1,
  upload: 2,
  processing: 3,
  extractError: 3,
  review: 4,
  importing: 5,
  complete: 5,
}

let nextTempId = 1
function makeManualShade() {
  return {
    draftId: `manual-${nextTempId++}`,
    name: '',
    code: '',
    depth: null,
    undertone: null,
    hue: null,
    rgb: null,
    extractionConfidence: null,
    notes: [],
    metadataStatus: 'manual',
    colorStatus: 'not_detected',
    include: true,
  }
}

function FoundationImport() {
  const navigate = useNavigate()
  const [stage, setStage] = useState('product')

  // Step 1 — product selection (same cascading pattern as FoundationSelection.jsx)
  const [brands, setBrands] = useState([])
  const [brandName, setBrandName] = useState('')
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')

  // Step 2 — upload
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  // Step 3/4 — extraction result
  const [extractError, setExtractError] = useState(null)
  const [draftShades, setDraftShades] = useState([])

  // Step 5 — import result
  const [lastSubmitted, setLastSubmitted] = useState([])
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState(null)

  useEffect(() => {
    getBrands()
      .then((data) => {
        setBrands(data)
        if (data.length) setBrandName(data[0].name)
      })
      .catch(() => setBrands([]))
  }, [])

  useEffect(() => {
    if (!brandName) return undefined
    let cancelled = false

    getFoundations({ brand: brandName })
      .then((data) => {
        if (cancelled) return
        setProducts(data)
        setProductId(data[0]?._id || '')
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })

    return () => {
      cancelled = true
    }
  }, [brandName])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const selectedProduct = products.find((p) => p._id === productId)

  const handleFileSelected = (selectedFile) => {
    setUploadError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(selectedFile))
    setFile(selectedFile)
  }

  const startExtraction = async () => {
    if (!file || !productId) return
    setStage('processing')
    setExtractError(null)

    try {
      const draft = await importChart(productId, file)
      setDraftShades(draft.shades)
      setStage('review')
    } catch (error) {
      setExtractError(error.message)
      setStage('extractError')
    }
  }

  const updateShade = (draftId, updated) => {
    setDraftShades((shades) => shades.map((s) => (s.draftId === draftId ? updated : s)))
  }

  const removeShade = (draftId) => {
    setDraftShades((shades) => shades.filter((s) => s.draftId !== draftId))
  }

  const addManualShade = () => {
    setDraftShades((shades) => [...shades, makeManualShade()])
  }

  const submitImport = async (shadesToSubmit) => {
    setStage('importing')
    setImportError(null)
    setLastSubmitted(shadesToSubmit)

    try {
      const result = await importShades(productId, shadesToSubmit)
      setImportResult(result)
      setStage('complete')
    } catch (error) {
      setImportError(error.message)
      setStage('review')
    }
  }

  const handleConfirmImport = () => submitImport(draftShades)

  const handleRetryDuplicates = () => {
    const duplicateLabels = new Set(
      (importResult?.errors || []).filter((e) => e.status === 'duplicate').map((e) => e.shade)
    )
    const toRetry = lastSubmitted
      .filter((s) => duplicateLabels.has(s.name || s.code))
      .map((s) => ({ ...s, forceUpdate: true }))
    if (toRetry.length > 0) submitImport(toRetry)
  }

  const resetWizard = () => {
    setStage('product')
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setDraftShades([])
    setImportResult(null)
    setImportError(null)
  }

  const includedCount = draftShades.filter((s) => s.include !== false).length
  const duplicateErrors = (importResult?.errors || []).filter((e) => e.status === 'duplicate')

  return (
    <div>
      <h1 className={styles.title}>Add Shade Chart</h1>
      <p className={styles.subtitle}>
        Upload a foundation shade chart image to extract candidate shades for review.
      </p>

      <StepIndicator current={STAGE_TO_STEP[stage]} steps={WIZARD_STEPS} label="Shade chart import progress" />

      {stage === 'product' && (
        <div className={styles.stepCard}>
          <div className={styles.selectors}>
            <label className={styles.field}>
              <span className={styles.label}>Brand</span>
              <select className={styles.select} value={brandName} onChange={(e) => setBrandName(e.target.value)}>
                {brands.map((brand) => (
                  <option key={brand._id} value={brand.name}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Product</span>
              <select className={styles.select} value={productId} onChange={(e) => setProductId(e.target.value)}>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Button size="lg" disabled={!productId} onClick={() => setStage('upload')}>
            Continue to Upload
          </Button>
        </div>
      )}

      {stage === 'upload' && (
        <div className={styles.stepCard}>
          <p className={styles.contextLine}>
            {selectedProduct?.name} <span className={styles.contextBrand}>&bull; {brandName}</span>
          </p>

          <UploadBox
            file={file}
            previewUrl={previewUrl}
            status="idle"
            errorMessage={uploadError}
            onFileSelected={handleFileSelected}
            onError={setUploadError}
            onContinue={startExtraction}
            title="Upload a foundation shade chart"
            hint="A clear photo or screenshot of the brand's shade chart, with legible names/codes."
            previewAlt="Selected shade chart preview"
            fieldLabel="Upload shade chart"
            chooseLabel="Choose Chart Image"
            changeLabel="Change Image"
            filePlaceholderName="shade-chart"
            idleLabel="Extract Shades"
          />

          <Button variant="ghost" onClick={() => setStage('product')}>
            &larr; Back to product selection
          </Button>
        </div>
      )}

      {stage === 'processing' && (
        <LoadingState
          title="Reading your shade chart&hellip;"
          steps={['Identifying shade labels', 'Sampling swatch colors']}
        />
      )}

      {stage === 'extractError' && (
        <ErrorState
          title="We couldn't reliably read this shade chart"
          body={extractError}
          actions={[
            { label: 'Try again', onClick: () => setStage('upload') },
            { label: 'Choose another product', onClick: () => setStage('product') },
          ]}
        />
      )}

      {stage === 'review' && (
        <div>
          <div className={styles.reviewHeader}>
            <div>
              <h2 className={styles.reviewTitle}>Review Shade Data</h2>
              <p className={styles.reviewSubtitle}>
                Review the extracted information before adding it to your foundation library.
              </p>
            </div>
            <Badge tone="outline">{includedCount} of {draftShades.length} included</Badge>
          </div>

          {importError && <p className={styles.importErrorText}>{importError}</p>}

          <div className={styles.reviewList}>
            {draftShades.map((shade, index) => (
              <ShadeReviewRow
                key={shade.draftId}
                shade={shade}
                rank={index + 1}
                onChange={(updated) => updateShade(shade.draftId, updated)}
                onRemove={() => removeShade(shade.draftId)}
              />
            ))}
          </div>

          {draftShades.length === 0 && (
            <p className={styles.emptyReview}>No shades left to review — add one manually below, or start over.</p>
          )}

          <Button variant="secondary" onClick={addManualShade} className={styles.addButton}>
            + Add missing shade
          </Button>

          <div className={styles.reviewFooter}>
            <Button variant="ghost" onClick={() => setStage('upload')}>
              &larr; Try a different image
            </Button>
            <Button size="lg" disabled={includedCount === 0} onClick={handleConfirmImport}>
              Confirm &amp; Import {includedCount > 0 ? `(${includedCount})` : ''}
            </Button>
          </div>
        </div>
      )}

      {stage === 'importing' && <LoadingState title="Importing shades&hellip;" steps={[]} />}

      {stage === 'complete' && importResult && (
        <ImportSummary
          result={importResult}
          duplicateErrors={duplicateErrors}
          onRetryDuplicates={handleRetryDuplicates}
          onViewLibrary={() => navigate('/foundations')}
          onImportAnother={resetWizard}
        />
      )}
    </div>
  )
}

function ImportSummary({ result, duplicateErrors, onRetryDuplicates, onViewLibrary, onImportAnother }) {
  const otherErrors = result.errors.filter((e) => e.status !== 'duplicate')
  const isPartial = result.imported > 0 && (result.skipped > 0 || otherErrors.length > 0)
  const isFailure = result.imported === 0 && result.errors.length > 0

  return (
    <div className={styles.stepCard}>
      <h2 className={styles.reviewTitle}>
        {isFailure
          ? 'No shades were imported'
          : isPartial
            ? `${result.imported} shades imported. ${result.skipped + otherErrors.length} need attention.`
            : `${result.imported} shades added to your foundation library.`}
      </h2>

      {duplicateErrors.length > 0 && (
        <div className={styles.duplicateNotice}>
          <p className={styles.duplicateTitle}>{duplicateErrors.length} shade(s) already exist for this product.</p>
          <ul className={styles.errorList}>
            {duplicateErrors.map((e) => (
              <li key={e.shade}>{e.shade}</li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" onClick={onRetryDuplicates}>
            Update these shades instead
          </Button>
        </div>
      )}

      {otherErrors.length > 0 && (
        <div className={styles.duplicateNotice}>
          <p className={styles.duplicateTitle}>{otherErrors.length} shade(s) need attention.</p>
          <ul className={styles.errorList}>
            {otherErrors.map((e) => (
              <li key={e.shade}>
                {e.shade}: {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.reviewFooter}>
        <Button variant="secondary" onClick={onImportAnother}>
          Import another chart
        </Button>
        <Button onClick={onViewLibrary}>View Foundation Library</Button>
      </div>
    </div>
  )
}

export default FoundationImport
