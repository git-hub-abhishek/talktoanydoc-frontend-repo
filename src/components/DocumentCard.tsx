import type { Document, DocumentStatus } from '../types'
import styles from './DocumentCard.module.css'

interface DocumentCardProps {
  document: Document
  onSelect: (doc: Document) => void
  isSelected: boolean
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

export function DocumentCard({ document, onSelect, isSelected }: DocumentCardProps) {
  const canSelect = document.status === 'READY'

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''} ${canSelect ? styles.selectable : ''}`}
      onClick={() => canSelect && onSelect(document)}
      role={canSelect ? 'button' : undefined}
      tabIndex={canSelect ? 0 : undefined}
      onKeyDown={(e) => { if (canSelect && (e.key === 'Enter' || e.key === ' ')) onSelect(document) }}
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
      <span className={`${styles.badge} ${styles[`badge_${document.status}`]}`}>
        {STATUS_LABELS[document.status]}
      </span>
    </div>
  )
}
