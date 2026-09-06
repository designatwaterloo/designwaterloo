import {
  test,
  expect,
  chromium,
  type Page,
  type BrowserContext,
} from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const APP = "http://localhost:3100";
const CONTROL = "http://127.0.0.1:54329/__control";
async function login(page: Page, destination = "/dashboard") {
  await page.goto(`/sign-in?redirectTo=${encodeURIComponent(destination)}`);
  await page.getByRole("button", { name: "Sign in with LEARN" }).click();
  await expect(page).toHaveURL(`${APP}${destination}`);
  await expect(
    page.getByRole("link", { name: "Your dashboard", exact: true }),
  ).toBeVisible();
}
async function expire(context: BrowserContext) {
  const cookies = await context.cookies();
  const parts = cookies
    .filter((c) => /^sb-.+-auth-token(?:\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  expect(parts.length).toBeGreaterThan(0);
  const value = parts.map((c) => c.value).join("");
  expect(value.startsWith("base64-")).toBeTruthy();
  const session = JSON.parse(
    Buffer.from(value.slice(7), "base64url").toString(),
  );
  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  const name = parts[0].name.replace(/\.\d+$/, "");
  await context.clearCookies({
    name: new RegExp(`^${name.replaceAll(".", "\\.")}(?:\\.\\d+)?$`),
  });
  await context.addCookies([
    {
      ...parts[0],
      name,
      value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
    },
  ]);
}
test.beforeEach(async ({ request, context }) => {
  await context.route("**/*", route => {
    const host = new URL(route.request().url()).hostname;
    return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
  });
  await request.post(CONTROL, { data: { reset: true } });
});
test("OAuth callback persists identity across reload, profile navigation and a second tab", async ({
  page,
  context,
  request,
}) => {
  await login(page);
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Your dashboard", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator("a[class*=OverlayNav_userLink]").filter({hasText:"View profile"}).click();
  await expect(page).toHaveURL(`${APP}/@session-fixture`);
  await expect(
    page.getByRole("heading", { name: "Session Fixture", exact: true }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto("/dashboard");
  await expect(
    other.getByRole("link", { name: "Your dashboard", exact: true }),
  ).toBeVisible();
  expect((await (await request.get(CONTROL)).json()).exchanges).toBe(1);
});
test("expired session rotates refresh cookie and remains signed in on another reload", async ({
  page,
  context,
  request,
}) => {
  await login(page);
  await expire(context);
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Your dashboard", exact: true }),
  ).toBeVisible();
  expect((await (await request.get(CONTROL)).json()).refreshes).toBeGreaterThan(
    0,
  );
  await page.reload();
  await expect(page).toHaveURL(`${APP}/dashboard`);
  await expect(
    page.getByRole("link", { name: "Your dashboard", exact: true }),
  ).toBeVisible();
});
test("temporary auth outage returns retryable page without clearing the session", async ({
  page,
  context,
  request,
}) => {
  await login(page);
  const before = await context.cookies();
  await request.post(CONTROL, { data: { failUser: true } });
  const response = await page.reload();
  expect(response?.status()).toBe(503);
  await expect(
    page.getByRole("heading", { name: "We couldn’t load your account" }),
  ).toBeVisible();
  const after = await context.cookies();
  expect(after.filter((c) => c.name.includes("auth-token"))).toEqual(
    before.filter((c) => c.name.includes("auth-token")),
  );
  await request.post(CONTROL, { data: { failUser: false } });
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("link", { name: "Your dashboard", exact: true }),
  ).toBeVisible();
});
test("profile service outage recovers without another login", async ({
  page,
  request,
}) => {
  await login(page);
  await request.post(CONTROL, { data: { failMember: true } });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "We couldn’t load your account" }),
  ).toBeVisible();
  await expect(page).toHaveURL(`${APP}/dashboard`);
  await request.post(CONTROL, { data: { failMember: false } });
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("link", { name: "Your dashboard", exact: true }),
  ).toBeVisible();
  expect((await (await request.get(CONTROL)).json()).exchanges).toBe(1);
});
test("sign-out propagates to another tab and protects reloads", async ({
  page,
  context,
}) => {
  await login(page);
  const other = await context.newPage();
  await other.goto("/dashboard");
  await expect(
    other.getByRole("link", { name: "Your dashboard", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(`${APP}/`);
  await expect(other).toHaveURL(/\/sign-in/);
  await other.goto("/dashboard");
  await expect(other).toHaveURL(/\/sign-in/);
});
test("anonymous protected navigation preserves the intended destination", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard/);
  await page.getByRole("button", { name: "Sign in with LEARN" }).click();
  await expect(page).toHaveURL(`${APP}/dashboard`);
});
test("persistent browser profile survives browser shutdown and relaunch", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dw-session-browser-"));
  let context: BrowserContext | undefined;
  try {
    context = await chromium.launchPersistentContext(directory, {
      baseURL: APP,
      channel: "chromium",
    });
    await login(context.pages()[0]);
    await context.close();
    context = await chromium.launchPersistentContext(directory, {
      baseURL: APP,
      channel: "chromium",
    });
    const page = context.pages()[0];
    await page.goto("/dashboard");
    await expect(page).toHaveURL(`${APP}/dashboard`);
    await expect(
      page.getByRole("link", { name: "Your dashboard", exact: true }),
    ).toBeVisible();
  } finally {
    await context?.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('profile edits persist through publish and reload without losing the session', async ({ page, request }) => {
  await login(page, '/@session-fixture?edit=true');
  await page.getByRole('button', { name: 'Synthetic browser test profile.', exact: true }).click();
  await page.getByPlaceholder('Click to add bio...').fill('Updated synthetic profile.');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect.poll(async () => (await (await request.get(CONTROL)).json()).saves).toBe(1);
  await page.reload();
  await expect(page.getByText('Updated synthetic profile.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Your dashboard', exact: true })).toBeVisible();
});

test('username settings save and retain both old URL formats across rename and reclaim', async ({ page, request }) => {
  await login(page, '/settings');
  const input = page.getByRole('textbox', { name: 'Username', exact: true });
  await input.fill('taken-name');
  await expect(page.getByText('Already taken or reserved.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save username' })).toBeDisabled();
  await input.fill('bmp');
  await expect(page.getByText('Available.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save username' }).click();
  await expect(page.getByText('Username saved.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'designwaterloo.com/@bmp' })).toBeVisible();
  for (const path of ['/directory/session-fixture?edit=true', '/@session-fixture?edit=true', '/@BMP?edit=true']) {
    await page.goto(path);
    await expect(page).toHaveURL(`${APP}/@bmp?edit=true`);
    await expect(page.getByRole('heading', { name: 'Session Fixture', exact: true })).toBeVisible();
  }
  await page.goto('/%40bmp?edit=true');
  await expect(page.getByRole('heading', { name: 'Session Fixture', exact: true })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://designwaterloo.com/@bmp');
  await page.goto('/settings');
  await input.fill('session-fixture');
  await expect(page.getByText('Available.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save username' }).click();
  await expect(page.getByText('Username saved.', { exact: true })).toBeVisible();
  await page.goto('/@bmp');
  await expect(page).toHaveURL(`${APP}/@session-fixture`);
  const missing = await request.get(`${APP}/@does-not-exist`);
  expect(missing.status()).toBe(404);
});

test('settings are readable on mobile and enforce invalid input', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, '/settings');
  const input = page.getByRole('textbox', { name: 'Username', exact: true });
  await input.fill('ab');
  await expect(page.getByText('Use at least 3 characters.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save username' })).toBeDisabled();
  await input.fill('session-fixture');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/username-settings-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/username-settings-desktop.png', fullPage: true });
});

test('anonymous settings require sign-in and legacy public profile links still work', async ({ page, request }) => {
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fsettings$/);
  await page.goto('/directory/session-fixture');
  await expect(page).toHaveURL(`${APP}/@session-fixture`);
  const response = await request.post(`${APP}/api/account/username`, {
    headers: { Origin: APP }, data: { username: 'stolen', currentUsername: 'session-fixture' },
  });
  expect(response.status()).toBe(401);
  const foreign = await request.post(`${APP}/api/account/username`, {
    headers: { Origin: 'https://example.org' }, data: { username: 'stolen', currentUsername: 'session-fixture' },
  });
  expect(foreign.status()).toBe(403);
});
