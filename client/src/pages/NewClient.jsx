import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepIndicator from '../components/matching/StepIndicator'
import UploadBox from '../components/matching/UploadBox'
import { getSamplePortraitFile } from '../utils/samplePortrait'
import { uploadClientPhoto, createClient } from '../services/clientService'
import styles from './NewClient.module.css'

const requirements = [
  'Face clearly visible',
  'Natural or evenly lit light',
  'No heavy filters',
  'Minimal/no foundation',
]

function NewClient() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // 'idle' | 'uploading' | 'success'
  const [error, setError] = useState(null)
  const [uploadedPhoto, setUploadedPhoto] = useState(null) // { url, publicId, clientId }

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  // Release the local preview URL whenever it changes or the page unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileSelected = (selectedFile) => {
    setError(null)
    setStatus('idle')
    setUploadedPhoto(null)
    setFile(selectedFile)
  }

  const handleValidationError = (message) => {
    setError(message)
  }

  const handleUseSample = async () => {
    try {
      const sampleFile = await getSamplePortraitFile()
      handleFileSelected(sampleFile)
    } catch {
      setError('Could not load the sample photo. Please try again.')
    }
  }

  const handleContinue = async () => {
    if (status === 'success' && uploadedPhoto) {
      navigate('/clients/new/analysis', {
        state: { previewUrl: uploadedPhoto.url, clientId: uploadedPhoto.clientId },
      })
      return
    }

    if (!file || status === 'uploading') return

    setStatus('uploading')
    setError(null)

    try {
      const uploaded = await uploadClientPhoto(file)
      const client = await createClient({ photoUrl: uploaded.url, photoPublicId: uploaded.publicId })
      setUploadedPhoto({ ...uploaded, clientId: client._id })
      setStatus('success')
    } catch (uploadError) {
      setError(uploadError.message)
      setStatus('idle')
    }
  }

  return (
    <div>
      <h1 className={styles.title}>New Client</h1>
      <StepIndicator current={1} />

      <div className={styles.layout}>
        <div className={styles.uploadColumn}>
          <UploadBox
            file={file}
            previewUrl={previewUrl}
            status={status}
            errorMessage={error}
            onFileSelected={handleFileSelected}
            onError={handleValidationError}
            onContinue={handleContinue}
          />

          {!file && (
            <button type="button" className={styles.sampleLink} onClick={handleUseSample}>
              Don&rsquo;t have a photo handy? Use a sample client photo
            </button>
          )}

          <p className={styles.privacy}>
            ShadeMatch uses the image only to assist with shade estimation. Only upload
            photos you have permission to use.
          </p>
        </div>

        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Before you upload</h2>
          <ul className={styles.tips}>
            {requirements.map((item) => (
              <li key={item}>
                <CheckIcon /> {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>
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

export default NewClient
