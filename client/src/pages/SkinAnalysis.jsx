import { useLocation, useNavigate } from 'react-router-dom'
import StepIndicator from '../components/matching/StepIndicator'
import SkinProfilePanel from '../components/matching/SkinProfilePanel'
import Button from '../components/common/Button'
import { skinProfiles, analysisReasons } from '../utils/mockData'
import { getSamplePortrait } from '../utils/samplePortrait'
import styles from './SkinAnalysis.module.css'

function SkinAnalysis() {
  const navigate = useNavigate()
  const location = useLocation()
  const photo = location.state?.previewUrl || getSamplePortrait()
  const profile = skinProfiles.amara

  return (
    <div>
      <h1 className={styles.title}>Skin Analysis</h1>
      <StepIndicator current={2} />

      <div className={styles.layout}>
        <div className={styles.imageColumn}>
          <img src={photo} alt="Client's uploaded photo used for skin analysis" className={styles.image} />
        </div>

        <div className={styles.profileColumn}>
          <SkinProfilePanel profile={profile} />

          <div className={styles.explainer}>
            <h2 className={styles.explainerTitle}>How we determined this</h2>
            <ul className={styles.explainerList}>
              {analysisReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>

          <p className={styles.disclaimer}>
            ShadeMatch provides an assistive estimate. Final shade selection should
            always be verified on the skin in suitable lighting.
          </p>

          <Button size="lg" onClick={() => navigate('/clients/new/foundation')}>
            Continue to Foundation
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SkinAnalysis
