/**
 * Simple in-memory sliding-window rate limiter for Next.js API routes.
 *
 * Uses a Map keyed by IP address. Each entry tracks an array of request
 * timestamps within the current window. Suitable for single-process
 * environments (dev + Vercel serverless). For multi-instance production
 * deployments, swap the store for a Redis/Upstash adapter.
 */

interface RateLimitOptions {
  /** Max requests allowed within the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

// Module-level map — persists across requests within the same process.
const store = new Map<string, number[]>()

/**
 * Check whether the given key (typically an IP address) has exceeded the
 * configured rate limit.  Returns { success: false } when the caller should
 * respond with HTTP 429.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const { limit, windowMs } = options
  const now = Date.now()
  const windowStart = now - windowMs

  // Retrieve existing timestamps, pruning entries outside the window
  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart)
  timestamps.push(now)
  store.set(key, timestamps)

  const remaining = Math.max(0, limit - timestamps.length)
  const resetAt = now + windowMs

  return {
    success: timestamps.length <= limit,
    remaining,
    resetAt,
  }
}

/**
 * Extract the client IP from a Next.js Request object.
 * Respects X-Forwarded-For for deployments behind a proxy/CDN.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  // Fallback — real-ip header set by some reverse proxies
  return req.headers.get('x-real-ip') ?? 'unknown'
}
