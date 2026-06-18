// spec: playwright/tests/pmo/pmo-dashboard.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Authentication & Access Control', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Unauthenticated user is redirected to login', async ({ page }) => {
    // 1. Open a fresh browser session (no cookies) and navigate to /pmo-dashboard/
    await page.goto('/pmo-dashboard/');

    // Expect: The browser is redirected to the login page (URL contains /accounts/login/)
    await expect(page).toHaveURL(/accounts\/login/);

    // Expect: The login page heading is visible
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });
});
