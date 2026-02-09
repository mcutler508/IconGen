import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURES = path.join(__dirname, 'fixtures')

/** Helper: upload + detect + wait for icon grid */
async function uploadAndDetect(page: import('@playwright/test').Page) {
  const fileInput = page.getByTestId('file-input')
  await fileInput.setInputFiles(path.join(FIXTURES, 'splash-01.png'))
  await expect(page.getByTestId('image-preview')).toBeVisible()

  await page.getByTestId('detect-button').click()
  await expect(page.getByTestId('detection-overlay')).toBeVisible({ timeout: 30000 })

  // Wait for processing to finish and grid to appear
  await expect(page.getByTestId('icon-grid')).toBeVisible({ timeout: 15000 })
}

test.describe('Feature 3 — Crop, Cleanup & Preview Grid', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('detection produces an icon grid with matching tile count', async ({ page }) => {
    await uploadAndDetect(page)

    const tiles = page.getByTestId('icon-tile')
    const tileCount = await tiles.count()
    expect(tileCount).toBeGreaterThan(0)

    // Tile count should match detection count
    const countText = await page.getByTestId('detection-count-main').textContent()
    const detectedCount = parseInt(countText || '0')
    expect(tileCount).toBe(detectedCount)
  })

  test('exclude toggle reduces selected count', async ({ page }) => {
    await uploadAndDetect(page)

    const selectedCountEl = page.getByTestId('selected-count')
    const initialText = await selectedCountEl.textContent()
    const initialCount = parseInt(initialText || '0')

    // Click first exclude toggle
    const excludeButtons = page.getByTestId('exclude-toggle')
    await excludeButtons.first().click()

    const updatedText = await selectedCountEl.textContent()
    const updatedCount = parseInt(updatedText || '0')
    expect(updatedCount).toBe(initialCount - 1)
  })

  test('padding slider is visible with default value of 4', async ({ page }) => {
    await uploadAndDetect(page)

    const paddingSlider = page.getByTestId('padding-slider')
    await expect(paddingSlider).toBeVisible()

    const paddingValue = page.getByTestId('padding-value')
    await expect(paddingValue).toHaveText('4')
  })

  test('BG removal switch defaults to on', async ({ page }) => {
    await uploadAndDetect(page)

    const bgSwitch = page.getByTestId('bg-removal-switch')
    await expect(bgSwitch).toBeVisible()
    await expect(bgSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('reset clears icon grid', async ({ page }) => {
    await uploadAndDetect(page)
    await expect(page.getByTestId('icon-grid')).toBeVisible()

    await page.getByTestId('reset-button').click()

    await expect(page.getByTestId('icon-grid')).not.toBeVisible()
    await expect(page.getByTestId('empty-state')).toBeVisible()
  })
})
