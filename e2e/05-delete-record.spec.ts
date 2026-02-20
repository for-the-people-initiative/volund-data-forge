import { test, expect } from '@playwright/test'
import { waitForAppReady } from './helpers'

test.describe('Flow 5: Delete Record', () => {
  test('delete a record from detail page', async ({ page }) => {
    await page.goto('/collections/contacts')
    await waitForAppReady(page)

    // Wait for table rows
    await expect(page.locator('.dt__row').first()).toBeVisible({ timeout: 10000 })
    const initialCount = await page.locator('.dt__row').count()

    // Click first row to go to detail
    await page.locator('.dt__row').first().click()
    await expect(page).toHaveURL(/\/collections\/contacts\/\d+/)

    // Click "Verwijderen" button
    await page.getByRole('button', { name: /verwijderen/i }).click()

    // Confirmation dialog should appear
    const dialog = page.locator('.delete-dialog')
    await expect(dialog).toBeVisible()

    // Confirm deletion
    await dialog.getByRole('button', { name: /verwijderen/i }).click()

    // Should redirect back to collection list
    await expect(page).toHaveURL(/\/collections\/contacts$/, { timeout: 10000 })

    // Verify record count decreased (or table updated)
    await waitForAppReady(page)
    const newCount = await page.locator('.dt__row').count()
    expect(newCount).toBeLessThan(initialCount)
  })
})
