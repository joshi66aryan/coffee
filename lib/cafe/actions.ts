'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'
import { NEPAL_PHONE_REGEX } from '@/lib/cafe/phone'

const phoneSchema = z
  .string()
  .regex(NEPAL_PHONE_REGEX, 'Enter a valid Nepal phone number (+977XXXXXXXXXX)')

const emailSchema = z.string().email('Enter a valid email address')
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')

async function resolvePostAuthRedirect(userId: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ redirect: string }> {
  if ((await supabase.auth.getUser()).data.user?.app_metadata?.role === 'admin') {
    logger.info('Admin login', { userId })
    return { redirect: '/admin' }
  }

  const { data: cafe } = await supabase.from('cafes').select('status').eq('id', userId).single()

  if (!cafe) {
    logger.info('New user — redirecting to onboarding', { userId })
    return { redirect: '/onboarding' }
  }

  if (cafe.status === 'pending' || cafe.status === 'rejected') {
    return { redirect: '/pending' }
  }

  logger.info('Café user login', { userId })
  return { redirect: '/' }
}

const onboardingSchema = z.object({
  name:             z.string().min(2, 'Café name must be at least 2 characters').max(100),
  contact_name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
  neighborhood:     z.string().min(2, 'Neighborhood must be at least 2 characters').max(100),
  delivery_address: z.string().min(5, 'Delivery address too short').max(500),
})

export async function sendOtp(phone: string): Promise<{ error?: string }> {
  const parsed = phoneSchema.safeParse(phone)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ phone })

  if (error) {
    logger.error('OTP send failed', { phone: phone.replace(/\d{4}$/, '****'), msg: error.message })
    return { error: error.message }
  }

  logger.info('OTP sent', { phone: phone.replace(/\d{4}$/, '****') })
  return {}
}

export async function verifyOtp(
  phone: string,
  token: string,
): Promise<{ error?: string; redirect?: string }> {
  if (phoneSchema.safeParse(phone).success === false) {
    return { error: 'Invalid phone number' }
  }
  if (!/^\d{6}$/.test(token)) {
    return { error: 'Enter the 6-digit code' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })

  if (error) {
    logger.error('OTP verify failed', { msg: error.message })
    return { error: 'Invalid or expired code — please try again.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication failed. Please try again.' }

  return resolvePostAuthRedirect(user.id, supabase)
}

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
  const passwordParsed = passwordSchema.safeParse(password)
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
    phone:            user.phone ?? '',
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
