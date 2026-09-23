import { test, expect } from "@playwright/test";

const control = `http://127.0.0.1:${process.env.DW_TEST_DB_PORT || 54329}/__control`;

test.beforeEach(async ({ request }) => {
  await request.post(control, { data: { reset: true } });
});

test("directory is readable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/directory`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Directory");
  await expect(page.locator('a[href="/@session-fixture"]')).toBeVisible();
  await context.close();
});

test("filters, sorting and view state are keyboard accessible", async ({ page }) => {
  await page.goto("/directory");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  const filters = page.getByRole("button", { name: /^Filters/ });
  await filters.focus();
  await page.keyboard.press("Enter");
  await expect(filters).toHaveAttribute("aria-expanded", "true");
  const section = page.getByRole("button", { name: "Graduating Class" });
  await section.focus();
  await page.keyboard.press("Space");
  const option = page.getByRole("checkbox", { name: "2027 (1)" });
  await expect(option).toBeVisible();
  await option.focus();
  await page.keyboard.press("Space");
  await expect(option).toBeChecked();
  await filters.click();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  const tableView = page.getByRole("button", { name: "Table view", exact: true });
  await tableView.focus();
  await page.keyboard.press("Enter");
  await expect(tableView).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("table", { name: "Directory members" })).toBeVisible();
  await page.getByRole("button", { name: "Name", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "ascending");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "descending");
  await page.getByRole("searchbox", { name: "Search directory" }).fill("no matching member");
  await expect(page.getByRole("status")).toHaveText("0 of 1 members found.");
});

test("navigation contains focus and restores its opener, including immediate dismissal", async ({ page }) => {
  await page.goto("/directory");
  const opener = page.getByRole("button", { name: "Open navigation" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Site navigation" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(dialog.getByRole("button", { name: "Close navigation" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await dialog.getByRole("button", { name: "Close navigation" }).click();
  await expect(opener).toBeFocused();
});

test("mobile filter dialog restores focus and supports Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/directory");
  const opener = page.getByRole("button", { name: /^Filters/ });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Program", exact: true }).click();
  await expect(dialog.getByRole("checkbox", { name: "Computer Science (1)" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Filters" })).not.toBeVisible();
  await expect(opener).toBeFocused();
});
