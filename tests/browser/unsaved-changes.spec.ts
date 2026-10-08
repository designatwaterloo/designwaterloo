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
 await expect(page.getByRole('link',{name:destination,exact:true})).toHaveAttribute('aria-disabled','true');
 await expect(page.getByRole('textbox',{name:'Bio',exact:true})).toHaveValue('Unfinished bio');
 await expect(page).toHaveURL(/\/dashboard/);
});
test('username changes and reverting are tracked in account settings',async({page})=>{
 await login(page);await page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Account',exact:true}).click();
 await page.getByRole('textbox',{name:'Username',exact:true}).fill('changed-fixture');await page.getByRole('link',{name:'Back to directory',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Keep editing'}).click();
 await page.getByRole('textbox',{name:'Username',exact:true}).fill('session-fixture');await page.getByRole('link',{name:'Back to directory',exact:true}).click();await expect(page).toHaveURL(`${APP}/directory`);
});
test('unfinished position remains after cancelled navigation',async({page})=>{
 await login(page);await page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Experience',exact:true}).click();
 await page.getByRole('button',{name:'Edit experience',exact:true}).click();await page.getByRole('button',{name:'+ Add position',exact:true}).click();await page.getByRole('textbox',{name:'Title',exact:true}).fill('Unfinished role');
 await expect(page.getByRole('link',{name:'Back to directory',exact:true})).toHaveAttribute('aria-disabled','true');
 await page.getByRole('link',{name:'Home',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Keep editing'}).click();await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Unfinished role');
});
test('saving clears guard and failed saves preserve it',async({page,request})=>{
 await login(page);await page.getByRole('button',{name:'Edit bio'}).click();await page.getByRole('textbox',{name:'Bio',exact:true}).fill('Saved bio');
 await request.post(CONTROL,{data:{failSave:true}});await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.locator('p[role=alert]')).toContainText('Couldn’t save');
 await expect(page.getByRole('link',{name:'Back to directory',exact:true})).toHaveAttribute('aria-disabled','true');
 await request.post(CONTROL,{data:{failSave:false}});await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Changes saved.');await page.getByRole('link',{name:'Back to directory',exact:true}).click();await expect(page).toHaveURL(`${APP}/directory`);
});
test('refresh warns about unsaved account changes',async({page})=>{
 await login(page);await page.getByRole('button',{name:'Edit bio'}).click();await page.getByRole('textbox',{name:'Bio',exact:true}).fill('Unfinished bio');
 const warning=page.waitForEvent('dialog');const reload=page.reload({timeout:3000}).catch(()=>{});const dialog=await warning;expect(dialog.type()).toBe('beforeunload');await dialog.dismiss();await reload;await expect(page.getByRole('textbox',{name:'Bio',exact:true})).toHaveValue('Unfinished bio');
});

test('sidebar navigation is disabled while editing',async({page})=>{
 await login(page);await page.getByRole('button',{name:'Edit bio'}).click();await page.getByRole('textbox',{name:'Bio',exact:true}).fill('Unfinished bio');
 const nav=page.getByRole('navigation',{name:'Account workspace'});
 await expect(nav.getByRole('button',{name:'Experience',exact:true})).toBeDisabled();
 await expect(nav.getByRole('button',{name:'Availability',exact:true})).toBeDisabled();
 await expect(nav.getByRole('button',{name:'Account',exact:true})).toBeDisabled();
 await expect(page.getByRole('link',{name:'Back to directory',exact:true})).toHaveAttribute('aria-disabled','true');
 await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeDisabled();
 await expect(page.getByRole('textbox',{name:'Bio',exact:true})).toHaveValue('Unfinished bio');
});
test('unchanged editors still disable switching pages',async({page})=>{
 await login(page);await page.getByRole('button',{name:'Edit bio'}).click();
 await expect(page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Experience',exact:true})).toBeDisabled();
 await expect(page.getByRole('link',{name:'Back to directory',exact:true})).toHaveAttribute('aria-disabled','true');
 await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Experience',exact:true}).click();await expect(page.getByRole('heading',{name:'Experience',exact:true})).toBeVisible();
});
test('leadership back warns before discarding unsaved roles',async({page})=>{
 await login(page);await page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Experience',exact:true}).click();
 await page.getByRole('button',{name:'Edit leadership',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Experience',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'+ Add leadership role',exact:true}).click();await page.getByRole('textbox',{name:'Title',exact:true}).fill('Unfinished lead');
 await page.getByRole('button',{name:'Back to experience',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Leave without saving?'})).toBeVisible();
 await page.getByRole('dialog').getByRole('button',{name:'Keep editing'}).click();
 await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Unfinished lead');
 await page.getByRole('button',{name:'Back to experience',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Discard and leave'}).click();
 await expect(page.getByRole('heading',{name:'Experience',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Leadership',exact:true})).toBeVisible();
});
test('section search warns before discarding a username edit',async({page})=>{
 await login(page);await page.getByRole('navigation',{name:'Account workspace'}).getByRole('button',{name:'Account',exact:true}).click();await page.getByRole('textbox',{name:'Username',exact:true}).fill('unfinished-username');
 await page.getByRole('searchbox',{name:'Search sections'}).fill('positions');await page.getByRole('button',{name:'Positions Experience'}).click();await expect(page.getByRole('dialog',{name:'Leave without saving?'})).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Discard and leave'}).click();await expect(page.getByRole('heading',{name:'Experience',exact:true})).toBeVisible();
});
