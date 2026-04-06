import { describe, it, expect, vi } from 'vitest'
import { checkRateLimit, getClientIp } from './rate-limiter'

// ── checkRateLimit ─────────────────────────────────────────────────────────

describe('checkRateLimit', () => {
  // Each test uses a unique key so the module-level store doesn't bleed across tests
  const uniqueKey = () => `test-${Math.random().toString(36).slice(2)}`

  it('allows requests within the limit', () => {
    const key = uniqueKey()
    const result = checkRateLimit(key, { limit: 5, windowMs: 60_000 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('tracks remaining count correctly across multiple calls', () => {
    const key = uniqueKey()
    const opts = { limit: 3, windowMs: 60_000 }
    checkRateLimit(key, opts) // 1
    checkRateLimit(key, opts) // 2
    const result = checkRateLimit(key, opts) // 3 — at limit
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('rejects the request that exceeds the limit', () => {
    const key = uniqueKey()
    const opts = { limit: 2, windowMs: 60_000 }
    checkRateLimit(key, opts) // 1
    checkRateLimit(key, opts) // 2
    const result = checkRateLimit(key, opts) // 3 — over limit
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('prunes timestamps outside the sliding window', () => {
    const key = uniqueKey()
    const now = Date.now()

    // Simulate two old requests that happened 2 minutes ago (outside a 1-min window)
    vi.setSystemTime(now - 120_000)
    checkRateLimit(key, { limit: 3, windowMs: 60_000 })
    checkRateLimit(key, { limit: 3, windowMs: 60_000 })

    // Advance to "now" — old timestamps should be pruned
    vi.setSystemTime(now)
    const result = checkRateLimit(key, { limit: 3, windowMs: 60_000 })

    // Only the 1 new request is counted; old ones are outside the window
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(2)

    vi.useRealTimers()
  })

  it('returns a resetAt timestamp in the future', () => {
    const key = uniqueKey()
    const before = Date.now()
    const result = checkRateLimit(key, { limit: 10, windowMs: 60_000 })
    expect(result.resetAt).toBeGreaterThan(before)
  })

  it('different keys are tracked independently', () => {
    const opts = { limit: 1, windowMs: 60_000 }
    const key1 = uniqueKey()
    const key2 = uniqueKey()

    checkRateLimit(key1, opts) // uses key1's slot
    checkRateLimit(key1, opts) // exceeds key1

    const result2 = checkRateLimit(key2, opts) // key2 is fresh
    expect(result2.success).toBe(true)
  })
})

// ── getClientIp ────────────────────────────────────────────────────────────

describe('getClientIp', () => {
  function makeReq(headers: Record<string, string>): Request {
    return new Request('http://localhost/api/test', { headers })
  }

  it('extracts the first IP from X-Forwarded-For', () => {
    const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('handles a single IP in X-Forwarded-For', () => {
    const req = makeReq({ 'x-forwarded-for': '203.0.113.5' })
    expect(getClientIp(req)).toBe('203.0.113.5')
  })

  it('falls back to X-Real-IP when X-Forwarded-For is absent', () => {
    const req = makeReq({ 'x-real-ip': '10.0.0.1' })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('returns "unknown" when no IP headers are present', () => {
    const req = makeReq({})
    expect(getClientIp(req)).toBe('unknown')
  })

  it('strips whitespace from X-Forwarded-For entries', () => {
    const req = makeReq({ 'x-forwarded-for': '  192.168.1.1  , 10.0.0.1' })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })
})
