import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDocumentUpload } from '../../hooks/useDocumentUpload'

// Mock the api client so no real HTTP calls happen
vi.mock('../../api/client', () => ({
  getPresignedUrl: vi.fn(),
  uploadToS3: vi.fn(),
  registerDocument: vi.fn(),
}))

import { getPresignedUrl, uploadToS3, registerDocument } from '../../api/client'

const mockGetPresignedUrl = vi.mocked(getPresignedUrl)
const mockUploadToS3 = vi.mocked(uploadToS3)
const mockRegisterDocument = vi.mocked(registerDocument)

const TOKEN = 'test-token'

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(['x'.repeat(size)], name, { type })
  return file
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetPresignedUrl.mockResolvedValue({
    uploadUrl: 'https://s3.example.com/presigned',
    fileKey: 'uploads/doc-1/file.pdf',
    documentId: 'doc-1',
    expiresIn: 300,
    maxSizeBytes: 104857600,
    allowedTypes: ['application/pdf'],
  })
  mockUploadToS3.mockResolvedValue(undefined)
  mockRegisterDocument.mockResolvedValue({ documentId: 'doc-1', status: 'REGISTERED' })
})

describe('useDocumentUpload', () => {
  describe('initial state', () => {
    it('starts idle with 0 progress', () => {
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      expect(result.current.uploadState).toEqual({ progress: 0, status: 'idle' })
    })
  })

  describe('validateFile', () => {
    it('accepts PDF files', () => {
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      const file = makeFile('doc.pdf', 'application/pdf')
      expect(result.current.validateFile(file)).toBeNull()
    })

    it('accepts DOCX files', () => {
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      const file = makeFile('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      expect(result.current.validateFile(file)).toBeNull()
    })

    it('rejects unsupported MIME types', () => {
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      const file = makeFile('img.png', 'image/png')
      expect(result.current.validateFile(file)).toMatch(/PDF|DOC/i)
    })

    it('rejects files over 100 MB', () => {
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      const oversized = new File(['x'], 'big.pdf', { type: 'application/pdf' })
      Object.defineProperty(oversized, 'size', { value: 100 * 1024 * 1024 + 1 })
      expect(result.current.validateFile(oversized)).toMatch(/100MB/i)
    })
  })

  describe('upload', () => {
    it('returns null and sets error state when not authenticated', async () => {
      const { result } = renderHook(() => useDocumentUpload(null))
      let id: string | null = 'sentinel'
      await act(async () => { id = await result.current.upload(makeFile('f.pdf', 'application/pdf')) })
      expect(id).toBeNull()
      expect(result.current.uploadState.status).toBe('error')
      expect(result.current.uploadState.error).toMatch(/authenticated/i)
    })

    it('returns null and sets error for invalid file type', async () => {
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      let id: string | null = 'sentinel'
      await act(async () => { id = await result.current.upload(makeFile('img.png', 'image/png')) })
      expect(id).toBeNull()
      expect(result.current.uploadState.status).toBe('error')
    })

    it('calls getPresignedUrl, uploadToS3, and registerDocument in order', async () => {
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      const callOrder: string[] = []
      mockGetPresignedUrl.mockImplementation(async () => { callOrder.push('presigned'); return { uploadUrl: 'u', fileKey: 'k', documentId: 'doc-1', expiresIn: 300, maxSizeBytes: 1e8, allowedTypes: [] } })
      mockUploadToS3.mockImplementation(async () => { callOrder.push('s3') })
      mockRegisterDocument.mockImplementation(async () => { callOrder.push('register'); return { documentId: 'doc-1', status: 'REGISTERED' } })

      await act(async () => { await result.current.upload(makeFile('f.pdf', 'application/pdf')) })

      expect(callOrder).toEqual(['presigned', 's3', 'register'])
    })

    it('returns the documentId on success', async () => {
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      let id: string | null = null
      await act(async () => { id = await result.current.upload(makeFile('f.pdf', 'application/pdf')) })
      expect(id).toBe('doc-1')
    })

    it('sets status to done and progress to 100 on success', async () => {
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      await act(async () => { await result.current.upload(makeFile('f.pdf', 'application/pdf')) })
      expect(result.current.uploadState.status).toBe('done')
      expect(result.current.uploadState.progress).toBe(100)
      expect(result.current.uploadState.documentId).toBe('doc-1')
    })

    it('sets error state when getPresignedUrl throws', async () => {
      mockGetPresignedUrl.mockRejectedValue(new Error('Network error'))
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      await act(async () => { await result.current.upload(makeFile('f.pdf', 'application/pdf')) })
      expect(result.current.uploadState.status).toBe('error')
      expect(result.current.uploadState.error).toBe('Network error')
    })

    it('sets error state when uploadToS3 throws', async () => {
      mockUploadToS3.mockRejectedValue(new Error('S3 upload failed'))
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      await act(async () => { await result.current.upload(makeFile('f.pdf', 'application/pdf')) })
      expect(result.current.uploadState.status).toBe('error')
      expect(result.current.uploadState.error).toBe('S3 upload failed')
    })
  })

  describe('reset', () => {
    it('resets state to idle after a completed upload', async () => {
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      await act(async () => { await result.current.upload(makeFile('f.pdf', 'application/pdf')) })
      expect(result.current.uploadState.status).toBe('done')
      act(() => result.current.reset())
      expect(result.current.uploadState).toEqual({ progress: 0, status: 'idle' })
    })

    it('resets state to idle after an error', async () => {
      mockGetPresignedUrl.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useDocumentUpload(TOKEN))
      await act(async () => { await result.current.upload(makeFile('f.pdf', 'application/pdf')) })
      expect(result.current.uploadState.status).toBe('error')
      act(() => result.current.reset())
      expect(result.current.uploadState.status).toBe('idle')
    })
  })
})
