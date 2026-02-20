import { test, expect } from '@playwright/test'
import { waitForAppReady } from './helpers'

test.describe('Flow 2: Data Entry', () => {
  test('create a new contact record', async ({ page }) => {
    // Navigate to contacts collection
    await page.goto('/collections/contacts')
    await waitForAppReady(page)

    // Click "+ Nieuw" button
    await page.getByRole('link', { name: /nieuw/i }).first().click()
    await waitForAppReady(page)

    // Fill in form fields — contacts likely has name/email/status fields
    // Find all visible text inputs in the form and fill them
    const form = page.locator('.data-form')
    await expect(form).toBeVisible({ timeout: 10000 })

    // Fill name field (first text input typically)
    const nameInput = form.locator('input[type="text"]').first()
    await nameInput.fill('E2E Test Contact')

    // Try to fill email if it exists
    const emailInput = form.locator('input[type="email"]')
    if (await emailInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await emailInput.fill('e2e@test.com')
    }

    // Submit the form
    await page.getByRole('button', { name: /aanmaken/i }).click()

    // Should navigate to the record detail page
    await expect(page).toHaveURL(/\/collections\/contacts\/\d+/, { timeout: 10000 })
  })
})
