import { test, expect } from '@playwright/test'

// Redirect tests use the `request` fixture (pure HTTP, no browser binary needed).
// UI interaction tests use `page` and require a real browser — they are skipped
// in environments where no browser is available.

test.describe('Unauthenticated routing — proxy redirects', () => {
  const protectedRoutes = ['/', '/onboarding', '/pending', '/admin']

  for (const route of protectedRoutes) {
    test(`${route} redirects to /login`, async ({ request }) => {
      const response = await request.get(route, { maxRedirects: 0 })
      expect(response.status()).toBeGreaterThanOrEqual(300)
      expect(response.status()).toBeLessThan(400)
      const location = response.headers()['location']
      expect(location).toContain('/login')
    })
  }
})

test.describe('Login page — HTTP', () => {
  test('GET /login returns 200', async ({ request }) => {
    const response = await request.get('/login')
    expect(response.status()).toBe(200)
  })

  test('response contains Sherpa Sips brand text', async ({ request }) => {
    const html = await (await request.get('/login')).text()
    expect(html).toContain('Sherpa Sips')
  })
})

// Browser-dependent tests — run locally with `npx playwright install` first.
test.describe('Login page — browser UI', () => {
  test.skip(!!process.env.CI || !process.env.PLAYWRIGHT_BROWSER_AVAILABLE,
    'Skipped: requires browser binary. Run `npx playwright install` then set PLAYWRIGHT_BROWSER_AVAILABLE=1')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows the Google sign-in button and email/password fields', async ({ page }) => {
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    await expect(page.getByLabel(/^email$/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
  })

  test('Sign in is disabled until both fields are filled', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeDisabled()
    await page.getByLabel(/^email$/i).fill('cafe@example.com')
    await page.getByLabel(/^password$/i).fill('password123')
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeEnabled()
  })

  test('shows a validation error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/^email$/i).fill('cafe@example.com')
    await page.getByLabel(/^password$/i).fill('wrongpassword')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
  })

  test('switching to sign-up via the toggle phrase shows live password strength feedback', async ({ page }) => {
    await page.getByRole('button', { name: /don't have an account\? sign up/i }).click()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()

    await page.getByLabel(/^password$/i).fill('weak')
    await expect(page.getByText(/too weak/i)).toBeVisible()

    await page.getByLabel(/^password$/i).fill('Str0ng!Password')
    await expect(page.getByText(/^strong$/i)).toBeVisible()
  })
})
