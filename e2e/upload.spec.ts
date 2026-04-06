import { test, expect } from '@playwright/test'

/**
 * File upload E2E tests.
 *
 * Tests the UploadCourse form interaction. API calls are intercepted and
 * mocked at the network level — no real Inngest events are fired.
 */

const isDeployed = !!process.env.PLAYWRIGHT_BASE_URL && !process.env.PLAYWRIGHT_BASE_URL.includes('localhost')

test.describe('UploadCourse form', () => {
  test.skip(isDeployed, 'Auth mocking requires local dev server — server-side Supabase auth cannot be intercepted by browser route mocking')

  test.beforeEach(async ({ page }) => {
    // Mock auth to let the page load
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 'user-1', email: 'admin@school.com', role: 'authenticated' }),
      })
    })

    // Mock the ingest API so we don't need Inngest or a DB
    await page.route('**/api/ingest', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ jobId: 'queued', message: 'Course generation queued successfully' }),
        headers: { 'Content-Type': 'application/json' },
      })
    })

    await page.goto('/dashboard/admin')
    await page.waitForSelector('[data-slot="card"]', { timeout: 10_000 })
  })

  test('shows success message after form submission', async ({ page }) => {
    await page.fill('input[id="courseName"]', 'AP Computer Science')
    await page.fill('input[id="gradeLevel"]', '11')

    // Create a minimal xlsx-like file buffer (just enough to satisfy the file input)
    const buffer = Buffer.from('fake-xlsx-data')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'curriculum.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    })

    await page.click('button[type="submit"]')

    await expect(page.getByText(/upload successful/i)).toBeVisible({ timeout: 10_000 })
  })

  test('shows error when required fields are missing', async ({ page }) => {
    // Submit without filling in any fields
    await page.click('button[type="submit"]')
    await expect(page.getByText(/please fill in all fields/i)).toBeVisible({ timeout: 5_000 })
  })

  test('shows network error message when API returns 429', async ({ page }) => {
    // Override the ingest mock for this test only
    await page.route('**/api/ingest', (route) => {
      route.fulfill({
        status: 429,
        body: JSON.stringify({ error: 'Too many requests. Please wait before uploading again.' }),
        headers: { 'Content-Type': 'application/json' },
      })
    })

    await page.fill('input[id="courseName"]', 'Biology 101')
    await page.fill('input[id="gradeLevel"]', '9')

    const buffer = Buffer.from('fake-data')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'bio.csv',
      mimeType: 'text/csv',
      buffer,
    })

    await page.click('button[type="submit"]')
    await expect(page.getByText(/too many requests/i)).toBeVisible({ timeout: 5_000 })
  })
})
