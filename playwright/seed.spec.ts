import { Page } from '@playwright/test';

export default async function seed(page: Page) {
  await page.goto('/pmo-dashboard/');
}
