import { test, expect, type Page } from '@playwright/test';
const APP=`http://localhost:${process.env.DW_TEST_APP_PORT||3100}`;
const CONTROL=`http://127.0.0.1:${process.env.DW_TEST_DB_PORT||54329}/__control`;
async function login(page:Page) {
 await page.goto('/sign-in');await page.getByRole('button',{name:'Sign in with LEARN'}).click();
 await expect(page.getByRole('heading',{name:'Your profile',exact:true})).toBeVisible();
}
test.beforeEach(async({request,context})=>{
 await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 await request.post(CONTROL,{data:{reset:true}});
});
for(const destination of ['Back to directory','View public profile ↗'])test(`dirty profile blocks ${destination}`,async({page})=>{
 await login(page);await page.getByRole('button',{name:'Edit bio'}).click();await page.getByRole('textbox',{name:'Bio',exact:true}).fill('Unfinished bio');
 await page.getByRole('link',{name:destination,exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Leave without saving?'});await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Keep editing'})).toBeFocused();await page.keyboard.press('Escape');
 await expect(page.getByRole('textbox',{name:'Bio',exact:true})).toHaveValue('Unfinished bio');
 await page.getByRole('link',{name:destination,exact:true}).click();await dialog.getByRole('button',{name:'Discard and leave'}).click();
 await expect(page).toHaveURL(`${APP}${destination==='Back to directory'?'/directory':'/@session-fixture'}`);
});
test('username changes and reverting are tracked in account settings',async({page})=>{
 await login(page);await page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Account',exact:true}).click();
 await page.getByRole('textbox',{name:'Username',exact:true}).fill('changed-fixture');await page.getByRole('link',{name:'Back to directory',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Keep editing'}).click();
 await page.getByRole('textbox',{name:'Username',exact:true}).fill('session-fixture');await page.getByRole('link',{name:'Back to directory',exact:true}).click();await expect(page).toHaveURL(`${APP}/directory`);
});
test('unfinished position remains after cancelled navigation',async({page})=>{
 await login(page);await page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Experience',exact:true}).click();
 await page.getByRole('button',{name:'Edit experience',exact:true}).click();await page.getByRole('button',{name:'+ Add position',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Unfinished role');
 await page.getByRole('link',{name:'Back to directory',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Keep editing'}).click();await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Unfinished role');
});
test('saving clears guard and failed saves preserve it',async({page,request})=>{
 await login(page);await page.getByRole('button',{name:'Edit bio'}).click();await page.getByRole('textbox',{name:'Bio',exact:true}).fill('Saved bio');
 await request.post(CONTROL,{data:{failSave:true}});await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.locator('p[role=alert]')).toContainText('Couldn’t save');
 await page.getByRole('link',{name:'Back to directory',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Keep editing'}).click();
 await request.post(CONTROL,{data:{failSave:false}});await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Changes saved.');await page.getByRole('link',{name:'Back to directory',exact:true}).click();await expect(page).toHaveURL(`${APP}/directory`);
});
test('refresh warns about unsaved account changes',async({page})=>{
 await login(page);await page.getByRole('button',{name:'Edit bio'}).click();await page.getByRole('textbox',{name:'Bio',exact:true}).fill('Unfinished bio');
 const warning=page.waitForEvent('dialog');const reload=page.reload({timeout:3000}).catch(()=>{});const dialog=await warning;expect(dialog.type()).toBe('beforeunload');await dialog.dismiss();await reload;await expect(page.getByRole('textbox',{name:'Bio',exact:true})).toHaveValue('Unfinished bio');
});

test('sidebar navigation warns instead of disabling pages',async({page})=>{
 await login(page);await page.getByRole('button',{name:'Edit bio'}).click();await page.getByRole('textbox',{name:'Bio',exact:true}).fill('Unfinished bio');
 const experience=page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Experience',exact:true});
 await expect(experience).toBeEnabled();await experience.click();
 await page.getByRole('dialog').getByRole('button',{name:'Keep editing'}).click();await expect(page.getByRole('textbox',{name:'Bio',exact:true})).toHaveValue('Unfinished bio');
 await experience.click();await page.getByRole('dialog').getByRole('button',{name:'Discard and leave'}).click();await expect(page.getByRole('heading',{name:'Experience',exact:true})).toBeVisible();
 await page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Profile',exact:true}).click();await expect(page.getByText('Synthetic browser test profile.',{exact:true})).toBeVisible();
});
test('unchanged editors allow switching pages immediately',async({page})=>{
 await login(page);await page.getByRole('button',{name:'Edit bio'}).click();await page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Experience',exact:true}).click();await expect(page.getByRole('heading',{name:'Experience',exact:true})).toBeVisible();await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('section search warns before discarding a username edit',async({page})=>{
 await login(page);await page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Account',exact:true}).click();await page.getByRole('textbox',{name:'Username',exact:true}).fill('unfinished-username');
 await page.getByRole('searchbox',{name:'Search sections'}).fill('positions');await page.getByRole('button',{name:'Your positions Experience'}).click();await expect(page.getByRole('dialog',{name:'Leave without saving?'})).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Discard and leave'}).click();await expect(page.getByRole('heading',{name:'Experience',exact:true})).toBeVisible();
});
