import { test, expect } from '@playwright/test';

test('Forex dashboard renders without crashing', async ({ page }) => {
  await page.goto('/forex');

  // Verify it doesn't crash and shows basic content
  await expect(page).toHaveTitle(/Forex/i);
  
  const heading = page.getByRole('heading', { name: /Tỷ giá/i }).first();
  await expect(heading).toBeVisible();
});
