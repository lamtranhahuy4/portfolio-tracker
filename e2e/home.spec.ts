import { test, expect } from '@playwright/test';

test('Home page renders without crashing', async ({ page }) => {
  // Navigate to the home page
  await page.goto('/');

  // Check that the title or a basic element exists
  // Adjust this based on your actual home page content
  await expect(page).toHaveTitle(/Portfolio Tracker/i);
  
  // Example: check for a specific heading or element
  const heading = page.locator('h1').first();
  await expect(heading).toBeVisible();
});
