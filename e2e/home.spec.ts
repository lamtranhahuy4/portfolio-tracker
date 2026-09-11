import { test, expect } from '@playwright/test';

test('Home page renders without crashing', async ({ page }) => {
  await page.goto('/');

  // Root layout metadata title is "My Portfolio Oasis" (src/app/layout.tsx:9)
  await expect(page).toHaveTitle(/Portfolio/i);

  // Unauthenticated visitors see the AuthPanel, which renders an h1 heading
  const heading = page.locator('h1').first();
  await expect(heading).toBeVisible();
});
