import { test, expect } from '@playwright/test';

test('Unauthenticated user is redirected from /forex to home', async ({ page }) => {
  // forex/page.tsx calls getCurrentUser() and redirect('/') when no session exists.
  // In CI there is no authenticated session, so the page must redirect, not render.
  await page.goto('/forex');

  // Verify the redirect landed on the home page
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle(/Portfolio/i);
  await expect(page.locator('h1').first()).toBeVisible();
});
