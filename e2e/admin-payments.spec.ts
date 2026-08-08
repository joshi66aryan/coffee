import { test, expect } from '@playwright/test'

// Pure HTTP — no browser binary needed. Authenticated happy-path coverage for
// the payments table and payment status toggle lives in the component tests
// (tests/components/admin/order-queue-table.test.tsx, payment-status-toggle.test.tsx),
// since it requires a seeded admin session that isn't available in this environment.
test.describe('Admin payments — unauthenticated routing', () => {
  test('GET /admin/payments redirects to /login', async ({ request }) => {
    const response = await request.get('/admin/payments', { maxRedirects: 0 })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })

  test('GET /admin/payments with filter/sort params still redirects to /login', async ({ request }) => {
    const response = await request.get('/admin/payments?filter=paid&sort=total_amount&dir=desc', {
      maxRedirects: 0,
    })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })
})
