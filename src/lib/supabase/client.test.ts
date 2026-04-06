import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the SSR package before importing the module under test
const mockCreateBrowserClient = vi.fn(() => ({ _type: 'browser-client' }))
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}))

describe('Supabase browser client', () => {
  beforeEach(() => {
    // Reset env and mock state before each test
    vi.resetModules()
    mockCreateBrowserClient.mockClear()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('calls createBrowserClient with the correct env vars', async () => {
    const { createClient } = await import('./client')
    createClient()
    expect(mockCreateBrowserClient).toHaveBeenCalledOnce()
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    )
  })

  it('returns the client produced by createBrowserClient', async () => {
    const { createClient } = await import('./client')
    const client = createClient()
    expect(client).toEqual({ _type: 'browser-client' })
  })
})
