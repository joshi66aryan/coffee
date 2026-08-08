import { test, expect } from '@playwright/test'

// Pure HTTP — no browser binary needed. Authenticated happy-path coverage for
// the order history list lives in the component test (tests/components/cafe/order-history-list.test.tsx),
// since it requires a seeded Supabase café that isn't available in this environment.
test.describe('Profile orders — unauthenticated routing', () => {
  test('GET /profile/orders redirects to /login', async ({ request }) => {
    const response = await request.get('/profile/orders', { maxRedirects: 0 })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })

  test('GET /profile/orders?filter=unpaid redirects to /login', async ({ request }) => {
    const response = await request.get('/profile/orders?filter=unpaid', { maxRedirects: 0 })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })
})
