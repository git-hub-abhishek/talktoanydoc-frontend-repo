import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPresignedUrl,
  uploadToS3,
  registerDocument,
  getDocuments,
  deleteDocument,
} from '../../api/client'

// Stub global fetch for every test
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as Response
}

const TOKEN = 'test-id-token'

beforeEach(() => mockFetch.mockReset())

describe('getPresignedUrl', () => {
  it('calls the correct endpoint with query params', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      uploadUrl: 'https://s3.example.com/upload',
      fileKey: 'uploads/doc-1/file.pdf',
      documentId: 'doc-1',
      expiresIn: 300,
      maxSizeBytes: 104857600,
      allowedTypes: ['application/pdf'],
    }))

    await getPresignedUrl('file.pdf', 'application/pdf', 1024, TOKEN)

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('/generate-url')
    expect(url).toContain('fileName=file.pdf')
    expect(url).toContain('contentType=application%2Fpdf')
    expect(url).toContain('fileSize=1024')
  })

  it('sets Authorization header', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ uploadUrl: '', fileKey: '', documentId: '', expiresIn: 300, maxSizeBytes: 0, allowedTypes: [] }))
    await getPresignedUrl('f.pdf', 'application/pdf', 1, TOKEN)
    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>
    expect(headers['Authorization']).toBe(`Bearer ${TOKEN}`)
  })

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Bad Request' }, false, 400))
    await expect(getPresignedUrl('f.pdf', 'application/pdf', 1, TOKEN)).rejects.toThrow('Bad Request')
  })
})

describe('uploadToS3', () => {
  it('sends a PUT request with the file body', async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response)
    const file = new File(['hello'], 'file.pdf', { type: 'application/pdf' })
    await uploadToS3('https://s3.example.com/presigned', file)

    expect(mockFetch).toHaveBeenCalledWith('https://s3.example.com/presigned', expect.objectContaining({
      method: 'PUT',
      body: file,
    }))
  })

  it('throws when S3 PUT is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false } as Response)
    const file = new File(['x'], 'f.pdf', { type: 'application/pdf' })
    await expect(uploadToS3('https://s3.example.com/presigned', file)).rejects.toThrow('Failed to upload file to S3')
  })
})

describe('registerDocument', () => {
  it('POSTs to /documents/register with the payload', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ documentId: 'doc-1', status: 'REGISTERED' }))

    await registerDocument(
      { documentId: 'doc-1', fileKey: 'uploads/doc-1/f.pdf', fileName: 'f.pdf', size: 1024, type: 'application/pdf' },
      TOKEN,
    )

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/documents/register')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body as string)
    expect(body.documentId).toBe('doc-1')
    expect(body.fileName).toBe('f.pdf')
  })
})

describe('getDocuments', () => {
  it('sends GET to /documents with auth header', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]))
    await getDocuments(TOKEN)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/documents')
    expect(opts.method).toBe('GET')
    expect((opts.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TOKEN}`)
  })

  it('returns parsed document array', async () => {
    const docs = [{ documentId: 'doc-1', fileName: 'f.pdf', status: 'READY' }]
    mockFetch.mockResolvedValue(jsonResponse(docs))
    const result = await getDocuments(TOKEN)
    expect(result).toEqual(docs)
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, false, 401))
    await expect(getDocuments(TOKEN)).rejects.toThrow('Unauthorized')
  })
})

describe('deleteDocument', () => {
  it('sends DELETE to /documents/{documentId}', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ documentId: 'doc-1', deleted: true }))
    await deleteDocument('doc-1', TOKEN)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/documents/doc-1')
    expect(opts.method).toBe('DELETE')
  })

  it('includes Authorization header', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ documentId: 'doc-1', deleted: true }))
    await deleteDocument('doc-1', TOKEN)
    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>
    expect(headers['Authorization']).toBe(`Bearer ${TOKEN}`)
  })

  it('throws when delete fails', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Not Found' }, false, 404))
    await expect(deleteDocument('doc-1', TOKEN)).rejects.toThrow('Not Found')
  })
})
