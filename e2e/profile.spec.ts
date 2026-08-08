import { test, expect } from '@playwright/test'

// Pure HTTP — no browser binary needed. Authenticated happy-path coverage for
// profile editing lives in the component test (tests/components/cafe/profile-form.test.tsx),
// since it requires a seeded Supabase café that isn't available in this environment.
test.describe('Profile — unauthenticated routing', () => {
  test('GET /profile redirects to /login', async ({ request }) => {
    const response = await request.get('/profile', { maxRedirects: 0 })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })
})
