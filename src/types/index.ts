export type DocumentStatus = 'UPLOADING' | 'REGISTERED' | 'INGESTING' | 'READY' | 'FAILED'

export interface Document {
  documentId: string
  fileName: string
  size: number
  type: string
  fileKey: string
  status: DocumentStatus
  uploadedAt?: string
}

export interface PresignedUrlResponse {
  uploadUrl: string
  fileKey: string
  documentId: string
  expiresIn: number
  maxSizeBytes: number
  allowedTypes: string[]
}

export interface RegisterDocumentRequest {
  documentId: string
  fileKey: string
  fileName: string
  size: number
  type: string
}

export interface RegisterDocumentResponse {
  documentId: string
  status: DocumentStatus
}

export interface QueryRequest {
  documentId: string
  question: string
  sessionId?: string
}

export interface QuerySource {
  chunkId: string
  title: string
}

export interface QueryResponse {
  answer: string
  sources: QuerySource[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: QuerySource[]
  timestamp: Date
}

export interface UploadState {
  progress: number
  status: 'idle' | 'uploading' | 'registering' | 'done' | 'error'
  error?: string
  documentId?: string
}
