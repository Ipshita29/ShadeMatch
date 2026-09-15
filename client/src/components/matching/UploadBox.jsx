import { useCallback, useRef, useState } from 'react'
import { validateImageFile, formatFileSize } from '../../utils/validateImageFile'
import styles from './UploadBox.module.css'

function UploadBox({
  file,
  previewUrl,
  status = 'idle', // 'idle' | 'uploading' | 'success'
  errorMessage,
  onFileSelected,
  onError,
  onContinue,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)
  const isUploading = status === 'uploading'

  const handleFiles = useCallback(
    (files) => {
      if (isUploading) return
      const selected = files?.[0]
      if (!selected) return

      const validationError = validateImageFile(selected)
      if (validationError) {
        onError(validationError)
        return
      }
      onFileSelected(selected)
    },
    [isUploading, onFileSelected, onError]
  )

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const continueLabel =
    status === 'success'
      ? 'Continue to Skin Profile'
      : status === 'uploading'
        ? 'Uploading photo…'
        : 'Continue'

  return (
    <div>
      <div
        className={`${styles.box} ${isDragging ? styles.dragging : ''} ${previewUrl ? styles.hasPreview : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          if (!isUploading) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <div className={styles.previewWrap}>
            <img src={previewUrl} alt="Selected client photo preview" className={styles.preview} />

            <div className={styles.meta}>
              <div className={styles.metaText}>
                <p className={styles.fileName}>{file?.name || 'client-photo'}</p>
                {file && <p className={styles.fileSize}>{formatFileSize(file.size)}</p>}
                {status === 'success' && (
                  <p className={styles.successNote}>
                    <CheckIcon /> Photo uploaded
                  </p>
                )}
              </div>

              <div className={styles.metaActions}>
                <button
                  type="button"
                  className={styles.changeButton}
                  onClick={() => inputRef.current?.click()}
                  disabled={isUploading}
                >
                  Change Photo
                </button>
                <button
                  type="button"
                  className={styles.continueButton}
                  onClick={onContinue}
                  disabled={isUploading}
                >
                  {isUploading && <span className={styles.spinner} aria-hidden="true" />}
                  {continueLabel}
                </button>
              </div>
            </div>
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
          accept="image/jpeg,image/png,image/webp"
          className={styles.hiddenInput}
          onChange={(event) => {
            handleFiles(event.target.files)
            // Allow re-selecting the same file after an error or change.
            event.target.value = ''
          }}
          aria-label="Upload client photo"
        />
      </div>

      {errorMessage && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}
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

export default UploadBox
