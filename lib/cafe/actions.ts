'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient, createVerificationClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/user'
import logger from '@/lib/logger'
import { resolvePostAuthRedirect } from '@/lib/cafe/auth-redirect'
import { toNepalPhone, NEPAL_PHONE_REGEX } from '@/lib/cafe/phone'
import { strongPasswordSchema } from '@/lib/cafe/password'
import { getSiteOrigin } from '@/lib/site-url'
import {
  consumeRateLimit,
  getClientIp,
  hashIdentifier,
  retryAfterMessage,
} from '@/lib/rate-limit'

const emailSchema = z.string().email('Enter a valid email address')
// Lenient — only guards sign-in against empty/garbage input. Existing accounts
// may predate the strong-password requirement enforced at sign-up/change time.
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')

const onboardingSchema = z.object({
  name:             z.string().min(2, 'Café name must be at least 2 characters').max(100),
  contact_name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone:            z.string().regex(NEPAL_PHONE_REGEX, 'Enter a valid Nepal phone number'),
  neighborhood:     z.string().min(2, 'Neighborhood must be at least 2 characters').max(100),
  delivery_address: z.string().min(5, 'Delivery address too short').max(500),
})

/**
 * Every auth email Supabase sends on our behalf comes back through this route,
 * which verifies the token and then forwards to `next`. See
 * app/auth/confirm/route.ts.
 */
async function authCallbackUrl(next?: string): Promise<string> {
  const origin = await getSiteOrigin()
  const url = new URL('/auth/confirm', origin)
  if (next) url.searchParams.set('next', next)
  return url.toString()
}

/**
 * Supabase reports an unconfirmed address as its own error code, and *only*
 * once the password itself has checked out — a wrong password returns
 * `invalid_credentials` whether or not the account exists.
 *
 * So surfacing this one case is not an enumeration oracle: it tells the caller
 * something about an account they have already proved they hold the password
 * for. Collapsing it into "Invalid email or password" instead, as this action
 * used to, leaves someone typing a password they know is correct with no
 * explanation and no next step — which is exactly the state an unconfirmed
 * account gets stuck in when the confirmation email never arrives.
 */
function isEmailNotConfirmed(error: { code?: string; message: string }): boolean {
  return error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error?: string; redirect?: string; needsConfirmation?: boolean }> {
  const emailParsed = emailSchema.safeParse(email)
  if (!emailParsed.success) return { error: emailParsed.error.issues[0].message }
  const passwordParsed = passwordSchema.safeParse(password)
  if (!passwordParsed.success) return { error: passwordParsed.error.issues[0].message }

  // Two keys, both of which must pass. The account key stops one address being
  // ground through a password list; the IP key stops one host spraying a
  // single password across many addresses, which the account key cannot see.
  const accountLimit = await consumeRateLimit('signIn', hashIdentifier(emailParsed.data))
  if (!accountLimit.allowed) {
    return { error: `Too many sign-in attempts. ${retryAfterMessage(accountLimit.retryAfter)}` }
  }
  const ipLimit = await consumeRateLimit('signInIp', await getClientIp())
  if (!ipLimit.allowed) {
    return { error: `Too many sign-in attempts. ${retryAfterMessage(ipLimit.retryAfter)}` }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // The attempted address is deliberately not logged: sign-in failures are
    // the one log line an attacker can generate at will, and filling the log
    // with candidate addresses turns it into a credential-stuffing worksheet.
    logger.error('Email sign-in failed', { code: error.code, msg: error.message })

    if (isEmailNotConfirmed(error)) {
      return {
        needsConfirmation: true,
        error: 'Your email address has not been confirmed yet. Check your inbox for the confirmation link, or send a new one below.',
      }
    }

    return { error: 'Invalid email or password.' }
  }

  if (!data.user) return { error: 'Authentication failed. Please try again.' }

  return resolvePostAuthRedirect(data.user.id, supabase)
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<{ error?: string; redirect?: string; confirm?: boolean }> {
  const emailParsed = emailSchema.safeParse(email)
  if (!emailParsed.success) return { error: emailParsed.error.issues[0].message }
  const passwordParsed = strongPasswordSchema.safeParse(password)
  if (!passwordParsed.success) return { error: passwordParsed.error.issues[0].message }

  const limit = await consumeRateLimit('signUp', `ip:${await getClientIp()}`)
  if (!limit.allowed) {
    return { error: `Too many sign-up attempts. ${retryAfterMessage(limit.retryAfter)}` }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Without this, the confirmation link Supabase mails out targets the
    // project's configured Site URL — which is a development hostname on most
    // projects, and lands a production sign-up on a page that does not exist.
    options: { emailRedirectTo: await authCallbackUrl('/') },
  })

  if (error) {
    // Supabase's message distinguishes "User already registered" from every
    // other failure, which answers "does this address have an account here?"
    // for anyone who asks. The password itself was already validated above by
    // strongPasswordSchema, so nothing actionable is lost by collapsing this.
    logger.error('Email sign-up failed', { code: error.code, msg: error.message })
    return { error: 'Could not create the account. Please try again.' }
  }

  // Email confirmation required — user is not yet logged in
  if (!data.session) {
    logger.info('Sign-up pending email confirmation')
    return { confirm: true }
  }

  if (!data.user) return { error: 'Authentication failed. Please try again.' }

  return resolvePostAuthRedirect(data.user.id, supabase)
}

/**
 * Mails a fresh confirmation link.
 *
 * Always reports success. Whether an account exists for this address, and
 * whether it is already confirmed, are both things Supabase's own error would
 * disclose — and unlike the sign-in case above, the caller has proved nothing
 * here beyond being able to type an address.
 */
export async function resendConfirmationEmail(email: string): Promise<{ error?: string; sent?: boolean }> {
  const emailParsed = emailSchema.safeParse(email)
  if (!emailParsed.success) return { error: emailParsed.error.issues[0].message }

  const limit = await consumeRateLimit('resendConfirmation', hashIdentifier(emailParsed.data))
  if (!limit.allowed) {
    return { error: `Too many requests. ${retryAfterMessage(limit.retryAfter)}` }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: emailParsed.data,
    options: { emailRedirectTo: await authCallbackUrl('/') },
  })

  if (error) {
    logger.error('Failed to resend confirmation email', { code: error.code, msg: error.message })
  } else {
    logger.info('Confirmation email resent')
  }

  return { sent: true }
}

/**
 * Starts password recovery. Same always-succeeds contract as the resend above,
 * and for the same reason.
 */
export async function requestPasswordReset(email: string): Promise<{ error?: string; sent?: boolean }> {
  const emailParsed = emailSchema.safeParse(email)
  if (!emailParsed.success) return { error: emailParsed.error.issues[0].message }

  const accountLimit = await consumeRateLimit('passwordReset', hashIdentifier(emailParsed.data))
  if (!accountLimit.allowed) {
    return { error: `Too many requests. ${retryAfterMessage(accountLimit.retryAfter)}` }
  }
  const ipLimit = await consumeRateLimit('passwordReset', `ip:${await getClientIp()}`)
  if (!ipLimit.allowed) {
    return { error: `Too many requests. ${retryAfterMessage(ipLimit.retryAfter)}` }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(emailParsed.data, {
    redirectTo: await authCallbackUrl('/reset-password'),
  })

  if (error) {
    logger.error('Failed to send password reset email', { code: error.code, msg: error.message })
  } else {
    logger.info('Password reset email sent')
  }

  return { sent: true }
}

export async function createCafeProfile(
  formData: FormData,
): Promise<{ error?: string; redirect?: string }> {
  const raw = {
    name:             formData.get('name'),
    contact_name:     formData.get('contact_name'),
    phone:            toNepalPhone(String(formData.get('phone') ?? '')),
    neighborhood:     formData.get('neighborhood'),
    delivery_address: formData.get('delivery_address'),
  }

  const parsed = onboardingSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { user } = await getCachedUser()
  if (!user) return { error: 'Not authenticated — please log in again.' }

  // Idempotent: if profile already exists, skip to the right page
  const { data: existing } = await supabase
    .from('cafes')
    .select('status')
    .eq('id', user.id)
    .single()

  if (existing) {
    return { redirect: existing.status === 'active' ? '/' : '/pending' }
  }

  // `status` is deliberately not named here. Migration 012 revokes it (and
  // credit_enabled) from the `authenticated` role's column grants precisely so
  // that a café cannot write its own approval state, and a grant applies to
  // any write that names the column — including one that happens to be writing
  // the correct value. The column default is 'pending', which is what this
  // wants anyway.
  const { error } = await supabase.from('cafes').insert({
    id:               user.id,
    name:             parsed.data.name,
    contact_name:     parsed.data.contact_name,
    phone:            parsed.data.phone,
    neighborhood:     parsed.data.neighborhood,
    delivery_address: parsed.data.delivery_address,
  })

  if (error) {
    logger.error('Failed to create café profile', { userId: user.id, msg: error.message })
    return { error: 'Failed to save your profile. Please try again.' }
  }

  logger.info('Café profile created', { userId: user.id, name: parsed.data.name })
  return { redirect: '/pending' }
}

export async function updateCafeProfile(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const raw = {
    name:             formData.get('name'),
    contact_name:     formData.get('contact_name'),
    phone:            toNepalPhone(String(formData.get('phone') ?? '')),
    neighborhood:     formData.get('neighborhood'),
    delivery_address: formData.get('delivery_address'),
  }

  const parsed = onboardingSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { user } = await getCachedUser()
  if (!user) return { error: 'Not authenticated — please log in again.' }

  // Explicit column whitelist — the update-own RLS policy is row-scoped only,
  // so we must never forward arbitrary fields (e.g. status, credit_enabled) here.
  const { error } = await supabase
    .from('cafes')
    .update({
      name:             parsed.data.name,
      contact_name:     parsed.data.contact_name,
      phone:            parsed.data.phone,
      neighborhood:     parsed.data.neighborhood,
      delivery_address: parsed.data.delivery_address,
    })
    .eq('id', user.id)

  if (error) {
    logger.error('Failed to update café profile', { userId: user.id, msg: error.message })
    return { error: 'Failed to save changes. Please try again.' }
  }

  logger.info('Café profile updated', { userId: user.id })
  revalidatePath('/settings')
  return { success: true }
}

/** Supabase rejects a "new" password identical to the current one. */
function isSamePasswordError(error: { code?: string; message: string }): boolean {
  return error.code === 'same_password' || /should be different/i.test(error.message)
}

/**
 * Whether the account has an email/password credential at all.
 *
 * An account created through Google OAuth has only a `google` identity and no
 * password to re-authenticate against — for that user this form is *setting* a
 * first password, not changing one, and demanding a current password would make
 * it impossible to ever have one.
 */
function hasPasswordIdentity(identities: { provider: string }[] | undefined): boolean {
  return (identities ?? []).some(identity => identity.provider === 'email')
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ error?: string; success?: boolean }> {
  const parsed = strongPasswordSchema.safeParse(newPassword)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  // getUser() rather than the cached claims read: this is the one place that
  // needs `identities`, which is not a token claim, and it is a once-per-change
  // settings action rather than something on the render path.
  const { data: userData, error: userError } = await supabase.auth.getUser()
  const user = userData?.user
  if (userError || !user) return { error: 'Not authenticated — please log in again.' }

  const limit = await consumeRateLimit('changePassword', user.id)
  if (!limit.allowed) {
    return { error: `Too many attempts. ${retryAfterMessage(limit.retryAfter)}` }
  }

  // Re-authentication. Without it, a session is enough to change the password
  // it is protected by — so anyone who reaches an unlocked, signed-in browser
  // can lock the real owner out of the account permanently, which is a strictly
  // larger capability than anything else that session grants.
  if (hasPasswordIdentity(user.identities)) {
    if (!currentPassword) return { error: 'Enter your current password.' }
    if (!user.email) return { error: 'Could not verify your account. Please sign in again.' }

    const verifier = createVerificationClient()
    const { error: reauthError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (reauthError) {
      logger.warn('Password change rejected — re-authentication failed', { userId: user.id })
      return { error: 'Your current password is not correct.' }
    }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data })

  if (error) {
    logger.error('Failed to change password', { userId: user.id, code: error.code, msg: error.message })
    if (isSamePasswordError(error)) {
      return { error: 'Your new password must be different from your current one.' }
    }
    return { error: 'Could not change your password. Please try again.' }
  }

  logger.info('Password changed', { userId: user.id })
  return { success: true }
}

/**
 * How long a verified recovery link stays good for.
 *
 * Long enough to choose a password, short enough that the elevated state does
 * not outlive the visit that earned it.
 */
const RECOVERY_GRACE_SECONDS = 15 * 60

/**
 * Finishes a password reset started from an emailed recovery link.
 *
 * The session that /auth/confirm establishes for a recovery token is an
 * ordinary session, so "is signed in" cannot be the authorisation for setting a
 * password without knowing the old one — an attacker on a signed-in browser
 * would simply navigate here and skip the re-authentication above.
 *
 * `amr` (authentication methods reference) is what distinguishes them. It is a
 * claim inside the signed access token, recording how and when this session was
 * established, so it cannot be forged the way a marker cookie of our own could
 * be. Only a session that was actually minted by verifying a recovery token,
 * recently, may set a password unchallenged.
 */
export async function completePasswordReset(
  newPassword: string,
): Promise<{ error?: string; success?: boolean }> {
  const parsed = strongPasswordSchema.safeParse(newPassword)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()

  if (claimsError || !claimsData) {
    return { error: 'Your reset link has expired. Please request a new one.' }
  }

  const { sub, amr } = claimsData.claims as {
    sub: string
    amr?: { method: string; timestamp: number }[]
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const recovered = (amr ?? []).some(
    entry => entry.method === 'recovery' && nowSeconds - entry.timestamp < RECOVERY_GRACE_SECONDS,
  )

  if (!recovered) {
    logger.warn('Password reset rejected — session was not established by a recovery link', { userId: sub })
    return { error: 'Your reset link has expired. Please request a new one.' }
  }

  const limit = await consumeRateLimit('changePassword', sub)
  if (!limit.allowed) {
    return { error: `Too many attempts. ${retryAfterMessage(limit.retryAfter)}` }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data })

  if (error) {
    logger.error('Failed to complete password reset', { userId: sub, code: error.code, msg: error.message })
    if (isSamePasswordError(error)) {
      return { error: 'Your new password must be different from your current one.' }
    }
    return { error: 'Could not set your password. Please try again.' }
  }

  logger.info('Password reset completed', { userId: sub })
  return { success: true }
}
