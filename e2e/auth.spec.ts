import { test, expect } from '@playwright/test'

/**
 * Authentication flow tests.
 *
 * These run against the live dev server. Supabase OAuth is mocked at the
 * network level using Playwright's route interception so we never need real
 * credentials in CI.
 */

test.describe('Login & redirect flow', () => {
  test('unauthenticated user is redirected to /login from protected route', async ({ page }) => {
    // Intercept the Supabase auth/getUser call to return no user
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'not authenticated' }) })
    })

    await page.goto('/dashboard/admin')
    // Middleware should redirect to /login
    await expect(page).toHaveURL(/\/login/)
  })

  test('/login page renders the email sign-in form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible()
  })

  test('root path redirects unauthenticated users to /login', async ({ page }) => {
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'not authenticated' }) })
    })

    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})
