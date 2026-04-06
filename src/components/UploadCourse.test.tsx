import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import UploadCourse from './UploadCourse'

// ── Component mocks ───────────────────────────────────────────────────────

vi.mock('@base-ui/react/button', () => ({
  Button: ({ children, className, disabled, ...props }: React.ComponentProps<'button'>) => (
    <button className={className} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@base-ui/react/input', () => ({
  Input: ({ className, ...props }: React.ComponentProps<'input'>) => (
    <input className={className} {...props} />
  ),
}))

// Stub Select with a native <select> element
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode
    onValueChange?: (val: string) => void
    value?: string
  }) => (
    <select
      data-testid="track-select"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))

// ── Fetch mock ────────────────────────────────────────────────────────────

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
})

// ── Helpers ───────────────────────────────────────────────────────────────

function fillAndSubmitForm(courseName = 'AP CS', gradeLevel = '11') {
  fireEvent.change(screen.getByLabelText(/course name/i), {
    target: { value: courseName },
  })
  fireEvent.change(screen.getByLabelText(/grade level/i), {
    target: { value: gradeLevel },
  })
  // Simulate file selection
  const fileInput = screen.getByLabelText(/atlas export file/i)
  const file = new File(['data'], 'curriculum.xlsx', { type: 'application/octet-stream' })
  Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
  fireEvent.change(fileInput)
  fireEvent.click(screen.getByRole('button', { name: /generate course/i }))
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('UploadCourse component', () => {
  it('renders the form with all required fields', () => {
    render(<UploadCourse />)
    expect(screen.getByLabelText(/course name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/grade level/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate course/i })).toBeInTheDocument()
  })

  it('shows validation error when submitting with empty fields', async () => {
    render(<UploadCourse />)
    fireEvent.click(screen.getByRole('button', { name: /generate course/i }))
    await waitFor(() => {
      expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument()
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows success message after successful upload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Course generation queued successfully' }),
    })

    render(<UploadCourse />)
    fillAndSubmitForm()

    await waitFor(() => {
      expect(screen.getByText(/upload successful/i)).toBeInTheDocument()
    })
  })

  it('shows error message on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    })

    render(<UploadCourse />)
    fillAndSubmitForm()

    await waitFor(() => {
      expect(screen.getByText(/unauthorized/i)).toBeInTheDocument()
    })
  })

  it('disables the button and shows uploading state during submission', async () => {
    // Return a pending promise to freeze the upload state
    let resolveUpload!: (val: unknown) => void
    mockFetch.mockReturnValueOnce(
      new Promise((res) => {
        resolveUpload = res
      })
    )

    render(<UploadCourse />)
    fillAndSubmitForm()

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /uploading/i })
      expect(btn).toBeDisabled()
    })

    // Clean up
    act(() => resolveUpload({ ok: true, json: async () => ({}) }))
  })

  it('calls /api/ingest via POST', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'queued' }),
    })

    render(<UploadCourse />)
    fillAndSubmitForm()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ingest',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
