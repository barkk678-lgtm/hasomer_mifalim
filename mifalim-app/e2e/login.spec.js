import { test, expect } from '@playwright/test';

test('login page renders the sign-in form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'התחברות למערכת ניהול המפעלים' })).toBeVisible();
  await expect(page.getByPlaceholder('האימייל שלך')).toBeVisible();
  await expect(page.getByPlaceholder('סיסמה (לפחות 8 תווים)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'התחברות' })).toBeVisible();
});

test('wrong credentials show a Hebrew error instead of crashing', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('האימייל שלך').fill('no-such-user@example.com');
  await page.getByPlaceholder('סיסמה (לפחות 8 תווים)').fill('wrongpassword123');
  await page.getByRole('button', { name: 'התחברות' }).click();
  await expect(page.locator('text=המייל או הסיסמה שגויים')).toBeVisible({ timeout: 15_000 });
});

// Requires a real, pre-created test account — set TEST_USER_EMAIL / TEST_USER_PASSWORD as CI secrets.
// Skips automatically when they're not configured (e.g. local runs) instead of failing.
test('signing in with a valid account reaches the dashboard', async ({ page }) => {
  test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, 'TEST_USER_EMAIL/TEST_USER_PASSWORD not configured');
  await page.goto('/login');
  await page.getByPlaceholder('האימייל שלך').fill(process.env.TEST_USER_EMAIL);
  await page.getByPlaceholder('סיסמה (לפחות 8 תווים)').fill(process.env.TEST_USER_PASSWORD);
  await page.getByRole('button', { name: 'התחברות' }).click();
  await expect(page).toHaveURL('/', { timeout: 15_000 });
});
