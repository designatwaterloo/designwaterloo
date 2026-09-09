import { test, expect } from "@playwright/test";
const CONTROL = `http://127.0.0.1:${process.env.DW_TEST_DB_PORT || 54329}/__control`;

test.beforeEach(async ({ request, context }) => {
  await context.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await request.post(CONTROL, { data: { reset: true, member: {
    onboarding_completed: false, review_status: "draft", is_approved: false,
    bio: null, specialties: [], program: null, graduating_class: null, profile_image_url: null,
  } } });
});

for (const width of [1440, 390]) {
  test(`welcome expands from button to introduction at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Sign in with LEARN" }).click();
    const next = page.getByRole("button", { name: /^(Continue|Confirm schedule)$/ });
    await expect(next).toBeVisible();
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeHidden();
    await next.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
    const rect = await next.boundingBox();
    await next.click();
    const transition = page.locator('[class*="canvasTransition"]');
    await expect(transition).toBeVisible();
    const origin = await transition.evaluate(el => ({ left: el.style.getPropertyValue("--pill-left"), top: el.style.getPropertyValue("--pill-top") }));
    expect(parseFloat(origin.left)).toBeCloseTo(rect!.x, 0);
    expect(parseFloat(origin.top)).toBeCloseTo(rect!.y, 0);
    const geometry = await transition.evaluate(el => {
      const pill = el.querySelector('[class*="expandingPill"]')!;
      const arrow = el.querySelector('[class*="departingArrow"]')!;
      const animation = pill.getAnimations()[0];
      animation.pause();
      animation.currentTime = 400;
      const matrix = new DOMMatrix(getComputedStyle(pill).transform);
      const result = { scaleX: matrix.a, scaleY: matrix.d, clip: getComputedStyle(pill).clipPath, arrowIsSibling: arrow.parentElement === pill.parentElement };
      animation.play();
      return result;
    });
    expect(geometry.scaleX).toBeGreaterThan(1);
    expect(geometry.scaleX).toBeCloseTo(geometry.scaleY, 5);
    expect(geometry.clip).toBe("none");
    expect(geometry.arrowIsSibling).toBe(true);
    const canvas = page.getByRole("main", { name: "Next onboarding step" });
    await expect(canvas).toBeVisible();
    await expect(canvas).toBeFocused();
    await expect(canvas).toHaveCSS("background-color", "rgb(68, 56, 48)");
    expect(await canvas.boundingBox()).toEqual({ x: 0, y: 0, width, height: 1000 });
    await expect(canvas.getByRole("heading", { name: "Welcome, Session." })).toBeVisible();
    await expect(canvas.getByRole("list", { name: "Onboarding step 1 of 7" })).toBeVisible();
    expect(await canvas.locator('li[aria-current="step"]').evaluate(el => el.getBoundingClientRect().width)).toBe(30);
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeHidden();
    const { member } = await (await request.get(CONTROL)).json();
    expect(member.review_status).toBe("draft");
    expect(member.onboarding_completed).toBe(false);
    await page.screenshot({ path: `test-results/onboarding-canvas-${width}.png`, animations: "disabled" });
    await canvas.getByRole("button", { name: /^(Continue|Confirm schedule)$/ }).click();
    await expect(canvas.getByRole("heading", { name: "Does this look right?" })).toBeVisible();
    await expect(canvas.getByRole("list", { name: "Onboarding step 2 of 7" })).toBeVisible();
    await canvas.getByRole("button", { name: "Previous slide" }).click();
    await expect(canvas.getByRole("heading", { name: "Welcome, Session." })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Previous slide" })).toHaveCount(0);
    await expect(canvas.getByRole("list", { name: "Onboarding step 1 of 7" })).toBeVisible();
  });
}

test("reduced motion opens the canvas without the expansion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in with LEARN" }).click();
  await page.getByRole("button", { name: /^(Continue|Confirm schedule)$/ }).click();
  await expect(page.getByRole("main", { name: "Next onboarding step" })).toBeVisible();
  await expect(page.locator('[class*="canvasTransition"]')).toHaveCount(0);
});

for (const school of ["University of Waterloo", "Wilfrid Laurier University"]) {
  test(`name step confirms or collects a name for ${school}`, async ({ page, request }) => {
    const waterloo = school === "University of Waterloo";
    await request.post(CONTROL, { data: { member: { school, first_name: waterloo ? "Session" : "", last_name: waterloo ? "Fixture" : "" } } });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Sign in with LEARN" }).click();
    await page.getByRole("button", { name: /^(Continue|Confirm schedule)$/ }).click();
    await page.getByRole("heading", { name: /Welcome/ }).waitFor();
    await page.getByRole("button", { name: /^(Continue|Confirm schedule)$/ }).click();
    await expect(page.getByRole("heading", { name: waterloo ? "Does this look right?" : "What’s your name?" })).toBeVisible();
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue(waterloo ? "Session" : "");
    await expect(page.getByLabel("Last name", { exact: true })).toHaveValue(waterloo ? "Fixture" : "");
    await page.getByLabel("First name", { exact: true }).fill("Alex");
    await page.getByLabel("Last name", { exact: true }).fill("Rivera");
    await page.screenshot({ path: `test-results/name-${waterloo ? "waterloo" : "laurier"}.png` });
    await request.post(CONTROL, { data: { failSave: true } });
    await page.getByRole("button", { name: /^(Continue|Confirm schedule)$/ }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("couldn’t save your name");
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Alex");
    await request.post(CONTROL, { data: { failSave: false } });
    await page.getByRole("button", { name: /^(Continue|Confirm schedule)$/ }).click();
    await expect(page.getByRole("list", { name: "Onboarding step 3 of 7" })).toBeVisible();
    const { member } = await (await request.get(CONTROL)).json();
    expect(member.first_name).toBe("Alex");
    expect(member.last_name).toBe("Rivera");
    expect(member.review_status).toBe("draft");
    expect(member.onboarding_completed).toBe(false);
    await page.getByRole("button", { name: "Previous slide" }).click();
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Alex");
  });
}

for (const width of [817, 390]) {
  test(`username photo and studies save as drafts at ${width}px`, async ({ page, request }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 844 });
    await request.post(CONTROL, { data: { member: { slug_confirmed: false } } });
    await page.goto("/sign-in");
    const next = page.getByRole("button", { name: /^(Continue|Confirm schedule)$/ });
    await page.getByRole("button", { name: "Sign in with LEARN" }).click();
    await next.click();
    await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
    await next.click();
    await expect(page.getByLabel("First name", { exact: true })).toBeVisible();
    await next.click();
    const username = page.getByLabel("Username", { exact: true });
    await expect(username).toHaveValue("");
    await expect(username).toHaveAttribute("placeholder", "username");
    await expect(username).toHaveAttribute("maxlength", "40");
    await username.fill("admin");
    await expect(page.locator("#username-status")).toContainText("reserved");
    await expect(next).toBeDisabled();
    await username.fill("taken-name");
    await expect(page.locator("#username-status")).toContainText("taken");
    await expect(next).toBeDisabled();
    await username.fill("alex-creative");
    await expect(page.locator("#username-status")).toHaveText("Available");
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.getByRole("heading", { name: "Put a face to your name." })).toBeVisible();
    await next.click();
    await expect(page.getByRole("dialog")).toContainText("before your profile can go live");
    await page.getByRole("button", { name: "Go back", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Put a face to your name." })).toBeVisible();
    await next.click();
    await page.getByRole("button", { name: "Continue without photo", exact: true }).click();
    await expect(page.getByLabel("Program", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Previous slide" }).click();
    await expect(page.getByRole("heading", { name: "Put a face to your name." })).toBeVisible();
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
    await page.route("**/api/upload-image", route => route.fulfill({ json: { imageUrl: `data:image/png;base64,${png}` } }));
    await page.getByLabel("Profile photo", { exact: true }).setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    await expect(page.getByAltText("Your profile photo")).toBeVisible();
    await expect(next).toBeEnabled();
    await page.screenshot({ path: `test-results/username-${width}.png` });
    await next.click();
    await expect(page.getByLabel("Program", { exact: true })).toBeVisible();
    let saved = (await (await request.get(CONTROL)).json()).member;
    expect(saved.slug).toBe("alex-creative");
    expect(saved.profile_image_url).toContain("data:image/png");
    const program = page.getByRole("combobox", { name: "Program", exact: true });
    const programChip = page.locator('[class*="programChip"]');
    const yearChip = page.locator('[class*="yearChip"]');
    expect((await programChip.boundingBox())!.width).toBeGreaterThan((await yearChip.boundingBox())!.width);
    await page.getByLabel("Graduation year").click();
    expect((await yearChip.boundingBox())!.width).toBeGreaterThan((await programChip.boundingBox())!.width);
    await program.fill("SYDE");
    await expect(page.getByRole("listbox", { name: "Programs", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "SYDE", exact: true })).toHaveCount(0);
    await program.press("Enter");
    await expect(program).toHaveValue("SYDE");
    await expect(page.getByLabel("Graduation year")).toBeFocused();
    expect((await yearChip.boundingBox())!.width).toBeGreaterThan((await programChip.boundingBox())!.width);
    await page.getByLabel("Graduation year").fill("1900");
    await next.click();
    await expect(page.locator('p[role="alert"]')).toContainText("graduating year");
    await page.getByLabel("Graduation year").fill("2030");
    await expect(page.getByLabel("Portfolio", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("LinkedIn", { exact: true })).toHaveCount(0);
    await request.post(CONTROL, { data: { failSave: true } });
    await next.click();
    await expect(page.locator('p[role="alert"]')).toContainText("couldn’t save");
    await request.post(CONTROL, { data: { failSave: false } });
    await page.screenshot({ path: `test-results/studies-${width}.png` });
    await next.click();
    await expect(page.getByRole("list", { name: "Onboarding step 6 of 7" })).toBeVisible();
    saved = (await (await request.get(CONTROL)).json()).member;
    expect(saved.program).toBe("Systems Design Engineering");
    expect(saved.graduating_class).toBe("2030");

    expect(saved.review_status).toBe("draft");
    expect(saved.onboarding_completed).toBe(false);
    await page.getByRole("button", { name: "Previous slide" }).click();
    await expect(page.getByLabel("Program", { exact: true })).toHaveAttribute("title", "Systems Design Engineering");
    await next.click();
    await expect(page.getByRole("heading", { name: /Does this schedule look right|When do you plan to work/ })).toBeVisible();
    await page.screenshot({ path: `test-results/onboarding-schedule-${page.viewportSize()?.width}.png` });
    await next.click();
    await expect(page.getByRole("heading", { name: "What are your top skills?" })).toBeVisible();
    await expect(next).toBeDisabled();
    await page.getByRole("checkbox", { name: "Product Design", exact: true }).check();
    await page.getByRole("checkbox", { name: "Photography", exact: true }).check();
    await page.getByRole("checkbox", { name: "Motion Design", exact: true }).check();
    await page.getByRole("checkbox", { name: "UX Research", exact: true }).check();
    await page.getByRole("checkbox", { name: "Branding", exact: true }).check();
    await expect(page.getByRole("checkbox", { name: "Music", exact: true })).toBeDisabled();
    await page.getByRole("checkbox", { name: "UX Research", exact: true }).uncheck();
    await page.getByRole("checkbox", { name: "Branding", exact: true }).uncheck();
    await page.getByRole("checkbox", { name: "Photography", exact: true }).uncheck();
    await page.getByRole("checkbox", { name: "Music", exact: true }).check();
    await page.screenshot({ path: `test-results/skills-${width}.png` });
    await request.post(CONTROL, { data: { failSave: true } });
    await next.click();
    await expect(page.locator('p[role="alert"]')).toContainText("couldn’t save");
    await request.post(CONTROL, { data: { failSave: false } });
    await next.click();
    await expect(page).toHaveURL(/\/dashboard$/);
    saved = (await (await request.get(CONTROL)).json()).member;
    expect(saved.specialties).toEqual(["Product Design", "Motion Design", "Music"]);
    expect(saved.review_status).toBe("draft");
    expect(saved.onboarding_completed).toBe(true);
    expect(saved.work_schedule).toEqual(["1261", "1269", "1275", "1281", "1289", "1295"]);
    await expect(page.getByRole("heading", { name: "Your profile", exact: true })).toBeVisible();
    await page.goto("/welcome");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
}

for (const [width, count] of [[817, 1], [390, 2], [390, 3]]) {
  test(`skills finale gathers ${count} chips and reveals dashboard at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Sign in with LEARN" }).click();
    const next = page.getByRole("button", { name: /^(Continue|Confirm schedule)$/ });
    await next.click();
    await expect(page.getByText(/We made this space to help creative people/)).toBeVisible();
    await next.click();
    await expect(page.getByLabel("First name", { exact: true })).toBeVisible();
    await next.click();
    await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
    await next.click();
    await expect(page.getByRole("heading", { name: "Put a face to your name." })).toBeVisible();
    await next.click();
    await page.getByRole("button", { name: "Continue without photo", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Program", exact: true })).toBeVisible();
    await next.click();
    await expect(page.getByRole("heading", { name: /Does this schedule look right|When do you plan to work/ })).toBeVisible();
    await page.screenshot({ path: `test-results/onboarding-schedule-${page.viewportSize()?.width}.png` });
    await next.click();
    await expect(page.getByRole("heading", { name: "What are your top skills?" })).toBeVisible();
    const selected = ["Design Engineering", "Industrial Design", "Product Design"].slice(0, count);
    for (const name of selected) await page.getByRole("checkbox", { name, exact: true }).check();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    // Allow the newly enabled entry animation to settle before recording source positions.
    await page.locator('fieldset[class*="skillChoices"]').evaluate(async el => {
      await Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished));
    });
    await next.click();
    const finale = page.locator('[data-onboarding-finale]');
    await expect(finale).toHaveAttribute("data-phase", "gather");
    await expect(finale.locator('[data-finale-skill]')).toHaveCount(count);
    await expect(finale).toHaveAttribute("data-phase", "shake");
    const boxes = await finale.locator('[data-finale-skill]').evaluateAll(chips => chips.map(chip => {
      const rect = chip.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(19);
      expect(box.x + box.width).toBeLessThanOrEqual(width - 19);
      expect(box.y + box.height / 2).toBeCloseTo(422, 0);
    }
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].x).toBeGreaterThan(boxes[i - 1].x + boxes[i - 1].width);
    await page.screenshot({ path: `test-results/finale-row-${count}-${width}.png` });
    await expect(finale).toHaveAttribute("data-phase", "converge");
    await expect(finale).toHaveAttribute("data-phase", "logo");
    await expect(finale.getByRole("img", { name: "Design Waterloo" })).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(finale).toHaveAttribute("data-phase", "drop");
    await expect(finale).toHaveCount(0);
    const { member } = await (await request.get(CONTROL)).json();
    expect(member.specialties).toEqual(selected);
    expect(member.review_status).toBe("draft");
    expect(member.onboarding_completed).toBe(true);
  });
}

for (const status of ["draft", "approved"]) {
  test(`completed ${status} accounts only see onboarding when replay is explicit`, async ({ page, request }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await request.post(CONTROL, { data: { member: { onboarding_completed: true, review_status: status, is_approved: status === "approved" } } });
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Sign in with LEARN" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/welcome");
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/welcome?replay=false");
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/profile/edit?replay=true");
    await expect(page).toHaveURL(/\/welcome\?replay=true$/);
    await page.getByRole("button", { name: /^(Continue|Confirm schedule)$/ }).click();
    await expect(page.getByRole("heading", { name: "Welcome, Session." })).toBeVisible();
    const { member } = await (await request.get(CONTROL)).json();
    expect(member.onboarding_completed).toBe(true);
    expect(member.review_status).toBe(status);
  });
}

test("schedule supports stream choice, manual adjustment and back navigation", async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await request.post(CONTROL, { data: { member: { program: "Computer Engineering", graduating_class: "2031" } } });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in with LEARN" }).click();
  const next = page.getByRole("button", { name: /^(Continue|Confirm schedule)$/ });
  for (let i = 0; i < 6; i++) { await next.click(); if (i === 4) await page.getByRole("button", { name: "Continue without photo", exact: true }).click(); }
  await expect(page.getByRole("heading", { name: "Does this schedule look right?" })).toBeVisible();
  await page.getByRole("button", { name: "Stream 8", exact: true }).click();
  await expect(page.getByRole("button", { name: "Spring 2027", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Spring 2027", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Edit schedule", exact: true }).click();
  await page.getByRole("button", { name: "Spring 2027", exact: true }).click();
  await page.getByRole("button", { name: "Winter 2027", exact: true }).click();
  await next.click();
    await expect(page.getByRole("heading", { name: "What are your top skills?" })).toBeVisible();
  const { member } = await (await request.get(CONTROL)).json();
  expect(member.work_schedule).toContain("1271");
  expect(member.work_schedule).not.toContain("1275");
  expect(member.onboarding_completed).toBe(false);
  await page.getByRole("button", { name: "Previous slide" }).click();
  await expect(page.getByRole("button", { name: "Winter 2027", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Previous slide" }).click();
  await page.getByRole("combobox", { name: "Program", exact: true }).fill("Unlisted program");
  await next.click();
  await expect(page.getByRole("heading", { name: "When do you plan to work?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spring 2027", exact: true }).locator("span").first()).toHaveText("1B");
  await expect(page.getByRole("button", { name: "Winter 2027", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await next.click();
    await expect(page.getByRole("heading", { name: "What are your top skills?" })).toBeVisible();
  expect((await (await request.get(CONTROL)).json()).member.work_schedule).toEqual([]);
});

for (const [program, option, count] of [["Computer Science", "Sequence 4", 4], ["Accounting & Financial Management", "Stream 6", 6], ["Global Business & Digital Arts", "", 0]] as const) {
  test(`published schedule appears for ${program}`, async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await request.post(CONTROL, { data: { member: { program, graduating_class: "2030" } } });
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Sign in with LEARN" }).click();
    const next = page.getByRole("button", { name: /^(Continue|Confirm schedule)$/ });
    for (let i = 0; i < 6; i++) { await next.click(); if (i === 4) await page.getByRole("button", { name: "Continue without photo", exact: true }).click(); }
    await expect(page.getByRole("heading", { name: "Does this schedule look right?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Fall 2025", exact: true }).locator("span").first()).toHaveText("1A");
    if (count) {
      await expect(next).toBeEnabled();
      await expect(page.getByRole("group", { name: "Co-op sequence" }).getByRole("button").first()).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("group", { name: "Co-op sequence" }).getByRole("button")).toHaveCount(count);
      await page.getByRole("button", { name: option, exact: true }).click();
      await expect(next).toBeEnabled();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const slide = page.locator('[aria-labelledby="schedule-heading"]');
    const box = await slide.boundingBox();
    const progress = await page.getByRole("list", { name: "Onboarding step 6 of 7" }).boundingBox();
    const button = await next.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(progress!.y + progress!.height);
    expect(box!.y + box!.height).toBeLessThanOrEqual(button!.y);
    await page.screenshot({ path: `test-results/sequence-${count}.png`, fullPage: true });
    await next.click();
    await expect(page.getByRole("heading", { name: "What are your top skills?" })).toBeVisible();
    const { member } = await (await request.get(CONTROL)).json();
    expect(member.work_schedule.length).toBe(program === "Computer Science" ? 6 : 4);
    expect(member.onboarding_completed).toBe(false);
  });
}

test('unfinished onboarding resumes the last saved step after reload', async ({page}) => {
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/sign-in'); await page.getByRole('button',{name:'Sign in with LEARN'}).click();
 const next=page.getByRole('button',{name:/^(Continue|Confirm schedule)$/});
 await next.click(); await next.click(); await next.click();
 await expect(page.getByLabel('Username',{exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByLabel('Username',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Username',{exact:true})).toHaveValue('session-fixture');
});
