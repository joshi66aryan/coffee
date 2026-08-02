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

  test('shows +977 prefix and disabled Send Code button', async ({ page }) => {
    await expect(page.getByText('+977')).toBeVisible()
    await expect(page.getByRole('button', { name: /send code/i })).toBeDisabled()
  })

  test('Send Code enables after typing a phone number', async ({ page }) => {
    await page.getByLabel(/phone number/i).fill('9841234567')
    await expect(page.getByRole('button', { name: /send code/i })).toBeEnabled()
  })

  test('shows a validation error for an invalid phone', async ({ page }) => {
    await page.getByLabel(/phone number/i).fill('12')
    await page.getByRole('button', { name: /send code/i }).click()
    await expect(page.locator('p.text-red-600')).toBeVisible({ timeout: 5000 })
  })

  test('OTP step appears after a successful send', async ({ page }) => {
    // Uses Supabase test phone — configure +9779800000000 with token 123456
    await page.getByLabel(/phone number/i).fill('9800000000')
    await page.getByRole('button', { name: /send code/i }).click()
    await expect(page.getByLabel(/verification code/i)).toBeVisible({ timeout: 10000 })
  })
})
