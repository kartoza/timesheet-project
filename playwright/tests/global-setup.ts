import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '.auth/pmo-user.json');

async function globalSetup(config: FullConfig) {
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000/admin/login/');
  await page.fill('#id_username', process.env.PMO_USERNAME || 'admin');
  await page.fill('#id_password', process.env.PMO_PASSWORD || 'admin');
  await page.click('[type=submit]');
  await page.waitForURL('**/admin/**');

  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}

export default globalSetup;
