import { useRef, useEffect, FormEvent, useState } from 'react'
import { useDocumentQuery } from '../hooks/useDocumentQuery'
import { useDocumentQueryReranked } from '../hooks/useDocumentQueryReranked'
import type { Document } from '../types'
import styles from './QueryChat.module.css'

interface QueryChatProps {
  document: Document
  idToken: string | null
}

type Mode = 'standard' | 'reranked'

export function QueryChat({ document, idToken }: QueryChatProps) {
  const [mode, setMode] = useState<Mode>('standard')
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const standard = useDocumentQuery(document.documentId, idToken)
  const reranked = useDocumentQueryReranked(document.documentId, idToken)

  const active = mode === 'standard' ? standard : reranked

  // Clear both conversation histories when switching document
  useEffect(() => {
    standard.clearMessages()
    reranked.clearMessages()
  }, [document.documentId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active.messages, active.loading])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q) return
    setInput('')
    await active.sendQuestion(q)
  }

  function handleModeChange(next: Mode) {
    setMode(next)
    // Don't clear messages — user can switch back and forth to compare answers
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.docHeader}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span className={styles.docName}>{document.fileName}</span>

        {/* Mode toggle */}
        <div className={styles.modeToggle} role="group" aria-label="Query mode">
          <button
            className={`${styles.modeBtn} ${mode === 'standard' ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeChange('standard')}
            title="Standard: top-5 KNN chunks passed directly to the LLM"
          >
            Standard
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'reranked' ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeChange('reranked')}
            title="Reranked: top-20 KNN candidates scored by Claude Haiku, best 5 passed to the LLM"
          >
            ✦ Reranked
          </button>
        </div>
      </div>

      {/* Mode description bar */}
      <div className={styles.modeInfo}>
        {mode === 'standard'
          ? 'Standard — top 5 chunks by KNN cosine similarity'
          : '✦ Reranked — top 20 KNN candidates re-scored by Claude Haiku, best 5 selected'}
      </div>

      <div className={styles.messages} aria-live="polite" aria-label="Chat messages">
        {active.messages.length === 0 && (
          <div className={styles.emptyState}>
            <p>Ask anything about <strong>{document.fileName}</strong></p>
            <p className={styles.emptyHint}>Try: "Summarize this document" or "What are the key points?"</p>
          </div>
        )}
        {active.messages.map((msg) => (
          <div key={msg.id} className={`${styles.message} ${styles[msg.role]}`}>
            <p className={styles.messageContent}>{msg.content}</p>
            {msg.sources && msg.sources.length > 0 && (
              <details className={styles.sources}>
                <summary className={styles.sourcesSummary}>
                  {msg.sources.length} source{msg.sources.length !== 1 ? 's' : ''}
                </summary>
                <ul className={styles.sourceList}>
                  {msg.sources.map((s) => (
                    <li key={s.chunkId} className={styles.sourceItem}>{s.title}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
        {active.loading && active.messages[active.messages.length - 1]?.content === '' && (
          <div className={`${styles.message} ${styles.assistant} ${styles.thinking}`}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        )}
        {active.error && (
          <p className={`text-error ${styles.errorMsg}`} role="alert">{active.error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form className={styles.inputRow} onSubmit={handleSubmit}>
        <input
          className={`form-input ${styles.input}`}
          type="text"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={active.loading}
          aria-label="Question input"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={active.loading || !input.trim()}
          aria-label="Send question"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          Send
        </button>
      </form>
    </div>
  )
}
