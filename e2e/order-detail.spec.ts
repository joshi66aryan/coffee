import { test, expect } from '@playwright/test'

// Pure HTTP — no browser binary needed. Authenticated happy-path coverage for
// order detail rendering lives in the component test (tests/components/cafe/order-detail-view.test.tsx),
// since it requires a seeded Supabase order that isn't available in this environment.
test.describe('Order detail — unauthenticated routing', () => {
  test('GET /orders/:id redirects to /login', async ({ request }) => {
    const response = await request.get('/orders/00000000-0000-0000-0000-000000000000', {
      maxRedirects: 0,
    })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })
})
