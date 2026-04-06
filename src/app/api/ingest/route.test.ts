import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()
const mockUserFindUnique = vi.fn()
const mockInngestSend = vi.fn()
const mockParseAtlasExcel = vi.fn()
const mockParseOneRoster = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    user: { findUnique: mockUserFindUnique },
  },
}))

vi.mock('@/inngest/client', () => ({
  inngest: { send: mockInngestSend },
}))

vi.mock('@/lib/parsers/excel', () => ({
  parseAtlasExcel: mockParseAtlasExcel,
}))

vi.mock('@/lib/parsers/csv', () => ({
  parseOneRoster: mockParseOneRoster,
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(formData: FormData, ip = '127.0.0.1'): Request {
  return new Request('http://localhost/api/ingest', {
    method: 'POST',
    body: formData,
    headers: { 'x-forwarded-for': ip },
  })
}

function makeFormData(overrides: Record<string, string | File> = {}): FormData {
  const fd = new FormData()
  const defaults: Record<string, string | File> = {
    courseName: 'AP Computer Science',
    gradeLevel: '11',
    track: 'AP',
    file: new File(['data'], 'curriculum.xlsx', { type: 'application/octet-stream' }),
    ...overrides,
  }
  for (const [k, v] of Object.entries(defaults)) {
    fd.append(k, v)
  }
  return fd
}

const MOCK_RAW_DATA = [{ unitName: 'Unit 1', unitDuration: '4 weeks' }]

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockUserFindUnique.mockResolvedValue({ schoolId: 'school-abc' })
    mockParseAtlasExcel.mockResolvedValue(MOCK_RAW_DATA)
    mockParseOneRoster.mockResolvedValue(MOCK_RAW_DATA)
    mockInngestSend.mockResolvedValue(undefined)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeRequest(makeFormData()))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('returns 403 when user has no DB profile', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    const res = await POST(makeRequest(makeFormData()))
    expect(res.status).toBe(403)
  })

  it('returns 400 when required fields are missing', async () => {
    const fd = new FormData()
    // No courseName, gradeLevel, or file
    fd.append('track', 'STANDARD')
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing/i)
  })

  it('returns 400 for unsupported file extension', async () => {
    const fd = makeFormData({
      file: new File(['data'], 'document.pdf', { type: 'application/pdf' }),
    })
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/unsupported/i)
  })

  it('returns 413 when file exceeds 10 MB', async () => {
    const bigData = new Uint8Array(11 * 1024 * 1024) // 11 MB
    const fd = makeFormData({
      file: new File([bigData], 'big.xlsx', { type: 'application/octet-stream' }),
    })
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(413)
    const body = await res.json()
    expect(body.error).toMatch(/10 MB/i)
  })

  it('returns 400 when gradeLevel is not numeric', async () => {
    const fd = makeFormData({ gradeLevel: 'abc' })
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/number/i)
  })

  it('returns 400 when track is invalid', async () => {
    const fd = makeFormData({ track: 'HONORS' })
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/track/i)
  })

  it('returns 400 when parser returns empty data', async () => {
    mockParseAtlasExcel.mockResolvedValue([])
    const res = await POST(makeRequest(makeFormData()))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/no valid data/i)
  })

  it('queues an Inngest event and returns 200 on success (xlsx)', async () => {
    const res = await POST(makeRequest(makeFormData()))
    expect(res.status).toBe(200)
    expect(mockInngestSend).toHaveBeenCalledOnce()

    const sentPayload = mockInngestSend.mock.calls[0][0]
    expect(sentPayload.name).toBe('course.generate')
    expect(sentPayload.data.schoolId).toBe('school-abc') // derived from DB, not hardcoded
    expect(sentPayload.data.userId).toBe('user-123')
  })

  it('queues an Inngest event for CSV files', async () => {
    const fd = makeFormData({
      file: new File(['data'], 'roster.csv', { type: 'text/csv' }),
    })
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    expect(mockParseOneRoster).toHaveBeenCalled()
  })

  it('returns 429 after rate limit is exceeded', async () => {
    // Make 21 requests from the same IP (limit is 20/min)
    // We need to isolate this test IP to avoid polluting others
    const ip = '192.168.99.1'
    const responses: Response[] = []
    for (let i = 0; i < 21; i++) {
      responses.push(await POST(makeRequest(makeFormData(), ip)))
    }
    const last = responses[responses.length - 1]
    expect(last.status).toBe(429)
    expect(last.headers.get('Retry-After')).toBe('60')
  })
})
