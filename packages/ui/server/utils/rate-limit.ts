/**
 * Simple in-memory rate limiting utility.
 * Uses sliding window approach per key (e.g., "upload:192.168.1.1").
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

const requests = new Map<string, RateLimitRecord>()

/**
 * Check if request is within rate limit.
 * @param key - Unique key for rate limiting (e.g., "upload:ip-address")
 * @param limit - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = requests.get(key)

  if (!record || now > record.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

/**
 * Helper to apply rate limiting in an event handler.
 * Throws 429 error if limit exceeded.
 */
export function applyRateLimit(
  event: { node: { req: { headers: Record<string, string | string[] | undefined> } } },
  prefix: string,
  limit: number,
  windowMs: number
): void {
  const forwarded = event.node.req.headers['x-forwarded-for']
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim()
    || event.node.req.headers['x-real-ip'] as string
    || 'unknown'

  if (!rateLimit(`${prefix}:${ip}`, limit, windowMs)) {
    throw createError({
      status: 429,
      message: 'Too many requests. Please try again later.',
      data: { code: 'RATE_LIMITED', retryAfter: Math.ceil(windowMs / 1000) },
    })
  }
}
