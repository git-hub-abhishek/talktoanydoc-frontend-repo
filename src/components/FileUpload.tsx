import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import type { UploadState } from '../types'
import styles from './FileUpload.module.css'

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx']
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

interface FileUploadProps {
  uploadState: UploadState
  onUpload: (file: File) => void
  onReset: () => void
}

export function FileUpload({ uploadState, onUpload, onReset }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onUpload(file)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ''
  }

  const isUploading = uploadState.status === 'uploading' || uploadState.status === 'registering'
  const isDone = uploadState.status === 'done'
  const isError = uploadState.status === 'error'

  if (isDone) {
    return (
      <div className={styles.successBox}>
        <div className={styles.successIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <p className={styles.successTitle}>Document uploaded successfully!</p>
        <p className={styles.successSub}>Your document is being processed. It will be ready to query in a moment.</p>
        <button className="btn btn-outline" onClick={onReset}>Upload another document</button>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''} ${isUploading ? styles.uploading : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload document"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="sr-only"
          onChange={handleChange}
          disabled={isUploading}
          aria-hidden="true"
        />
        {isUploading ? (
          <div className={styles.progressWrapper}>
            <div className={styles.spinner} aria-hidden="true" />
            <p className={styles.statusText}>
              {uploadState.status === 'registering' ? 'Registering document...' : 'Uploading file...'}
            </p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${uploadState.progress}%` }} />
            </div>
            <p className={styles.progressLabel}>{uploadState.progress}%</p>
          </div>
        ) : (
          <div className={styles.idle}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.uploadIcon}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p className={styles.dropText}>
              <span>Drag &amp; drop or <strong>browse</strong></span>
            </p>
            <p className={styles.hint}>
              Supports {ALLOWED_EXTENSIONS.join(', ')} &bull; Max 100MB
            </p>
          </div>
        )}
      </div>
      {isError && (
        <p className={`text-error ${styles.errorMsg}`} role="alert">{uploadState.error}</p>
      )}
    </div>
  )
}
