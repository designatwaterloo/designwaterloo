import { test, expect, type Page } from '@playwright/test';
const APP = `http://localhost:${process.env.DW_TEST_APP_PORT || 3100}`;
const CONTROL = `http://127.0.0.1:${process.env.DW_TEST_DB_PORT || 54329}/__control`;
const KEY = 'core_team_updates_first_2026';
async function login(page: Page) {
  await page.goto('/apply/updates');
  await page.getByRole('link', { name: 'Sign in for updates' }).click();
  await page.getByRole('button', { name: 'Sign in with LEARN' }).click();
  await expect(page).toHaveURL(`${APP}/apply/updates`);
  await expect(page.getByRole('button', { name: 'Sign up for updates', exact: true })).toBeVisible();
}
test.beforeEach(async ({ request, context }) => {
  await context.route('**/*', r => ['localhost', '127.0.0.1'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
  await request.post(CONTROL, { data: { reset: true, member: { bio: '', specialties: [], profile_image_url: null } } });
});
test('closed applications lead to updates, and writes remain closed', async ({ page, request }) => {
  test.skip(process.env.DW_TEST_APPLICATIONS_OPEN !== 'false', 'Run with applications closed.');
  await page.goto('/apply');
  await expect(page).toHaveURL(`${APP}/apply/updates`);
  await expect(page.getByRole('heading', { name: 'Be the first to know.' })).toBeVisible();
  for (const method of ['get', 'put', 'post'] as const) {
    const response = await request[method](`${APP}/api/core-team/application`);
    expect(response.status()).toBe(503);
    expect((await response.json()).updatesUrl).toBe('/apply/updates');
  }
});
test('explicit signup persists without a complete profile, preserves metadata, and supports opt-out', async ({ page, request }) => {
  await login(page);
  expect((await (await request.get(CONTROL)).json()).userMetadata[KEY]).toBeUndefined();
  await page.getByRole('button', { name: 'Sign up for updates', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('You’re on the list.');
  await expect(page.getByRole('status')).toContainText('session-fixture@uwaterloo.ca');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unsubscribe from updates' })).toBeVisible();
  const state = await (await request.get(CONTROL)).json();
  expect(state.userMetadata[KEY].subscribed).toBe(true);
  expect(state.userMetadata.full_name).toBe('Session Fixture');
  expect(state.coreApplication).toBeNull();
  await page.getByRole('button', { name: 'Unsubscribe from updates' }).click();
  await expect(page.getByRole('button', { name: 'Sign up for updates', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign up for updates', exact: true })).toBeVisible();
  expect((await (await request.get(CONTROL)).json()).userMetadata[KEY].subscribed).toBe(false);
});
test('save failure never shows success and can be retried', async ({ page, request }) => {
  await login(page);
  await request.post(CONTROL, { data: { failSave: true } });
  await page.getByRole('button', { name: 'Sign up for updates', exact: true }).click();
  await expect(page.locator('main [role="alert"]')).toContainText('couldn’t save');
  await expect(page.getByRole('status')).not.toContainText('You’re on the list.');
  await request.post(CONTROL, { data: { failSave: false } });
  await page.getByRole('button', { name: 'Sign up for updates', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('You’re on the list.');
});
test('signup requires authentication, same origin, and a boolean preference', async ({ page, request }) => {
  expect((await request.put(`${APP}/api/core-team/updates`, { headers: { Origin: APP }, data: { subscribed: true } })).status()).toBe(401);
  await login(page);
  expect((await page.request.put(`${APP}/api/core-team/updates`, { headers: { Origin: 'https://example.com' }, data: { subscribed: true } })).status()).toBe(403);
  expect((await page.request.put(`${APP}/api/core-team/updates`, { headers: { Origin: APP }, data: { subscribed: 'yes' } })).status()).toBe(400);
});
test('compact dashboard banner links to updates on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto('/dashboard');
  const banner = page.getByRole('complementary', { name: 'Core team recruitment' });
  await expect(banner.getByRole('link', { name: 'Sign up for updates' })).toHaveAttribute('href', '/apply/updates');
  await banner.screenshot({ path: 'test-results/core-team-updates-banner.png' });
  await banner.getByRole('link', { name: 'Sign up for updates' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/core-team-updates-mobile.png', fullPage: true });
});

test('new members can sign up without completing onboarding', async ({ page, request }) => {
  await request.post(CONTROL, { data: { member: { onboarding_completed: false } } });
  await login(page);
  await page.getByRole('button', { name: 'Sign up for updates', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('You’re on the list.');
});
