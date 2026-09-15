import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepIndicator from '../components/matching/StepIndicator'
import UploadBox from '../components/matching/UploadBox'
import Button from '../components/common/Button'
import { getSamplePortrait } from '../utils/samplePortrait'
import styles from './NewClient.module.css'

function NewClient() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [usingSample, setUsingSample] = useState(false)

  // The preview is carried forward via router state into the Skin Analysis
  // page, so the object URL is intentionally not revoked on unmount here.
  const previewUrl = useMemo(() => {
    if (usingSample) return getSamplePortrait()
    if (file) return URL.createObjectURL(file)
    return null
  }, [file, usingSample])

  const handleFileSelected = (selectedFile) => {
    setUsingSample(false)
    setFile(selectedFile)
  }

  const handleUseSample = () => {
    setFile(null)
    setUsingSample(true)
  }

  return (
    <div>
      <h1 className={styles.title}>New Client</h1>
      <StepIndicator current={1} />

      <div className={styles.layout}>
        <div className={styles.uploadColumn}>
          <UploadBox onFileSelected={handleFileSelected} previewUrl={previewUrl} />

          {!previewUrl && (
            <button type="button" className={styles.sampleLink} onClick={handleUseSample}>
              Don&rsquo;t have a photo handy? Use a sample client photo
            </button>
          )}

          <p className={styles.privacy}>
            Client photos are used only to generate a skin profile for this session and
            are never shared outside your studio account.
          </p>
        </div>

        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Tips for best results</h2>
          <ul className={styles.tips}>
            <li>Natural daylight, ideally indirect and facing a window.</li>
            <li>Bare or minimal makeup on the area being analyzed.</li>
            <li>No filters, beauty modes or heavy color correction.</li>
            <li>Neutral background where possible.</li>
          </ul>
        </aside>
      </div>

      <div className={styles.actions}>
        <Button
          size="lg"
          disabled={!previewUrl}
          onClick={() => navigate('/clients/new/analysis', { state: { previewUrl } })}
        >
          Continue to Skin Profile
        </Button>
        {usingSample && <span className={styles.sampleNote}>Using sample photo</span>}
      </div>
    </div>
  )
}

export default NewClient
