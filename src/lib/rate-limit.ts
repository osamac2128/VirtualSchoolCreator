/**
 * Note: This is a per-process rate limiter. In multi-instance deployments,
 * replace with Upstash Redis ratelimit (@upstash/ratelimit). For
 * single-instance or Vercel Fluid Compute, this is sufficient.
 */

interface RateEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateEntry>()

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt }
}
