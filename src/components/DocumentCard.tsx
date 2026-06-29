import { useState } from 'react'
import type { Document, DocumentStatus } from '../types'
import styles from './DocumentCard.module.css'

interface DocumentCardProps {
  document: Document
  onSelect: (doc: Document) => void
  isSelected: boolean
  onDelete: (doc: Document) => Promise<void>
}

const STATUS_LABELS: Record<DocumentStatus, string> = {
  UPLOADING: 'Uploading',
  REGISTERED: 'Queued',
  INGESTING: 'Processing',
  READY: 'Ready',
  FAILED: 'Failed',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ type }: { type: string }) {
  const isPdf = type === 'application/pdf'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <text x="7" y="18" fontSize="6" fontWeight="bold" stroke="none" fill="currentColor">{isPdf ? 'PDF' : 'DOC'}</text>
    </svg>
  )
}

export function DocumentCard({ document, onSelect, isSelected, onDelete }: DocumentCardProps) {
  const canSelect = document.status === 'READY'
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirming) { setConfirming(true); return }
    setDeleting(true)
    try {
      await onDelete(document)
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirming(false)
  }

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''} ${canSelect ? styles.selectable : ''}`}
      onClick={() => canSelect && !confirming && onSelect(document)}
      role={canSelect ? 'button' : undefined}
      tabIndex={canSelect ? 0 : undefined}
      onKeyDown={(e) => { if (canSelect && !confirming && (e.key === 'Enter' || e.key === ' ')) onSelect(document) }}
      aria-pressed={isSelected}
      aria-label={`Document: ${document.fileName}`}
    >
      <div className={styles.iconWrapper}>
        <FileIcon type={document.type} />
      </div>
      <div className={styles.info}>
        <p className={styles.fileName} title={document.fileName}>{document.fileName}</p>
        <p className={styles.meta}>{formatBytes(document.size)}</p>
      </div>

      {confirming ? (
        <div className={styles.confirmRow} onClick={e => e.stopPropagation()}>
          <span className={styles.confirmText}>Delete?</span>
          <button
            className={styles.confirmYes}
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Confirm delete"
          >
            {deleting ? '…' : 'Yes'}
          </button>
          <button
            className={styles.confirmNo}
            onClick={handleCancelDelete}
            disabled={deleting}
            aria-label="Cancel delete"
          >
            No
          </button>
        </div>
      ) : (
        <>
          <span className={`${styles.badge} ${styles[`badge_${document.status}`]}`}>
            {STATUS_LABELS[document.status]}
          </span>
          <button
            className={styles.deleteBtn}
            onClick={handleDelete}
            aria-label={`Delete ${document.fileName}`}
            title="Delete document"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
