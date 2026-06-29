import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getDocuments, deleteDocument } from '../api/client'
import { useDocumentUpload } from '../hooks/useDocumentUpload'
import { FileUpload } from '../components/FileUpload'
import { DocumentCard } from '../components/DocumentCard'
import { QueryChat } from '../components/QueryChat'
import type { Document } from '../types'
import styles from './DashboardPage.module.css'

const POLL_INTERVAL_MS = 5000

export function DashboardPage() {
  const { idToken } = useAuth()
  const { uploadState, upload, reset } = useDocumentUpload(idToken)

  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [docsLoading, setDocsLoading] = useState(true)
  const [docsError, setDocsError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (!idToken) return
    try {
      const docs = await getDocuments(idToken)
      setDocuments(docs)
      setDocsError(null)
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setDocsLoading(false)
    }
  }, [idToken])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Poll while any document is not yet READY or FAILED
  const hasPending = documents.some(d => d.status === 'UPLOADING' || d.status === 'REGISTERED' || d.status === 'INGESTING')
  useEffect(() => {
    if (!hasPending) return
    const id = setInterval(fetchDocuments, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [hasPending, fetchDocuments])

  // After a successful upload, refresh the list
  useEffect(() => {
    if (uploadState.status === 'done') {
      fetchDocuments()
    }
  }, [uploadState.status, fetchDocuments])

  const handleDelete = useCallback(async (doc: Document) => {
    if (!idToken) return
    await deleteDocument(doc.documentId, idToken)
    // Deselect if the deleted doc was open in the chat panel
    setSelectedDoc(prev => prev?.documentId === doc.documentId ? null : prev)
    setDocuments(prev => prev.filter(d => d.documentId !== doc.documentId))
  }, [idToken])

  // Keep selected doc in sync with latest status from list
  useEffect(() => {
    if (!selectedDoc) return
    const updated = documents.find(d => d.documentId === selectedDoc.documentId)
    if (updated) setSelectedDoc(updated)
  }, [documents]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.page}>
      <div className={styles.sidebar}>
        <section className={styles.uploadSection}>
          <h2 className={styles.sectionTitle}>Upload document</h2>
          <FileUpload uploadState={uploadState} onUpload={upload} onReset={reset} />
        </section>

        <section className={styles.docsSection}>
          <div className={styles.docsSectionHeader}>
            <h2 className={styles.sectionTitle}>Your documents</h2>
            <button
              className="btn btn-outline btn-sm"
              onClick={fetchDocuments}
              aria-label="Refresh documents"
              title="Refresh"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh
            </button>
          </div>

          {docsLoading && <p className="text-muted">Loading...</p>}
          {docsError && <p className="text-error" role="alert">{docsError}</p>}
          {!docsLoading && documents.length === 0 && (
            <p className="text-muted">No documents yet. Upload one to get started.</p>
          )}
          <ul className={styles.docList} aria-label="Document list">
            {documents.map((doc) => (
              <li key={doc.documentId}>
                <DocumentCard
                  document={doc}
                  isSelected={selectedDoc?.documentId === doc.documentId}
                  onSelect={setSelectedDoc}
                  onDelete={handleDelete}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className={styles.chatPanel}>
        {selectedDoc ? (
          selectedDoc.status === 'READY' ? (
            <QueryChat document={selectedDoc} idToken={idToken} />
          ) : (
            <div className={styles.notReady}>
              {selectedDoc.status === 'FAILED' ? (
                <>
                  <p className={styles.notReadyTitle}>Processing failed</p>
                  <p className="text-muted">This document could not be processed. Try uploading it again.</p>
                </>
              ) : (
                <>
                  <div className={styles.spinner} aria-hidden="true" />
                  <p className={styles.notReadyTitle}>Processing document…</p>
                  <p className="text-muted">This usually takes under a minute. The page will update automatically.</p>
                </>
              )}
            </div>
          )
        ) : (
          <div className={styles.noSelection}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.noSelectionIcon}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p className={styles.noSelectionTitle}>Select a document to start chatting</p>
            <p className="text-muted">Upload a PDF or Word doc, then click it once it's ready.</p>
          </div>
        )}
      </div>
    </div>
  )
}
