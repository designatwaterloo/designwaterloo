import {test, expect} from '@playwright/test';
const control=`http://127.0.0.1:${process.env.DW_TEST_DB_PORT||54329}/__control`;
test.beforeEach(async ({request,context})=>{
 await request.post(control,{data:{reset:true}});
 await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
});
for(const width of [1440,390])test(`sign-in opens over directory and restores it at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.goto('/directory');
 const opener=page.getByRole('link',{name:'Sign in',exact:true}).filter({visible:true});
 await opener.click();
 const dialog=page.getByRole('dialog',{name:'Your work belongs here.'});
 await expect(dialog).toBeVisible();
 await expect(page).toHaveURL(/\/sign-in$/);
 await expect(page.locator('body')).toHaveCSS('overflow','hidden');
 await dialog.getByRole('button',{name:'Sign in with @mylaurier.ca',exact:true}).click();
 await expect(dialog.getByRole('textbox',{name:'Laurier username'})).toBeVisible();
 await page.screenshot({path:`test-results/sign-in-modal-${width}.png`});
 const box=await dialog.boundingBox();expect(box!.width).toBeLessThanOrEqual(width-24);
 await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);await expect(page).toHaveURL(/\/directory$/);
 await expect(opener).toBeFocused();
 await page.goForward();await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'Close sign in'}).click();await expect(dialog).toHaveCount(0);
});
test('direct sign-in, reload, and OAuth redirect work with the modal',async({page})=>{
 await page.goto('/sign-in?redirectTo=%2Fdashboard');
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.reload();await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button',{name:'Sign in with LEARN'}).click();
 await expect(page).toHaveURL(/\/dashboard$/);
 await expect(page.getByRole('heading',{name:'Your profile',exact:true})).toBeVisible();
 await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('navigation menu sign-in opens one active modal and keeps the page locked',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Open navigation'}).click();
 await page.getByRole('dialog',{name:'Site navigation'}).getByRole('link',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Your work belongs here.'})).toBeVisible();
 await expect(page.getByRole('dialog',{name:'Site navigation'})).toBeHidden();
 await expect(page.locator('body')).toHaveCSS('overflow','hidden');
 await page.getByRole('button',{name:'Close sign in'}).click();
 await expect(page).toHaveURL(/\/$/);
 await expect(page.getByRole('dialog',{name:'Your work belongs here.'})).toHaveCount(0);
});
