import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDocumentQuery } from '../../hooks/useDocumentQuery'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const TOKEN = 'test-token'
const DOC_ID = 'doc-1'

// Build a mock ReadableStream whose reader yields newline-delimited JSON events.
function makeStreamResponse(events: object[], ok = true, status = 200) {
  const lines = events.map(e => JSON.stringify(e) + '\n').join('')
  const encoder = new TextEncoder()
  let sent = false
  const stream = new ReadableStream({
    pull(controller) {
      if (!sent) {
        controller.enqueue(encoder.encode(lines))
        sent = true
      } else {
        controller.close()
      }
    },
  })
  return { ok, status, body: stream }
}

beforeEach(() => mockFetch.mockReset())

describe('useDocumentQuery', () => {
  it('starts with empty messages, not loading, no error', () => {
    const { result } = renderHook(() => useDocumentQuery(DOC_ID, TOKEN))
    expect(result.current.messages).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('does nothing when idToken is null', async () => {
    const { result } = renderHook(() => useDocumentQuery(DOC_ID, null))
    await act(async () => { await result.current.sendQuestion('hello?') })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.messages).toHaveLength(0)
  })

  it('adds user message immediately when sendQuestion is called', async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([
      { type: 'done' },
    ]))
    const { result } = renderHook(() => useDocumentQuery(DOC_ID, TOKEN))
    await act(async () => { await result.current.sendQuestion('What is this?') })
    const userMsg = result.current.messages.find(m => m.role === 'user')
    expect(userMsg?.content).toBe('What is this?')
  })

  it('accumulates delta events into the assistant message', async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([
      { type: 'delta', text: 'Hello' },
      { type: 'delta', text: ' world' },
      { type: 'done' },
    ]))
    const { result } = renderHook(() => useDocumentQuery(DOC_ID, TOKEN))
    await act(async () => { await result.current.sendQuestion('hi') })
    const assistant = result.current.messages.find(m => m.role === 'assistant')
    expect(assistant?.content).toBe('Hello world')
  })

  it('attaches sources to the assistant message on done event', async () => {
    const sources = [{ chunkId: 'doc-1#0', title: 'file.pdf' }]
    mockFetch.mockResolvedValue(makeStreamResponse([
      { type: 'sources', sources },
      { type: 'delta', text: 'Answer' },
      { type: 'done' },
    ]))
    const { result } = renderHook(() => useDocumentQuery(DOC_ID, TOKEN))
    await act(async () => { await result.current.sendQuestion('tell me') })
    const assistant = result.current.messages.find(m => m.role === 'assistant')
    expect(assistant?.sources).toEqual(sources)
  })

  it('sets loading to false after stream completes', async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([{ type: 'done' }]))
    const { result } = renderHook(() => useDocumentQuery(DOC_ID, TOKEN))
    await act(async () => { await result.current.sendQuestion('q') })
    expect(result.current.loading).toBe(false)
  })

  it('sets error and removes assistant placeholder on non-ok HTTP response (no body)', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, body: null })
    const { result } = renderHook(() => useDocumentQuery(DOC_ID, TOKEN))
    await act(async () => { await result.current.sendQuestion('q') })
    expect(result.current.error).toMatch(/503/)
    expect(result.current.messages.every(m => m.role !== 'assistant')).toBe(true)
  })

  it('sets error and removes assistant placeholder on non-ok HTTP response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, body: null })
    const { result } = renderHook(() => useDocumentQuery(DOC_ID, TOKEN))
    await act(async () => { await result.current.sendQuestion('q') })
    expect(result.current.error).toMatch(/500/)
    expect(result.current.messages.every(m => m.role !== 'assistant')).toBe(true)
  })

  it('sets error when stream returns an error event', async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([{ error: 'Guardrail blocked' }]))
    const { result } = renderHook(() => useDocumentQuery(DOC_ID, TOKEN))
    await act(async () => { await result.current.sendQuestion('q') })
    expect(result.current.error).toBe('Guardrail blocked')
  })

  it('clearMessages resets messages and error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, body: null })
    const { result } = renderHook(() => useDocumentQuery(DOC_ID, TOKEN))
    await act(async () => { await result.current.sendQuestion('q') })
    expect(result.current.error).not.toBeNull()
    act(() => result.current.clearMessages())
    expect(result.current.messages).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('POSTs to the stream URL with documentId and question', async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([{ type: 'done' }]))
    const { result } = renderHook(() => useDocumentQuery(DOC_ID, TOKEN))
    await act(async () => { await result.current.sendQuestion('what does it say?') })
    const [, opts] = mockFetch.mock.calls[0]
    const body = JSON.parse(opts.body as string)
    expect(body.documentId).toBe(DOC_ID)
    expect(body.question).toBe('what does it say?')
    expect((opts.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TOKEN}`)
  })
})
