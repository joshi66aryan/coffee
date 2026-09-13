import { test, expect } from '@playwright/test'

// Authorization at the edge of the running app.
//
// The existing specs cover what a café can *do* once it is signed in. These
// cover what anyone can reach before that, and what an authenticated café is
// turned away from — the boundary the unit tests assert in isolation, checked
// here against the real proxy, the real routes and the real headers.
//
// Everything in the first three describes is pure HTTP (the `request` fixture),
// so it needs no browser binary.

const CAFE_ROUTES = [
  '/',
  '/catalog',
  '/order/confirm',
  '/orders',
  '/profile',
  '/profile/orders',
  '/settings',
  '/settings/app',
  '/onboarding',
  '/pending',
  '/reset-password',
]

const ADMIN_ROUTES = [
  '/admin',
  '/admin/cafes',
  '/admin/orders',
  '/admin/payments',
  '/admin/products',
  '/admin/products/new',
]

test.describe('Unauthenticated — every protected route is closed', () => {
  for (const route of [...CAFE_ROUTES, ...ADMIN_ROUTES]) {
    test(`${route} redirects to /login`, async ({ request }) => {
      const response = await request.get(route, { maxRedirects: 0 })

      expect(response.status()).toBeGreaterThanOrEqual(300)
      expect(response.status()).toBeLessThan(400)
      expect(response.headers()['location']).toContain('/login')
    })
  }

  test('an admin route does not leak that it exists by answering differently', async ({ request }) => {
    const admin = await request.get('/admin/cafes', { maxRedirects: 0 })
    const cafe = await request.get('/orders', { maxRedirects: 0 })

    expect(admin.status()).toBe(cafe.status())
  })

  test('the café status API answers 401 rather than redirecting', async ({ request }) => {
    const response = await request.get('/api/cafe/status', { maxRedirects: 0 })

    expect(response.status()).toBe(401)
    expect(await response.json()).toEqual({ status: null })
  })

  test('a deep admin link with a guessed id still only reaches /login', async ({ request }) => {
    const response = await request.get('/admin/cafes/11111111-1111-4111-8111-111111111111', {
      maxRedirects: 0,
    })

    expect(response.headers()['location']).toContain('/login')
  })
})

test.describe('Auth callback routes cannot be pushed off-site', () => {
  test('/auth/confirm with no token sends the visitor back to sign in', async ({ request }) => {
    const response = await request.get('/auth/confirm', { maxRedirects: 0 })

    expect(response.headers()['location']).toContain('/login?error=link')
  })

  test('/auth/confirm will not follow an absolute next', async ({ request, baseURL }) => {
    const response = await request.get(
      '/auth/confirm?token_hash=bogus&type=recovery&next=https%3A%2F%2Fevil.example',
      { maxRedirects: 0 },
    )

    const location = response.headers()['location'] ?? ''
    expect(location).not.toContain('evil.example')
    // Resolved against the request's own origin, not a hardcoded port — the
    // dev server moves when 3000 is taken.
    expect(new URL(location, baseURL).origin).toBe(new URL(baseURL!).origin)
  })

  test('/auth/confirm will not follow a protocol-relative next', async ({ request }) => {
    const response = await request.get(
      '/auth/confirm?token_hash=bogus&type=recovery&next=%2F%2Fevil.example',
      { maxRedirects: 0 },
    )

    const location = response.headers()['location'] ?? ''
    expect(location).not.toContain('evil.example')
  })

  test('/auth/callback with no code reports the failure without a session', async ({ request }) => {
    const response = await request.get('/auth/callback', { maxRedirects: 0 })

    expect(response.headers()['location']).toContain('/login?error=oauth')
    // Nothing that looks like a Supabase session cookie may come back.
    const cookies = response.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie')
    expect(cookies.some(c => c.value.includes('auth-token'))).toBe(false)
  })
})

test.describe('Security headers are present on the routes people actually land on', () => {
  for (const route of ['/login', '/terms', '/offline']) {
    test(`${route} carries the CSP and transport headers`, async ({ request }) => {
      const headers = (await request.get(route)).headers()

      expect(headers['content-security-policy']).toContain("default-src 'self'")
      expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
      expect(headers['content-security-policy']).toContain("form-action 'self'")
      expect(headers['content-security-policy']).toContain("object-src 'none'")
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['x-frame-options']).toBe('DENY')
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
      expect(headers['strict-transport-security']).toContain('max-age=')
    })
  }

  test('a redirect away from a protected route is not cached by anything in between', async ({ request }) => {
    const response = await request.get('/orders', { maxRedirects: 0 })

    const cacheControl = response.headers()['cache-control'] ?? ''
    expect(cacheControl).not.toContain('public')
  })
})

// ── Signed-in boundaries ─────────────────────────────────────────────────────
//
// These need a real browser and a real café account on whatever database the
// dev server is pointed at. Set them up once and export:
//
//   E2E_CAFE_EMAIL=... E2E_CAFE_PASSWORD=... PLAYWRIGHT_BROWSER_AVAILABLE=1 \
//     npx playwright test e2e/authorization.spec.ts --project=chromium
//
// The account must be an approved (`status = 'active'`) café, and deliberately
// *not* an admin — the point is what it cannot reach.
test.describe('A signed-in café cannot cross into admin', () => {
  const email = process.env.E2E_CAFE_EMAIL
  const password = process.env.E2E_CAFE_PASSWORD

  test.skip(
    !process.env.PLAYWRIGHT_BROWSER_AVAILABLE || !email || !password,
    'Skipped: needs a browser binary and E2E_CAFE_EMAIL / E2E_CAFE_PASSWORD for an approved café account',
  )

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/^email$/i).fill(email!)
    await page.getByLabel('Password', { exact: true }).fill(password!)
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15_000 })
  })

  for (const route of ADMIN_ROUTES) {
    test(`${route} bounces back to the café side`, async ({ page }) => {
      await page.goto(route)

      await expect(page).not.toHaveURL(/\/admin/)
    })
  }

  test('the admin surface is not merely hidden in the markup', async ({ page }) => {
    await page.goto('/admin/cafes')

    // If the gate were client-side only, the admin table would be in the
    // payload even though it is not displayed.
    const html = await page.content()
    expect(html).not.toContain('Pending Approval')
  })

  test('signing out makes the back button useless', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: /sign out/i }).click()
    await page.waitForURL('**/login', { timeout: 15_000 })

    await page.goBack()

    // `no-store` on authenticated pages is what stops the browser serving the
    // previous render out of bfcache here.
    await expect(page).toHaveURL(/\/login/)
  })
})
