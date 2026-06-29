/**
 * Streaming document query hook with server-side reranking.
 *
 * Identical to useDocumentQuery but points at the reranked Lambda Function URL.
 * The backend fetches 20 KNN candidates, scores each with Claude Haiku, then
 * passes the top 5 reranked chunks to Claude Sonnet 4.6 for the final answer.
 */

import { useState, useCallback } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { ChatMessage, QuerySource } from '../types'

const RERANKED_STREAM_URL = import.meta.env.VITE_QUERY_STREAM_RERANKED_URL as string

let msgCounter = 0
function nextId() { return `msg-${++msgCounter}` }

export function useDocumentQueryReranked(documentId: string, idToken: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendQuestion = useCallback(async (question: string) => {
    if (!idToken || loading) return

    const session = await fetchAuthSession()
    const freshToken = session.tokens?.idToken?.toString() ?? idToken

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setError(null)

    const assistantId = nextId()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }])

    try {
      const response = await fetch(RERANKED_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({ documentId, question }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let sources: QuerySource[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean)
        for (const line of lines) {
          const event = JSON.parse(line) as { type?: string; text?: string; sources?: QuerySource[]; error?: string }

          if (event.error) throw new Error(event.error)

          if (event.type === 'sources') {
            sources = event.sources ?? []
          } else if (event.type === 'delta' && event.text) {
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, content: m.content + event.text } : m
            ))
          } else if (event.type === 'done') {
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, sources } : m
            ))
          }
        }
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== assistantId))
      setError(err instanceof Error ? err.message : 'Failed to get answer')
    } finally {
      setLoading(false)
    }
  }, [documentId, idToken, loading])

  function clearMessages() {
    setMessages([])
    setError(null)
  }

  return { messages, loading, error, sendQuestion, clearMessages }
}
