import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DocumentCard } from '../../components/DocumentCard'
import type { Document } from '../../types'

function makeDoc(overrides: Partial<Document> = {}): Document {
  return {
    documentId: 'doc-1',
    fileName: 'report.pdf',
    size: 2048,
    type: 'application/pdf',
    fileKey: 'uploads/doc-1/report.pdf',
    status: 'READY',
    ...overrides,
  }
}

describe('DocumentCard', () => {
  let onSelect: ReturnType<typeof vi.fn>
  let onDelete: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSelect = vi.fn()
    onDelete = vi.fn().mockResolvedValue(undefined)
  })

  it('renders the file name', () => {
    render(<DocumentCard document={makeDoc()} isSelected={false} onSelect={onSelect} onDelete={onDelete} />)
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
  })

  it('renders the file size', () => {
    render(<DocumentCard document={makeDoc({ size: 1024 })} isSelected={false} onSelect={onSelect} onDelete={onDelete} />)
    expect(screen.getByText('1.0 KB')).toBeInTheDocument()
  })

  it('shows READY status badge', () => {
    render(<DocumentCard document={makeDoc({ status: 'READY' })} isSelected={false} onSelect={onSelect} onDelete={onDelete} />)
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('shows INGESTING status badge', () => {
    render(<DocumentCard document={makeDoc({ status: 'INGESTING' })} isSelected={false} onSelect={onSelect} onDelete={onDelete} />)
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('calls onSelect when a READY card is clicked', () => {
    const doc = makeDoc()
    render(<DocumentCard document={doc} isSelected={false} onSelect={onSelect} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /document: report.pdf/i }))
    expect(onSelect).toHaveBeenCalledWith(doc)
  })

  it('does not call onSelect when a non-READY card is clicked', () => {
    render(<DocumentCard document={makeDoc({ status: 'INGESTING' })} isSelected={false} onSelect={onSelect} onDelete={onDelete} />)
    const card = screen.getByLabelText(/document: report.pdf/i)
    fireEvent.click(card)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('shows delete confirmation after clicking the trash button', () => {
    render(<DocumentCard document={makeDoc()} isSelected={false} onSelect={onSelect} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText(/delete report.pdf/i))
    expect(screen.getByText('Delete?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel delete/i })).toBeInTheDocument()
  })

  it('cancels delete confirmation when No is clicked', () => {
    render(<DocumentCard document={makeDoc()} isSelected={false} onSelect={onSelect} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText(/delete report.pdf/i))
    expect(screen.getByText('Delete?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /cancel delete/i }))
    expect(screen.queryByText('Delete?')).not.toBeInTheDocument()
  })

  it('calls onDelete when Yes is confirmed', async () => {
    const doc = makeDoc()
    render(<DocumentCard document={doc} isSelected={false} onSelect={onSelect} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText(/delete report.pdf/i))
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(doc))
  })

  it('does not call onSelect during confirmation flow', () => {
    const doc = makeDoc()
    render(<DocumentCard document={doc} isSelected={false} onSelect={onSelect} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText(/delete report.pdf/i))
    // Click the card area — should not trigger select while confirming
    const card = screen.getByLabelText(/document: report.pdf/i)
    fireEvent.click(card)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('applies selected styling when isSelected is true', () => {
    render(<DocumentCard document={makeDoc()} isSelected={true} onSelect={onSelect} onDelete={onDelete} />)
    const card = screen.getByLabelText(/document: report.pdf/i)
    expect(card.className).toMatch(/selected/)
  })
})
