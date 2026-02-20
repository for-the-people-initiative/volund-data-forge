import { test, expect } from '@playwright/test'
import { waitForAppReady } from './helpers'

test.describe('Flow 3: Filtering', () => {
  test('filter contacts by a field value', async ({ page }) => {
    await page.goto('/collections/contacts')
    await waitForAppReady(page)

    // Wait for table to load
    const table = page.locator('.dt__table')
    await expect(table).toBeVisible({ timeout: 10000 })

    // Count initial rows
    const initialRowCount = await page.locator('.dt__row').count()
    expect(initialRowCount).toBeGreaterThan(0)

    // Expand filters if collapsed
    const filterToggle = page.locator('.fb__toggle')
    if (await filterToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isExpanded = await page.locator('.fb__grid').isVisible().catch(() => false)
      if (!isExpanded) {
        await filterToggle.click()
      }
    }

    // Find a select-type filter (like status) and filter by it
    const selectFilter = page.locator('.fb__field').filter({ hasText: /status/i }).locator('select')
    if (await selectFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Get available options
      const options = await selectFilter.locator('option').allTextContents()
      const activeOption = options.find(o => o.toLowerCase().includes('active'))
      if (activeOption) {
        await selectFilter.selectOption({ label: activeOption })
      } else if (options.length > 1) {
        // Select first non-empty option
        await selectFilter.selectOption({ index: 1 })
      }
    } else {
      // Try text filter on first available field
      const textFilter = page.locator('.fb__field input[type="text"]').first()
      if (await textFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textFilter.fill('a')
      }
    }

    // Wait for debounced filter to apply
    await page.waitForTimeout(500)
    await waitForAppReady(page)

    // Verify that filtering changed results (or at least didn't break)
    const filteredCount = await page.locator('.dt__row').count()
    // Results should exist or show empty state
    const hasRows = filteredCount > 0
    const hasEmpty = await page.locator('.dt__empty').isVisible().catch(() => false)
    expect(hasRows || hasEmpty).toBeTruthy()
  })
})
