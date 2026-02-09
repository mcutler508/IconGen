import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURES = path.join(__dirname, 'fixtures')

test.describe('Feature 1 — Upload & Input Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app')
  })

  test('shows empty state on initial load', async ({ page }) => {
    await expect(page.getByTestId('empty-state')).toBeVisible()
  })

  test('upload valid PNG → preview + metadata displayed', async ({ page }) => {
    const fileInput = page.getByTestId('file-input')
    await fileInput.setInputFiles(path.join(FIXTURES, 'test.png'))

    await expect(page.getByTestId('image-preview')).toBeVisible()
    await expect(page.getByTestId('file-metadata')).toBeVisible()
    await expect(page.getByTestId('file-metadata')).toContainText('test.png')
    await expect(page.getByTestId('empty-state')).not.toBeVisible()
  })

  test('upload invalid file → error message shown, no preview', async ({ page }) => {
    const fileInput = page.getByTestId('file-input')
    await fileInput.setInputFiles(path.join(FIXTURES, 'test.txt'))

    await expect(page.getByTestId('error-message')).toBeVisible()
    await expect(page.getByTestId('error-message')).toContainText('Unsupported file type')
    await expect(page.getByTestId('image-preview')).not.toBeVisible()
  })

  test('reset button returns to clean initial state', async ({ page }) => {
    const fileInput = page.getByTestId('file-input')
    await fileInput.setInputFiles(path.join(FIXTURES, 'test.png'))

    await expect(page.getByTestId('image-preview')).toBeVisible()

    await page.getByTestId('reset-button').click()

    await expect(page.getByTestId('empty-state')).toBeVisible()
    await expect(page.getByTestId('image-preview')).not.toBeVisible()
    await expect(page.getByTestId('file-metadata')).not.toBeVisible()
  })

  test('dark/light mode toggle works', async ({ page }) => {
    const html = page.locator('html')
    const toggle = page.getByTestId('theme-toggle')

    // Get initial theme class
    const initialClass = await html.getAttribute('class')

    // Toggle
    await toggle.click()
    const newClass = await html.getAttribute('class')
    expect(newClass).not.toBe(initialClass)

    // Toggle back
    await toggle.click()
    const restoredClass = await html.getAttribute('class')
    expect(restoredClass).toBe(initialClass)
  })

  test('instruction box visible on page load (before upload)', async ({ page }) => {
    await expect(page.getByTestId('instruction-box')).toBeVisible()
    await expect(page.getByTestId('instruction-box')).toContainText('Tips for best results')
  })

  test('instruction box visible after detection', async ({ page }) => {
    const fileInput = page.getByTestId('file-input')
    await fileInput.setInputFiles(path.join(FIXTURES, 'splash-01.png'))
    await expect(page.getByTestId('image-preview')).toBeVisible()

    await page.getByTestId('detect-button').click()
    await expect(page.getByTestId('detection-overlay')).toBeVisible({ timeout: 30000 })

    await expect(page.getByTestId('instruction-box')).toBeVisible()
  })

  test('main panel has caret-transparent on main element', async ({ page }) => {
    // Click on the main panel area
    const main = page.locator('main')
    await main.click()

    // Verify caret-color is transparent
    const caretColor = await main.evaluate(el => getComputedStyle(el).caretColor)
    expect(caretColor).toBe('rgba(0, 0, 0, 0)')
  })

  test('no contenteditable or hidden inputs overlaying image area', async ({ page }) => {
    const fileInput = page.getByTestId('file-input')
    await fileInput.setInputFiles(path.join(FIXTURES, 'test.png'))
    await expect(page.getByTestId('image-preview')).toBeVisible()

    // Check no contenteditable elements inside image preview
    const editables = await page.getByTestId('image-preview').locator('[contenteditable]').count()
    expect(editables).toBe(0)

    // Check no hidden inputs inside image preview
    const hiddenInputs = await page.getByTestId('image-preview').locator('input[type="hidden"]').count()
    expect(hiddenInputs).toBe(0)
  })
})
