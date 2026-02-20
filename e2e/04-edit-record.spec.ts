import { test, expect } from '@playwright/test'
import { waitForAppReady } from './helpers'

test.describe('Flow 4: Edit Record', () => {
  test('edit an existing contact record', async ({ page }) => {
    await page.goto('/collections/contacts')
    await waitForAppReady(page)

    // Wait for table and click first row
    await expect(page.locator('.dt__row').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.dt__row').first().click()

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/collections\/contacts\/\d+/)
    await waitForAppReady(page)

    // Click "Bewerken" button
    await page.getByRole('button', { name: /bewerken/i }).click()

    // Form should appear
    const form = page.locator('.data-form')
    await expect(form).toBeVisible({ timeout: 5000 })

    // Edit the first text input
    const firstInput = form.locator('input[type="text"]').first()
    const originalValue = await firstInput.inputValue()
    const newValue = `Updated ${Date.now().toString(36)}`
    await firstInput.fill(newValue)

    // Save
    await page.getByRole('button', { name: /opslaan/i }).click()

    // Should return to detail view (form gone)
    await expect(form).not.toBeVisible({ timeout: 10000 })

    // Verify the updated value is shown in detail view
    await expect(page.locator('.detail-list').getByText(newValue)).toBeVisible()
  })
})
