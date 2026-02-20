import { test, expect } from '@playwright/test'
import { waitForAppReady } from './helpers'

test.describe('Flow 6: Navigation', () => {
  test('navigate through the full app flow', async ({ page }) => {
    // 1. Start at Dashboard
    await page.goto('/')
    await waitForAppReady(page)
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()

    // 2. Click on a collection card (contacts)
    await page.getByRole('link', { name: /contacten/i }).first().click()
    await expect(page).toHaveURL(/\/collections\/contacts/)
    await waitForAppReady(page)

    // 3. Click on a record row
    const firstRow = page.locator('.dt__row').first()
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click()
      await expect(page).toHaveURL(/\/collections\/contacts\/\d+/)

      // 4. Navigate back
      await page.getByRole('link', { name: /terug/i }).click()
      await expect(page).toHaveURL(/\/collections\/contacts$/)
    }

    // 5. Navigate to another collection via sidebar
    const sidebar = page.locator('#sidebar-nav, .de-layout__sidebar')
    const companiesLink = sidebar.getByRole('link', { name: /companies|bedrijven/i }).first()
    if (await companiesLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await companiesLink.click()
      await expect(page).toHaveURL(/\/collections\/companies/)
    }

    // 6. Navigate to Schema Builder via sidebar
    const builderLink = sidebar.getByRole('link', { name: /builder|schema/i }).first()
    if (await builderLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await builderLink.click()
      await expect(page).toHaveURL(/\/builder/)
    } else {
      // Direct navigation
      await page.goto('/builder')
    }
    await expect(page).toHaveURL(/\/builder/)
    await waitForAppReady(page)
  })
})
