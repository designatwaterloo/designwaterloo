import { test, expect } from "@playwright/test";
const control = `http://127.0.0.1:${process.env.DW_TEST_DB_PORT || 54329}/__control`;

for (const width of [1475, 390]) {
  test(`profile publication controls and help at ${width}px`, async ({ page, context, request }) => {
    await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    await page.route('**/api/profile/notify-review', route => route.fulfill({ json: { success: true } }));
    await request.post(control, { data: { reset: true } });
    await page.setViewportSize({ width, height: 1044 });
    await page.goto('/sign-in');
    await page.getByRole('button', { name: 'Sign in with LEARN' }).click();
    await expect(page.getByRole('heading', { name: 'Your profile', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View public profile' })).toBeVisible();

    for (const [review_status, label] of [['pending_review', 'Under review'], ['draft', 'Unpublished'], ['rejected', 'Needs changes']] as const) {
      await request.post(control, { data: { member: { review_status, is_approved: false, submitted_at: null } } });
      await page.reload();
      await expect(page.locator('header').getByText(label, { exact: true }).filter({ visible: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'View public profile' })).toHaveCount(0);
      const help = page.getByRole('button', { name: 'About profile visibility' });
      await help.focus();
      await page.keyboard.press('Enter');
      const panel = page.getByRole('region', { name: 'Profile visibility' });
      await expect(panel).toBeVisible();
      await expect(panel).toContainText('Your profile is hidden from the public');
      expect(await panel.evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })).toBe(true);
      await page.keyboard.press('Escape');
      await expect(panel).not.toBeVisible();
      await expect(help).toBeFocused();
    }
  });
}
