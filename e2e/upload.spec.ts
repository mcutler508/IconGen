import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURES = path.join(__dirname, 'fixtures')

test.describe('Feature 1 — Upload & Input Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
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
})
