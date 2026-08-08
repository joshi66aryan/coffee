import { test, expect } from '@playwright/test'

// Pure HTTP — no browser binary needed. Authenticated happy-path coverage for the
// café detail view (per-café pricing, credit toggle) lives in the component tests
// (tests/components/admin/cafe-pricing-table.test.tsx, cafe-credit-toggle.test.tsx),
// since it requires a seeded admin session that isn't available in this environment.
test.describe('Admin café detail — unauthenticated routing', () => {
  test('GET /admin/cafes/:id redirects to /login', async ({ request }) => {
    const response = await request.get('/admin/cafes/00000000-0000-0000-0000-000000000000', {
      maxRedirects: 0,
    })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })
})
