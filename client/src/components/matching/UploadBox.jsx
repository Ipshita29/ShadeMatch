import { useCallback, useRef, useState } from 'react'
import styles from './UploadBox.module.css'

function UploadBox({ onFileSelected, previewUrl }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0]
      if (file && file.type.startsWith('image/')) {
        onFileSelected(file)
      }
    },
    [onFileSelected]
  )

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div
      className={`${styles.box} ${isDragging ? styles.dragging : ''} ${previewUrl ? styles.hasPreview : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {previewUrl ? (
        <div className={styles.previewWrap}>
          <img src={previewUrl} alt="Selected client photo preview" className={styles.preview} />
          <button
            type="button"
            className={styles.replaceButton}
            onClick={() => inputRef.current?.click()}
          >
            Replace photo
          </button>
        </div>
      ) : (
        <>
          <span className={styles.iconCircle} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M12 16V4m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className={styles.title}>Upload a client photo</p>
          <p className={styles.hint}>
            Best results come from natural daylight, minimal makeup and no filters.
          </p>
          <p className={styles.dragText}>Drag &amp; drop your image here, or</p>
          <button type="button" className={styles.chooseButton} onClick={() => inputRef.current?.click()}>
            Choose Photo
          </button>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={(event) => handleFiles(event.target.files)}
        aria-label="Upload client photo"
      />
    </div>
  )
}

export default UploadBox
