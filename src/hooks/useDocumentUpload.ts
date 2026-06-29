import { useState } from 'react'
import { getPresignedUrl, uploadToS3, registerDocument } from '../api/client'
import type { UploadState } from '../types'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE_BYTES = 100 * 1024 * 1024

export function useDocumentUpload(idToken: string | null) {
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    status: 'idle',
  })

  function reset() {
    setUploadState({ progress: 0, status: 'idle' })
  }

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only PDF, DOC, and DOCX files are allowed'
    }
    if (file.size > MAX_SIZE_BYTES) {
      return 'File size exceeds 100MB limit'
    }
    return null
  }

  async function upload(file: File): Promise<string | null> {
    if (!idToken) {
      setUploadState({ progress: 0, status: 'error', error: 'Not authenticated' })
      return null
    }

    const validationError = validateFile(file)
    if (validationError) {
      setUploadState({ progress: 0, status: 'error', error: validationError })
      return null
    }

    try {
      setUploadState({ progress: 10, status: 'uploading' })

      const { uploadUrl, fileKey, documentId } = await getPresignedUrl(
        file.name,
        file.type,
        file.size,
        idToken,
      )

      setUploadState({ progress: 30, status: 'uploading' })

      await uploadToS3(uploadUrl, file)

      setUploadState({ progress: 70, status: 'registering' })

      await registerDocument(
        { documentId, fileKey, fileName: file.name, size: file.size, type: file.type },
        idToken,
      )

      setUploadState({ progress: 100, status: 'done', documentId })
      return documentId
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setUploadState({ progress: 0, status: 'error', error: message })
      return null
    }
  }

  return { uploadState, upload, reset, validateFile }
}
