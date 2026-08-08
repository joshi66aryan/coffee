import { test, expect } from '@playwright/test'

// Pure HTTP — no browser binary needed. The unauthenticated redirect for /admin
// itself is already covered in onboarding.spec.ts; this confirms the new sort/dir
// query params and the order detail route don't bypass that check. Authenticated
// happy-path coverage for the queue and detail views lives in the component tests
// (tests/components/admin/*.test.tsx), since it requires a seeded admin session
// that isn't available in this environment.
test.describe('Admin orders — unauthenticated routing', () => {
  test('GET /admin/orders with sort params still redirects to /login', async ({ request }) => {
    const response = await request.get('/admin/orders?sort=total_amount&dir=asc', { maxRedirects: 0 })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })

  test('GET /admin/orders with status and date-range filters still redirects to /login', async ({ request }) => {
    const response = await request.get('/admin/orders?status=confirmed&from=2026-08-01&to=2026-08-06', {
      maxRedirects: 0,
    })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })

  test('GET /admin/orders/:id redirects to /login', async ({ request }) => {
    const response = await request.get('/admin/orders/00000000-0000-0000-0000-000000000000', {
      maxRedirects: 0,
    })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers()['location']).toContain('/login')
  })
})
