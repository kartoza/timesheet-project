import { test } from '@playwright/test';

test.describe('Test group', () => {
  test('seed', async ({ page }) => {
    await page.goto('http://localhost:8000/admin/login/');
    await page.fill('#id_username', process.env.PMO_USERNAME || 'admin');
    await page.fill('#id_password', process.env.PMO_PASSWORD || 'admin');
    await page.click('[type=submit]');
    await page.goto('http://localhost:8000/pmo-dashboard/');
  });
});
