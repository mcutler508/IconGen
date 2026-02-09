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
    await page.goto('/app')
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

    // Use Select None button to exclude all
    await page.getByTestId('select-none-button').click()

    // Verify selected count is 0
    await expect(page.getByTestId('selected-count')).toHaveText('0 icons selected for export')

    // Export button should be disabled
    await expect(page.getByTestId('export-button')).toBeDisabled()
  })

  test('export triggers download with correct file count and manifest', async ({ page }) => {
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
    // PNG files + manifest.json
    const pngFiles = files.filter(f => f.endsWith('.png'))
    expect(pngFiles).toHaveLength(selectedCount)
    expect(files).toContain('manifest.json')

    // Parse and validate manifest
    const manifestStr = await zip.files['manifest.json'].async('string')
    const manifest = JSON.parse(manifestStr)
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.export.sizePx).toBeNull()
    expect(manifest.export.mode).toBe('original')
    expect(manifest.totalExported).toBe(selectedCount)
  })

  test('Select All / Select None buttons update count', async ({ page }) => {
    await uploadAndDetect(page)

    const selectedText = await page.getByTestId('selected-count').textContent()
    const totalCount = parseInt(selectedText || '0')
    expect(totalCount).toBeGreaterThan(0)

    // Click Select None
    await page.getByTestId('select-none-button').click()
    await expect(page.getByTestId('selected-count')).toHaveText('0 icons selected for export')

    // Click Select All
    await page.getByTestId('select-all-button').click()
    await expect(page.getByTestId('selected-count')).toContainText(`${totalCount} icon`)
  })

  test('export button shows selected count', async ({ page }) => {
    await uploadAndDetect(page)
    const btn = page.getByTestId('export-button')
    const text = await btn.textContent()
    expect(text).toMatch(/Export ZIP \(\d+\)/)
  })

})
