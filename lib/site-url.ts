import { headers } from 'next/headers'

/**
 * The public origin of this deployment, for links Supabase will send by email.
 *
 * Every Supabase auth email (confirm sign-up, password recovery) embeds a
 * redirect target. Left unset, Supabase falls back to the project's Site URL —
 * which on most projects is still whatever it was during local development. A
 * production sign-up then receives a confirmation link pointing at
 * http://localhost:3000, and the person who clicks it lands on nothing.
 *
 * `NEXT_PUBLIC_SITE_URL` is the answer whenever it is set, because it is the
 * only source here that an incoming request cannot influence. The forwarded
 * host is a fallback for preview deployments, where the hostname is generated
 * and cannot be baked into an env var.
 *
 * Host-header injection is not a redirect risk in this direction: Supabase only
 * honours a redirect target that matches its own configured allow-list, so a
 * forged host is rejected there rather than followed. Set the env var anyway —
 * it is one fewer thing resting on that.
 */
export async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  if (!host) return 'http://localhost:3000'

  const protocol =
    headerList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')

  return `${protocol}://${host}`
}
