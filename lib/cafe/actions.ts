'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'
import { resolvePostAuthRedirect } from '@/lib/cafe/auth-redirect'
import { toNepalPhone, NEPAL_PHONE_REGEX } from '@/lib/cafe/phone'
import { strongPasswordSchema } from '@/lib/cafe/password'

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

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error?: string; redirect?: string }> {
  const emailParsed = emailSchema.safeParse(email)
  if (!emailParsed.success) return { error: emailParsed.error.issues[0].message }
  const passwordParsed = passwordSchema.safeParse(password)
  if (!passwordParsed.success) return { error: passwordParsed.error.issues[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    logger.error('Email sign-in failed', { email, msg: error.message })
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

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    logger.error('Email sign-up failed', { email, msg: error.message })
    return { error: error.message }
  }

  // Email confirmation required — user is not yet logged in
  if (!data.session) {
    logger.info('Sign-up pending email confirmation', { email })
    return { confirm: true }
  }

  if (!data.user) return { error: 'Authentication failed. Please try again.' }

  return resolvePostAuthRedirect(data.user.id, supabase)
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
  const { data: { user } } = await supabase.auth.getUser()
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

  const { error } = await supabase.from('cafes').insert({
    id:               user.id,
    name:             parsed.data.name,
    contact_name:     parsed.data.contact_name,
    phone:            parsed.data.phone,
    neighborhood:     parsed.data.neighborhood,
    delivery_address: parsed.data.delivery_address,
    status:           'pending',
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
  const { data: { user } } = await supabase.auth.getUser()
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

export async function changePassword(
  newPassword: string,
): Promise<{ error?: string; success?: boolean }> {
  const parsed = strongPasswordSchema.safeParse(newPassword)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated — please log in again.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data })

  if (error) {
    logger.error('Failed to change password', { userId: user.id, msg: error.message })
    return { error: error.message }
  }

  logger.info('Password changed', { userId: user.id })
  return { success: true }
}
