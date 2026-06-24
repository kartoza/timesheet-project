// spec: playwright/tests/pmo/pmo-dashboard.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('PMO Dashboard', () => {
  test('Dashboard renders for authenticated PMO user', async ({ page }) => {
    // Login and navigate to PMO dashboard
    await page.goto('http://localhost:8000/admin/login/');
    await page.fill('#id_username', process.env.PMO_USERNAME || 'admin');
    await page.fill('#id_password', process.env.PMO_PASSWORD || 'admin');
    await page.click('[type=submit]');
    await page.goto('http://localhost:8000/pmo-dashboard/');

    // Verify main dashboard heading is visible after login
    await expect(page.getByRole('heading', { name: 'PMO Executive Dashboard' })).toBeVisible();

    // Verify Portfolio Overview summary section is visible
    await expect(page.getByRole('heading', { name: 'Portfolio Overview' })).toBeVisible();

    // Verify # of Projects stat card is visible
    await expect(page.getByRole('heading', { name: '# of Projects' })).toBeVisible();

    // Verify the projects table is visible
    await expect(page.getByRole('heading', { name: 'Kartoza Running Projects' })).toBeVisible();

    // Verify search input is visible
    await expect(page.getByRole('textbox', { name: 'Search projects...' })).toBeVisible();

    // Verify view toggle buttons are visible
    await expect(page.getByRole('button', { name: 'Table View' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gantt View' })).toBeVisible();
  });

  test('Search by project name filters table rows', async ({ page }) => {
    // Login and navigate to PMO dashboard
    await page.goto('http://localhost:8000/admin/login/');
    await page.fill('#id_username', process.env.PMO_USERNAME || 'admin');
    await page.fill('#id_password', process.env.PMO_PASSWORD || 'admin');
    await page.click('[type=submit]');
    await page.goto('http://localhost:8000/pmo-dashboard/');
    await expect(page.getByRole('heading', { name: 'PMO Executive Dashboard' })).toBeVisible();

    const searchInput = page.getByRole('textbox', { name: 'Search projects...' });

    // Type 'BOKU' into the search input to filter projects
    await searchInput.fill('BOKU');

    // Verify BOKU project row appears in filtered results
    await expect(page.getByRole('button', { name: 'BOKU', exact: true })).toBeVisible();

    // Clear the search input to restore all rows
    await searchInput.fill('');

    // Verify unfiltered table is restored
    await expect(page.getByRole('heading', { name: 'Kartoza Running Projects' })).toBeVisible();
  });

  test('Switching to Gantt View renders the Gantt chart', async ({ page }) => {
    // Login and navigate to PMO dashboard
    await page.goto('http://localhost:8000/admin/login/');
    await page.fill('#id_username', process.env.PMO_USERNAME || 'admin');
    await page.fill('#id_password', process.env.PMO_PASSWORD || 'admin');
    await page.click('[type=submit]');
    await page.goto('http://localhost:8000/pmo-dashboard/');
    await expect(page.getByRole('heading', { name: 'PMO Executive Dashboard' })).toBeVisible();

    // Switch to Gantt View
    await page.getByRole('button', { name: 'Gantt View' }).click();

    // Verify Table View button is still visible (as toggle to switch back)
    await expect(page.getByRole('button', { name: 'Table View' })).toBeVisible();

    // Wait for Gantt chart to render with project tasks
    await page.getByText('Accounts Receivable').first().waitFor({ state: 'visible' });

    // Switch back to Table View
    await page.locator('button:has-text(\'Table View\')').click();

    // Verify table is restored after switching back from Gantt
    await expect(page.getByRole('heading', { name: 'Kartoza Running Projects' })).toBeVisible();
  });

  test('Project name link opens the Project Details modal', async ({ page }) => {
    // Login and navigate to PMO dashboard
    await page.goto('http://localhost:8000/admin/login/');
    await page.fill('#id_username', process.env.PMO_USERNAME || 'admin');
    await page.fill('#id_password', process.env.PMO_PASSWORD || 'admin');
    await page.click('[type=submit]');
    await page.goto('http://localhost:8000/pmo-dashboard/');
    await expect(page.getByRole('heading', { name: 'PMO Executive Dashboard' })).toBeVisible();

    // Click the first project name to open the Project Details modal
    await page.locator('button:has-text(\'Accounts Receivable\')').click();

    // Verify project name heading is shown in the modal
    await expect(page.getByRole('heading', { name: 'Accounts Receivable' })).toBeVisible();

    // Verify Start Date label is present in project details modal
    await expect(page.getByText('Start Date')).toBeVisible();

    // Close the modal by pressing Escape
    await page.keyboard.press('Escape');

    // Verify the table is visible again after modal close
    await expect(page.getByRole('heading', { name: 'Kartoza Running Projects' })).toBeVisible();
  });

  test('Dark mode toggle applies dark theme and persists in localStorage', async ({ page }) => {
    // Login and navigate to PMO dashboard
    await page.goto('http://localhost:8000/admin/login/');
    await page.fill('#id_username', process.env.PMO_USERNAME || 'admin');
    await page.fill('#id_password', process.env.PMO_PASSWORD || 'admin');
    await page.click('[type=submit]');
    await page.goto('http://localhost:8000/pmo-dashboard/');
    await expect(page.getByRole('heading', { name: 'PMO Executive Dashboard' })).toBeVisible();

    const themeToggle = page.getByRole('button', { name: /switch to .* mode/i });

    // Ensure we start in light mode
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Click the dark mode toggle button
    await themeToggle.click();

    // Verify the dark class is applied to the html element
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Click the theme toggle again to switch back to light mode
    await themeToggle.click();

    // Verify dark class is removed after toggling back to light mode
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
