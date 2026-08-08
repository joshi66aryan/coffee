import { test, expect } from '@playwright/test'

// Pure HTTP — no browser binary needed. The base /admin unauthenticated redirect
// is already covered in onboarding.spec.ts; this confirms /admin now serves the
// dashboard (not the orders queue) without bypassing that check. Authenticated
// happy-path coverage for the stat cards and top products table lives in the
// component tests (tests/components/admin/*.test.tsx), since it requires a seeded
// admin session that isn't available in this environment.
test.describe('Admin dashboard — unauthenticated routing', () => {
  test('GET /admin redirects to /login', async ({ request }) => {
    const response = await request.get('/admin', { maxRedirects: 0 })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })
})
