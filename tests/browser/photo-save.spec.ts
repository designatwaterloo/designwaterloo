import { test, expect } from '@playwright/test';

const control = `http://127.0.0.1:${process.env.DW_TEST_DB_PORT || 54329}/__control`;

test('photo save failures keep the editor open and allow a successful retry', async ({ page, request, context }) => {
  await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await request.post(control, { data: { reset: true } });
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in with LEARN' }).click();
  await page.getByRole('button', { name: 'Change or crop profile photo' }).click();
  const dialog = page.getByRole('dialog');
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 10;
    return canvas.toDataURL().split(',')[1];
  });
  await page.getByLabel('Change photo', { exact: true }).setInputFiles({
    name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64'),
  });
  const save = dialog.getByRole('button', { name: 'Save photo', exact: true });
  await expect(save).toBeEnabled();
  let status = 409;
  const imageUrl = 'https://cdn.sanity.io/images/synthetic/production/fixture-10x10.png';
  await page.route('**/api/upload-image', route => route.fulfill({
    status,
    json: status === 200 ? { success: true, imageUrl } : { error: "Your photo couldn't be saved to your profile. Please try again." },
  }));
  for (const failure of [409, 500]) {
    status = failure;
    await save.click();
    await expect(dialog.getByRole('alert')).toContainText("couldn't be saved");
    await expect(save).toBeEnabled();
    await expect(dialog).toBeVisible();
    const state = await (await request.get(control)).json();
    expect(state.member.profile_image_url).toBeNull();
    expect(state.saves).toBe(0);
  }
  status = 200;
  await save.click();
  await expect(dialog).toHaveCount(0);
  const state = await (await request.get(control)).json();
  expect(state.member.profile_image_url).toBe(imageUrl);
  expect(state.saves).toBe(1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Change or crop profile photo' }).locator('img')).toHaveAttribute('src', imageUrl);
});
