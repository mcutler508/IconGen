import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import JSZip from 'jszip'
import fs from 'fs'

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

test.describe('Feature 4 — Export ZIP', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('export button is not visible before detection', async ({ page }) => {
    await expect(page.getByTestId('export-button')).not.toBeVisible()
  })

  test('export button is visible after detection', async ({ page }) => {
    await uploadAndDetect(page)
    await expect(page.getByTestId('export-button')).toBeVisible()
  })

  test('export button is disabled when all icons excluded', async ({ page }) => {
    await uploadAndDetect(page)

    // Exclude all icons
    const excludeButtons = page.getByTestId('exclude-toggle')
    const count = await excludeButtons.count()
    for (let i = 0; i < count; i++) {
      await excludeButtons.nth(i).click()
    }

    // Verify selected count is 0
    await expect(page.getByTestId('selected-count')).toHaveText('0 icons selected for export')

    // Export button should be disabled
    await expect(page.getByTestId('export-button')).toBeDisabled()
  })

  test('export triggers download with correct file count', async ({ page }) => {
    await uploadAndDetect(page)

    // Get initial selected count
    const selectedText = await page.getByTestId('selected-count').textContent()
    const selectedCount = parseInt(selectedText || '0')
    expect(selectedCount).toBeGreaterThan(0)

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('export-button').click()
    const download = await downloadPromise

    // Verify filename
    expect(download.suggestedFilename()).toBe('icons.zip')

    // Save and verify ZIP contents
    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()

    const zipBuffer = fs.readFileSync(downloadPath!)
    const zip = await JSZip.loadAsync(zipBuffer)
    const files = Object.keys(zip.files)
    expect(files).toHaveLength(selectedCount)
  })
})
