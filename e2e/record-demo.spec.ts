import { test, expect } from '@playwright/test';

test('record demo', async ({ page }) => {
  // Navigate to your app
  await page.goto('http://localhost:5173');
  
  // Wait for app to load (adjust selector to your app)
  await page.waitForLoadState('networkidle');
  
  // Perform your demo actions - CUSTOMIZE THIS PART:
  
  // Example 1: If you have a button
  await page.click('button:has-text("Generate")');
  await page.waitForTimeout(2000); // Wait 2 seconds
  
  // Example 2: If you have an input field
  await page.fill('input[placeholder="Enter text"]', 'sample icon');
  await page.waitForTimeout(1000);
  
  // Example 3: Click another button
  await page.click('button:has-text("Create")');
  await page.waitForTimeout(3000); // Wait for result
  
  // Add more interactions as needed
});