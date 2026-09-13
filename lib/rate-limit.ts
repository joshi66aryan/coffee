import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import logger from '@/lib/logger'

/**
 * Fixed-window rate limiting for the endpoints an anonymous or newly
 * authenticated caller can hit repeatedly.
 *
 * The counter lives in Postgres (migration 013), not in module scope. This app
 * deploys to serverless functions, where an in-memory limiter counts per
 * instance and resets on every cold start — an attacker who can cause either
 * gets an unlimited budget, which is worse than no limiter because it looks
 * like one. One indexed upsert against a single-row-per-key table is the price,
 * and it is only paid on the handful of routes listed below, never on a page
 * render.
 *
 * Supabase applies its own limits to the Auth API, but they are per-project and
 * generous (and say nothing about our own Server Actions), so they bound the
 * damage rather than the attempt.
 */

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number
  windowSeconds: number
}

/**
 * One entry per protected operation. The numbers are set so a person who has
 * genuinely forgotten which password they used never meets them, and a script
 * meets them immediately.
 */
export const RATE_LIMITS = {
  /** Password guessing against one account. */
  signIn: { limit: 10, windowSeconds: 300 },
  /**
   * The same, per source address. Deliberately looser than the per-account
   * limit: a café office is one NAT address shared by several staff, and
   * several people mistyping a password in the same five minutes is a Tuesday,
   * not an attack. What this catches is the other shape — one host spraying a
   * single common password across many different accounts, which never trips
   * an account-scoped counter at all.
   */
  signInIp: { limit: 40, windowSeconds: 300 },
  /** Account-farming, and Supabase's confirmation-email quota. */
  signUp: { limit: 5, windowSeconds: 3600 },
  /** Each of these sends an email to an address the caller chose. */
  passwordReset: { limit: 5, windowSeconds: 3600 },
  resendConfirmation: { limit: 5, windowSeconds: 3600 },
  /** Authenticated, but re-authenticates against the old password. */
  changePassword: { limit: 10, windowSeconds: 3600 },
  /** Bounded well above a real café's ordering rate. */
  placeOrder: { limit: 30, windowSeconds: 300 },
  /** Polled by the approval watcher while a café waits. */
  cafeStatus: { limit: 120, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>

export type RateLimitBucket = keyof typeof RATE_LIMITS

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the current window closes. */
  retryAfter: number
}

/**
 * A stable, non-reversible identifier for a value we do not want to store.
 *
 * Sign-in is keyed partly on the email address, and a table of addresses that
 * have been tried is exactly the credential-stuffing worksheet that
 * lib/cafe/actions.ts already refuses to write to the log. Hashing keeps the
 * counter per-account without keeping the account.
 */
export function hashIdentifier(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 32)
}

/**
 * The caller's IP, as reported by the proxy in front of this app.
 *
 * Spoofable if something other than the platform proxy can reach the app
 * directly, which is why no limit below is keyed on IP *alone* where an
 * account-scoped key is available — the IP narrows a shared bucket, it does not
 * carry it.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers()
  const forwardedFor = headerList.get('x-forwarded-for')
  if (forwardedFor) {
    // Left-most entry is the original client; the rest are proxy hops.
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }
  return headerList.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * Records one hit against `bucket:identifier` and reports whether it is allowed.
 *
 * Fails **open**. If the rate-limit table or function is unreachable the request
 * proceeds and the failure is logged at error level. The alternative — failing
 * closed — turns any database hiccup into a total sign-in outage, and makes the
 * limiter itself the most attractive thing on the system to break. It is a
 * defence-in-depth control sitting in front of Supabase's own auth limits, not
 * the only thing standing between an attacker and an account.
 */
export async function consumeRateLimit(
  bucket: RateLimitBucket,
  identifier: string,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[bucket]

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_key: `${bucket}:${identifier}`,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    })

    if (error) {
      logger.error('Rate limit check failed — allowing request', { bucket, msg: error.message })
      return { allowed: true, retryAfter: 0 }
    }

    const result = data as { allowed: boolean; retry_after: number } | null
    if (!result) {
      logger.error('Rate limit check returned no result — allowing request', { bucket })
      return { allowed: true, retryAfter: 0 }
    }

    if (!result.allowed) {
      // The identifier is already hashed by every caller that passes user
      // input, so this is safe to log — and it is the line that shows an
      // attack in progress.
      logger.warn('Rate limit exceeded', { bucket, identifier, retryAfter: result.retry_after })
    }

    return { allowed: result.allowed, retryAfter: result.retry_after }
  } catch (err) {
    logger.error('Rate limit check threw — allowing request', {
      bucket,
      msg: err instanceof Error ? err.message : String(err),
    })
    return { allowed: true, retryAfter: 0 }
  }
}

/** Human-readable "try again in ..." for a user-facing message. */
export function retryAfterMessage(retryAfter: number): string {
  if (retryAfter <= 60) return 'Please try again in a minute.'
  const minutes = Math.ceil(retryAfter / 60)
  return `Please try again in ${minutes} minutes.`
}
