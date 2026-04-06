import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockSetAll = vi.fn()
const mockGetAll = vi.fn(() => [{ name: 'sb-token', value: 'abc', options: {} }])
const mockCookieStore = { getAll: mockGetAll, set: vi.fn(), setAll: mockSetAll }

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}))

const mockCreateServerClient = vi.fn(() => ({ _type: 'server-client' }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

describe('Supabase server client', () => {
  beforeEach(() => {
    vi.resetModules()
    mockCreateServerClient.mockClear()
    mockGetAll.mockClear()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('calls createServerClient with correct env vars and cookie adapter', async () => {
    const { createClient } = await import('./server')
    await createClient()

    expect(mockCreateServerClient).toHaveBeenCalledOnce()

    const callArgs = mockCreateServerClient.mock.calls[0] as [string, string, { cookies: { getAll: () => unknown; setAll: () => void } }]
    const [url, key, opts] = callArgs

    expect(url).toBe('https://test.supabase.co')
    expect(key).toBe('test-anon-key')
    expect(opts.cookies).toBeDefined()
    expect(typeof opts.cookies.getAll).toBe('function')
    expect(typeof opts.cookies.setAll).toBe('function')
  })

  it('returns the client produced by createServerClient', async () => {
    const { createClient } = await import('./server')
    const client = await createClient()
    expect(client).toEqual({ _type: 'server-client' })
  })

  it('cookie adapter getAll delegates to cookieStore.getAll()', async () => {
    const { createClient } = await import('./server')
    await createClient()

    const callArgs = mockCreateServerClient.mock.calls[0] as [string, string, { cookies: { getAll: () => unknown } }]
    const [,, { cookies }] = callArgs
    const result = cookies.getAll()

    expect(mockGetAll).toHaveBeenCalled()
    expect(result).toEqual([{ name: 'sb-token', value: 'abc', options: {} }])
  })
})
