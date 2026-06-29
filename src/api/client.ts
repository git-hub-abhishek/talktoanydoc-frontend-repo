import type {
  PresignedUrlResponse,
  RegisterDocumentRequest,
  RegisterDocumentResponse,
  QueryRequest,
  QueryResponse,
  Document,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

async function request<T>(
  path: string,
  options: RequestInit,
  idToken: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(body.message ?? `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function getPresignedUrl(
  fileName: string,
  contentType: string,
  fileSize: number,
  idToken: string,
): Promise<PresignedUrlResponse> {
  const params = new URLSearchParams({ fileName, contentType, fileSize: String(fileSize) })
  return request<PresignedUrlResponse>(`/generate-url?${params}`, { method: 'GET' }, idToken)
}

export async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!response.ok) {
    throw new Error('Failed to upload file to S3')
  }
}

export async function registerDocument(
  payload: RegisterDocumentRequest,
  idToken: string,
): Promise<RegisterDocumentResponse> {
  return request<RegisterDocumentResponse>('/documents/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, idToken)
}

export async function queryDocument(
  payload: QueryRequest,
  idToken: string,
): Promise<QueryResponse> {
  return request<QueryResponse>('/query', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, idToken)
}

export async function getDocuments(idToken: string): Promise<Document[]> {
  return request<Document[]>('/documents', { method: 'GET' }, idToken)
}

export async function deleteDocument(documentId: string, idToken: string): Promise<void> {
  await request<{ documentId: string; deleted: boolean }>(`/documents/${documentId}`, { method: 'DELETE' }, idToken)
}
