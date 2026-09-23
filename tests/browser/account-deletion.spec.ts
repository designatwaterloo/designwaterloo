import {test, expect} from '@playwright/test';
const control = `http://127.0.0.1:${process.env.DW_TEST_DB_PORT || 54329}/__control`;
test('deletion needs both confirmations, traps focus, and keeps failures recoverable', async ({page, request, context}) => {
  await context.route('**/*', r => ['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
  await request.post(control, {data:{reset:true}});
  await page.goto('/sign-in');
  await page.getByRole('button',{name:'Sign in with LEARN'}).click();
  await page.getByRole('button',{name:'Account',exact:true}).click();
  await page.getByRole('button',{name:'Delete account',exact:true}).click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button',{name:'Delete my account',exact:true});
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Type “delete my account”').fill('delete my account');
  await expect(confirm).toBeDisabled();
  const state = await (await request.get(control)).json();
  await page.getByLabel(/Enter your full name:/).fill(`${state.member.first_name} ${state.member.last_name}`);
  await expect(confirm).toBeEnabled();
  await confirm.focus(); await page.keyboard.press('Tab');
  await expect(dialog.locator('input').first()).toBeFocused();
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  await page.route('**/api/account/delete', async route => { await pending; await route.fulfill({status:503,json:{error:'Please try again.'}}); });
  await confirm.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  finish();
  await expect(dialog.getByRole('alert')).toContainText('Please try again.');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Delete account',exact:true})).toBeFocused();
});

test('delete endpoint rejects bypasses and deletes only the signed-in fixture account', async ({page, request, context}) => {
  await context.route('**/*', r => ['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
  await request.post(control, {data:{reset:true}});
  const origin = `http://localhost:${process.env.DW_TEST_APP_PORT || 3100}`;
  const body = {fullName:'Session Fixture', phrase:'delete my account'};
  expect((await context.request.post('/api/account/delete', {headers:{Origin:origin},data:body})).status()).toBe(401);
  await page.goto('/sign-in'); await page.getByRole('button',{name:'Sign in with LEARN'}).click();
  expect((await context.request.post('/api/account/delete', {headers:{Origin:'https://elsewhere.example'},data:body})).status()).toBe(403);
  for (const invalid of [{...body,phrase:'delete'}, {...body,fullName:'Someone Else'}, {memberId:'other',phrase:body.phrase}]) {
    expect((await context.request.post('/api/account/delete', {headers:{Origin:origin},data:invalid})).status()).toBe(400);
  }
  await context.addCookies([{name:'dw-imp-as',value:'test',url:origin}]);
  expect((await context.request.post('/api/account/delete', {headers:{Origin:origin},data:body})).status()).toBe(403);
  await context.clearCookies({name:'dw-imp-as'});
  await request.post(control,{data:{failDelete:true}});
  expect((await context.request.post('/api/account/delete', {headers:{Origin:origin},data:body})).status()).toBe(500);
  expect((await(await request.get(control)).json()).deletions).toBe(0);
  await request.post(control,{data:{failDelete:false}});
  expect((await context.request.post('/api/account/delete', {headers:{Origin:origin},data:body})).status()).toBe(200);
  expect((await(await request.get(control)).json()).deletions).toBe(1);
  await page.goto('/dashboard'); await expect(page).toHaveURL(/\/sign-in/);
});
