import { type Page, expect } from '@playwright/test'

/**
 * Wait for the app to be loaded (no loading spinners visible).
 */
export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('networkidle')
}

/**
 * Generate a unique collection name for idempotent tests.
 */
export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}`
}
