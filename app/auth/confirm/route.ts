import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { resolvePostAuthRedirect } from '@/lib/cafe/auth-redirect'
import logger from '@/lib/logger'

/**
 * Where every Supabase auth email lands: sign-up confirmation and password
 * recovery.
 *
 * Before this route existed the app had no landing point of its own, so
 * `signUp` was called with no `emailRedirectTo` and the confirmation link fell
 * back to the project's Site URL. There was also no recovery flow at all — a
 * café that could not sign in had nothing to click.
 *
 * Verification happens through `verifyOtp` on the `token_hash` in the link,
 * rather than a PKCE code exchange. The difference matters in practice: a PKCE
 * exchange needs the code verifier cookie from the browser that *started* the
 * flow, so signing up on a phone and opening the email on a laptop fails. A
 * token hash carries its own proof and works from whichever device opened the
 * mail.
 */

// `email_change` is not reachable from this app's UI, but Supabase will send it
// if the address is ever changed from the dashboard — better verified here than
// dropped.
const ALLOWED_TYPES = new Set<EmailOtpType>(['signup', 'recovery', 'invite', 'email_change', 'magiclink', 'email'])

function isAllowedType(value: string | null): value is EmailOtpType {
  return value !== null && ALLOWED_TYPES.has(value as EmailOtpType)
}

/**
 * `next` comes off a URL we generated, but it arrives back as user input.
 * Anything that is not a plain same-origin path is discarded rather than
 * followed — `//evil.example` is a protocol-relative URL, not a local path.
 */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  const supabase = await createClient()

  if (tokenHash && isAllowedType(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

    if (!error && data.user) {
      logger.info('Auth link verified', { userId: data.user.id, type })

      // Recovery lands on the page that finishes the reset. Sending it through
      // resolvePostAuthRedirect instead would drop the person on the catalog
      // with a session and no password set.
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}${next === '/' ? '/reset-password' : next}`)
      }

      const { redirect } = await resolvePostAuthRedirect(data.user.id, supabase)
      return NextResponse.redirect(`${origin}${redirect}`)
    }

    logger.error('Auth link verification failed', { type, msg: error?.message })
    return NextResponse.redirect(`${origin}/login?error=link`)
  }

  // Older links, and any Supabase flow configured to return a PKCE code, still
  // arrive here. Same destination, different proof.
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const { redirect } = await resolvePostAuthRedirect(data.user.id, supabase)
      return NextResponse.redirect(`${origin}${redirect}`)
    }

    logger.error('Auth code exchange failed at /auth/confirm', { msg: error?.message })
  }

  return NextResponse.redirect(`${origin}/login?error=link`)
}
