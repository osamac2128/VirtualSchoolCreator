import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { updateSession } from './middleware'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockCreateServerClient = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function makeNextRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${pathname}`), {
    method: 'GET',
  })
}

function makeSupabaseClientMock(user: object | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('updateSession middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return a valid client with an authenticated user
    mockCreateServerClient.mockImplementation((_url, _key, opts) => {
      // Simulate SSR client accepting cookie adapter
      expect(opts.cookies).toBeDefined()
      return makeSupabaseClientMock({ id: 'user-001', email: 'admin@school.com' })
    })
  })

  it('passes through authenticated requests to non-protected routes', async () => {
    const req = makeNextRequest('/dashboard/admin')
    const response = await updateSession(req)
    // Should NOT redirect — return a NextResponse.next()
    expect(response.status).not.toBe(307)
    expect(response.status).not.toBe(302)
    expect(response.headers.get('location')).toBeNull()
  })

  it('redirects unauthenticated users to /login', async () => {
    mockCreateServerClient.mockImplementation((_url, _key, _opts) =>
      makeSupabaseClientMock(null)
    )

    const req = makeNextRequest('/dashboard/teacher')
    const response = await updateSession(req)

    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    const location = response.headers.get('location')
    expect(location).toBeTruthy()
    expect(location).toMatch(/\/login/)
  })

  it('does NOT redirect unauthenticated requests to /login itself', async () => {
    mockCreateServerClient.mockImplementation((_url, _key, _opts) =>
      makeSupabaseClientMock(null)
    )

    const req = makeNextRequest('/login')
    const response = await updateSession(req)

    // /login should be accessible without auth
    expect(response.headers.get('location')).not.toMatch(/\/login/)
  })

  it('does NOT redirect unauthenticated requests to /auth/* routes', async () => {
    mockCreateServerClient.mockImplementation((_url, _key, _opts) =>
      makeSupabaseClientMock(null)
    )

    const req = makeNextRequest('/auth/callback')
    const response = await updateSession(req)

    expect(response.headers.get('location')).not.toMatch(/\/login/)
  })

  it('initialises the supabase client with env vars', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

    const req = makeNextRequest('/dashboard')
    await updateSession(req)

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    )
  })
})
