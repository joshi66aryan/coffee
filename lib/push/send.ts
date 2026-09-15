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
  /**
   * Path on the sending deployment that the notification should open. Made
   * absolute against that deployment's own origin before it goes on the wire:
   * the service worker resolves a relative url against *its* origin, which
   * handed the decision to whichever browser displayed the notification rather
   * than the one the order was placed on.
   */
  path?: string
}

interface SubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth_key: string
  origin: string | null
}

// A browser reaching one of these is talking to a server on the machine it is
// running on. Matches the service worker's own local-dev check (public/sw.js).
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]']

export function isLocalOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    return LOCAL_HOSTNAMES.includes(new URL(origin).hostname)
  } catch {
    // Not a url at all — nothing that came from getSiteOrigin. Whatever it is,
    // it is not this machine.
    return false
  }
}

/**
 * Whether a stored subscription belongs to the deployment doing the sending.
 *
 * One Supabase project sits behind both local development and production, so
 * this table is shared: without this, a laptop running `npm run dev` notified
 * real cafés' phones about test orders placed in their name, and a real order
 * rang a developer's localhost tab.
 *
 * The two directions are deliberately not symmetrical. A dev server speaks only
 * to browsers on its own machine — it has no business reaching a phone, and an
 * unknown origin is not worth the risk. Production keeps notifying rows whose
 * origin is unknown (everything created before migration 015), because
 * silently dropping a café's notifications is far worse than a developer
 * seeing one extra: those rows are almost all real devices, and they stamp
 * themselves the next time the browser re-subscribes.
 */
export function belongsToDeployment(
  subscriptionOrigin: string | null,
  deploymentOrigin: string,
): boolean {
  if (isLocalOrigin(deploymentOrigin)) return isLocalOrigin(subscriptionOrigin)
  return !isLocalOrigin(subscriptionOrigin)
}

async function sendToSubscriptions(
  rows: SubscriptionRow[],
  payload: PushPayload,
  origin: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  // Filtered here rather than in the query: the rule is one readable predicate
  // over a handful of rows (the admins, or one café's devices), and expressing
  // it as a PostgREST `or` string would scatter it across both call sites.
  const targets = rows.filter(row => belongsToDeployment(row.origin, origin))

  const elsewhere = rows.length - targets.length
  if (elsewhere > 0) {
    logger.info('Push subscriptions skipped — they belong to another deployment', {
      skipped: elsewhere,
      origin,
      ...context,
    })
  }

  if (targets.length === 0) {
    logger.warn('No push subscriptions to notify', { title: payload.title, origin, ...context })
    return
  }
  if (!configureVapid()) return

  const admin = createAdminClient()
  const wire = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: `${origin}${payload.path ?? '/'}`,
  })

  await Promise.all(
    targets.map(async row => {
      try {
        const result = await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_key } },
          wire,
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

/**
 * `origin` is this deployment's own origin, from getSiteOrigin. Passed in
 * rather than read here because both call sites defer the send with `after()`,
 * and getSiteOrigin reads request headers when SITE_URL is unset — resolving it
 * while the request is still being handled keeps that off whatever request
 * context a deferred callback does or does not retain.
 */
export async function sendPushToAdmins(payload: PushPayload, origin: string): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key, origin')
    .eq('role', 'admin')
    .returns<SubscriptionRow[]>()

  if (error) {
    logger.error('Failed to load admin push subscriptions', { msg: error.message })
    return
  }

  await sendToSubscriptions(data ?? [], payload, origin, { scope: 'admins' })
}

/** See sendPushToAdmins for `origin`. */
export async function sendPushToCafe(
  cafeId: string,
  payload: PushPayload,
  origin: string,
): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key, origin')
    .eq('user_id', cafeId)
    .eq('role', 'cafe')
    .returns<SubscriptionRow[]>()

  if (error) {
    logger.error('Failed to load café push subscriptions', { cafeId, msg: error.message })
    return
  }

  await sendToSubscriptions(data ?? [], payload, origin, { cafeId })
}
