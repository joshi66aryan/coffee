import { test, expect } from '@playwright/test'

// Pure HTTP — no browser binary needed. Authenticated happy-path coverage for
// settings editing lives in the component tests (tests/components/cafe/profile-form.test.tsx,
// change-password-form.test.tsx), since it requires a seeded Supabase café that isn't
// available in this environment.
test.describe('Settings — unauthenticated routing', () => {
  test('GET /settings redirects to /login', async ({ request }) => {
    const response = await request.get('/settings', { maxRedirects: 0 })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })

  test('GET /settings/app redirects to /login', async ({ request }) => {
    const response = await request.get('/settings/app', { maxRedirects: 0 })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })
})
