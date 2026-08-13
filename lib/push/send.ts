import webpush, { WebPushError } from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import logger from '@/lib/logger'

let vapidConfigured: boolean | null = null

// Configured lazily rather than at module scope: importing this module must not
// throw when the VAPID vars are absent, or the build fails while collecting
// page data for any route that reaches it.
function configureVapid(): boolean {
  if (vapidConfigured !== null) return vapidConfigured

  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!subject || !publicKey || !privateKey) {
    logger.error('Push disabled — missing VAPID configuration', {
      hasSubject: Boolean(subject),
      hasPublicKey: Boolean(publicKey),
      hasPrivateKey: Boolean(privateKey),
    })
    vapidConfigured = false
    return false
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidConfigured = true
  } catch (err) {
    logger.error('Push disabled — invalid VAPID configuration', {
      msg: err instanceof Error ? err.message : String(err),
    })
    vapidConfigured = false
  }

  return vapidConfigured
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

interface SubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth_key: string
}

async function sendToSubscriptions(
  rows: SubscriptionRow[],
  payload: PushPayload,
  context: Record<string, unknown> = {},
): Promise<void> {
  if (rows.length === 0) {
    logger.warn('No push subscriptions to notify', { title: payload.title, ...context })
    return
  }
  if (!configureVapid()) return

  const admin = createAdminClient()

  await Promise.all(
    rows.map(async row => {
      try {
        const result = await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_key } },
          JSON.stringify(payload),
          { timeout: 5000 },
        )
        logger.info('Push sent', { endpoint: row.endpoint, statusCode: result.statusCode, title: payload.title, ...context })
      } catch (err) {
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          const { error } = await admin.from('push_subscriptions').delete().eq('id', row.id)
          if (error) {
            logger.error('Failed to remove expired push subscription', { id: row.id, msg: error.message })
          }
        } else {
          logger.error('Push send failed', {
            endpoint: row.endpoint,
            msg: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }),
  )
}

export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('role', 'admin')
    .returns<SubscriptionRow[]>()

  if (error) {
    logger.error('Failed to load admin push subscriptions', { msg: error.message })
    return
  }

  await sendToSubscriptions(data ?? [], payload, { scope: 'admins' })
}

export async function sendPushToCafe(cafeId: string, payload: PushPayload): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('user_id', cafeId)
    .eq('role', 'cafe')
    .returns<SubscriptionRow[]>()

  if (error) {
    logger.error('Failed to load café push subscriptions', { cafeId, msg: error.message })
    return
  }

  await sendToSubscriptions(data ?? [], payload, { cafeId })
}
