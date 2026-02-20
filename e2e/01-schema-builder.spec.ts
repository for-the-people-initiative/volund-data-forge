import { test, expect } from '@playwright/test'
import { uniqueName, waitForAppReady } from './helpers'

test.describe('Flow 1: Schema Builder', () => {
  test('create a new collection with 3 fields', async ({ page }) => {
    const collectionName = uniqueName('taken')

    // Navigate to builder
    await page.goto('/builder')
    await waitForAppReady(page)

    // Click "+ Nieuw" to create a new collection
    await page.getByRole('button', { name: /nieuw/i }).first().click()

    // Set collection name
    const nameInput = page.locator('.sb-editor__input')
    await expect(nameInput).toBeVisible({ timeout: 5000 })
    await nameInput.fill(collectionName)
    await nameInput.blur()

    // --- Add field 1: titel (text) ---
    await page.getByRole('button', { name: /veld toevoegen/i }).click()
    // FieldTypePicker: click "Tekst" type button
    await page.getByRole('button', { name: /tekst/i }).first().click()
    // Fill field name in drawer
    await page.locator('.sb-drawer__input').first().fill('titel')
    await page.locator('.sb-drawer').getByRole('button', { name: /opslaan/i }).click()

    // --- Add field 2: beschrijving (text) ---
    await page.getByRole('button', { name: /veld toevoegen/i }).click()
    await page.getByRole('button', { name: /tekst/i }).first().click()
    await page.locator('.sb-drawer__input').first().fill('beschrijving')
    await page.locator('.sb-drawer').getByRole('button', { name: /opslaan/i }).click()

    // --- Add field 3: prioriteit (select with options) ---
    await page.getByRole('button', { name: /veld toevoegen/i }).click()
    await page.getByRole('button', { name: /selectie/i }).first().click()
    await page.locator('.sb-drawer__input').first().fill('prioriteit')

    // Add select options using the SelectOptionsEditor
    const optionInput = page.locator('.sb-options__input')
    for (const opt of ['laag', 'midden', 'hoog']) {
      await optionInput.fill(opt)
      await optionInput.press('Enter')
    }
    // Verify options were added
    await expect(page.locator('.sb-options__item')).toHaveCount(3)

    await page.locator('.sb-drawer').getByRole('button', { name: /opslaan/i }).click()

    // Verify 3 fields in the field list
    await expect(page.locator('.sb-field')).toHaveCount(3)

    // Save the collection
    await page.getByRole('button', { name: /collectie aanmaken/i }).click()

    // Verify success feedback
    await expect(
      page.locator('.sb-feedback--success').or(page.getByText(/opgeslagen|aangemaakt/i))
    ).toBeVisible({ timeout: 10000 })

    // Verify collection appears in sidebar navigation
    const sidebar = page.locator('#sidebar-nav, .de-layout__sidebar')
    await expect(sidebar.getByText(collectionName)).toBeVisible({ timeout: 5000 })
  })
})
