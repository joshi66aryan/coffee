import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { headerStore } = vi.hoisted(() => ({ headerStore: new Map<string, string>() }))

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
  }),
}))

import { getSiteOrigin } from '@/lib/site-url'

const ORIGINAL = process.env.SITE_URL

beforeEach(() => {
  headerStore.clear()
  delete process.env.SITE_URL
  delete process.env.NEXT_PUBLIC_SITE_URL
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SITE_URL
  else process.env.SITE_URL = ORIGINAL
  delete process.env.NEXT_PUBLIC_SITE_URL
})

describe('getSiteOrigin', () => {
  it('prefers the configured origin over anything in the request', async () => {
    process.env.SITE_URL = 'https://orderfromsherpasips.com'
    headerStore.set('x-forwarded-host', 'attacker.example')
    expect(await getSiteOrigin()).toBe('https://orderfromsherpasips.com')
  })

  it('strips trailing slashes, so the callback path cannot end up doubled', async () => {
    process.env.SITE_URL = 'https://orderfromsherpasips.com///'
    expect(await getSiteOrigin()).toBe('https://orderfromsherpasips.com')
  })

  it('ignores a blank value rather than returning an empty origin', async () => {
    process.env.SITE_URL = '   '
    headerStore.set('x-forwarded-host', 'preview.vercel.app')
    headerStore.set('x-forwarded-proto', 'https')
    expect(await getSiteOrigin()).toBe('https://preview.vercel.app')
  })

  it('reads SITE_URL, not the NEXT_PUBLIC_ name it used to have', async () => {
    // The prefix was dropped so the value stays out of the client bundle. If
    // only the old name is set, it must be ignored — silently honouring it
    // would hide a half-finished rename in someone's deployment config.
    process.env.NEXT_PUBLIC_SITE_URL = 'https://stale.example'
    headerStore.set('x-forwarded-host', 'orderfromsherpasips.com')
    expect(await getSiteOrigin()).toBe('https://orderfromsherpasips.com')
  })

  it('falls back to the forwarded host for preview deployments', async () => {
    headerStore.set('x-forwarded-host', 'coffee-git-branch.vercel.app')
    headerStore.set('x-forwarded-proto', 'https')
    expect(await getSiteOrigin()).toBe('https://coffee-git-branch.vercel.app')
  })

  it('falls back to the plain host header when nothing is forwarded', async () => {
    headerStore.set('host', 'orderfromsherpasips.com')
    expect(await getSiteOrigin()).toBe('https://orderfromsherpasips.com')
  })

  it('assumes http for localhost, https for everything else', async () => {
    headerStore.set('host', 'localhost:3000')
    expect(await getSiteOrigin()).toBe('http://localhost:3000')
  })

  it('returns the dev origin when there is no host at all', async () => {
    expect(await getSiteOrigin()).toBe('http://localhost:3000')
  })
})
