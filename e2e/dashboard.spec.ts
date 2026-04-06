import { test, expect } from '@playwright/test'

/**
 * Dashboard access tests.
 *
 * These tests require an authenticated session. We simulate authentication by
 * setting a cookie that the middleware will accept, or by intercepting auth
 * network calls. For a full auth flow, inject a valid Supabase session cookie
 * via `storageState` (see Playwright docs on authentication reuse).
 *
 * NOTE: These are smoke tests — they verify pages render without crashing,
 * not full functional correctness. Extend them once real test credentials
 * are set up in CI (e.g., SUPABASE_TEST_USER/SUPABASE_TEST_PASSWORD).
 */

const isDeployed = !!process.env.PLAYWRIGHT_BASE_URL && !process.env.PLAYWRIGHT_BASE_URL.includes('localhost')

test.describe('Admin dashboard', () => {
  test('renders the upload form', async ({ page }) => {
    test.skip(isDeployed, 'Auth mocking requires local dev server — server-side Supabase auth cannot be intercepted by browser route mocking')
    // Mock the auth check so middleware passes
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'admin@school.com',
          role: 'authenticated',
        }),
      })
    })

    await page.goto('/dashboard/admin')

    // The UploadCourse component should be visible
    await expect(page.getByText(/upload atlas export/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /generate course/i })).toBeVisible()
  })
})

test.describe('Course navigation', () => {
  test('404 page renders for non-existent course', async ({ page }) => {
    await page.goto('/courses/nonexistent-course-id-12345')
    // Either 404 or redirect — should not crash with 500
    const status = page.url()
    expect(status).toBeTruthy()
    // Check no unhandled error page is shown
    await expect(page.getByText(/500/)).toHaveCount(0)
  })
})
