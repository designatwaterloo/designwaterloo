import {test,expect,type Page} from '@playwright/test';
const APP=`http://localhost:${process.env.DW_TEST_APP_PORT||3100}`;
const CONTROL=`http://127.0.0.1:${process.env.DW_TEST_DB_PORT||54329}/__control`;
const questions={community:'What do you feel is missing from the design community on campus?',interests:'What areas are you interested in contributing to or exploring?',proud_of:'What have you created or contributed to in your field that you’re proud of, and why?'};
async function login(page:Page){await page.goto('/apply');await page.getByRole('link',{name:'Sign in or create an account'}).click();await page.getByRole('button',{name:'Sign in with LEARN'}).click();await expect(page).toHaveURL(`${APP}/apply`);await expect(page.getByRole('textbox',{name:questions.community})).toBeVisible();}
async function fill(page:Page){await page.getByRole('textbox',{name:questions.community}).fill('More opportunities to show unfinished work.');await page.getByRole('textbox',{name:questions.interests}).fill('Editorial and exhibitions.');await page.getByRole('textbox',{name:questions.proud_of}).fill('A zine we made as a group. I’m proud that everyone had a voice.');await expect(page.getByRole('status')).toHaveText('All changes saved');}
test.beforeEach(async({request,context})=>{await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());await request.post(CONTROL,{data:{reset:true,member:{profile_image_url:'/person.svg',specialties:['Graphic Design']}}});});

test('public entry shows sign-in, keeps answers private, and preserves the application destination',async({page,request})=>{
 await page.goto('/apply');await expect(page.getByRole('heading',{name:'Sign in to apply'})).toBeVisible();await expect(page.getByRole('textbox')).toHaveCount(0);expect((await request.get(`${APP}/api/core-team/application`)).status()).toBe(401);
 await login(page);await expect(page.getByRole('textbox',{name:questions.community})).toHaveValue('');
});
test('draft autosaves, resumes after reload, and submits once without publishing a profile',async({page,request})=>{
 await request.post(CONTROL,{data:{member:{is_approved:false,review_status:'draft'}}});await login(page);await fill(page);await page.reload();await expect(page.getByRole('textbox',{name:questions.community})).toHaveValue('More opportunities to show unfinished work.');
 await page.getByRole('button',{name:'Submit application',exact:true}).click();await expect(page.getByRole('heading',{name:'Thanks for applying.'})).toBeVisible();const state=await(await request.get(CONTROL)).json();expect(state.coreApplication.status).toBe('submitted');expect(state.member.is_approved).toBe(false);expect(state.coreApplication.profile_snapshot.bio).toBe('Synthetic browser test profile.');await page.reload();await expect(page.getByRole('heading',{name:'Thanks for applying.'})).toBeVisible();await expect(page.getByRole('textbox',{name:questions.community})).toBeDisabled();
});
test('incomplete profiles can save answers but cannot submit, including a direct API request',async({page,request})=>{
 await request.post(CONTROL,{data:{member:{bio:'',profile_image_url:null}}});await login(page);await fill(page);await expect(page.getByRole('button',{name:'Submit application',exact:true})).toBeDisabled();await expect(page.getByRole('link',{name:'Bio — complete this'})).toBeVisible();const app=(await(await request.get(CONTROL)).json()).coreApplication;
 const response=await page.request.post(`${APP}/api/core-team/application`,{headers:{Origin:APP},data:{answers:app.answers,revision:app.revision}});expect(response.status()).toBe(422);
});
test('save failure preserves text and retry saves successfully',async({page,request})=>{
 await login(page);await request.post(CONTROL,{data:{failSave:true}});await page.getByRole('textbox',{name:questions.community}).fill('Keep this answer through a failure.');await expect(page.locator('main [role="alert"]')).toContainText('Couldn’t save');await expect(page.getByRole('textbox',{name:questions.community})).toHaveValue('Keep this answer through a failure.');
 await page.getByRole('link',{name:'Back to your profile'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Keep editing'}).click();await request.post(CONTROL,{data:{failSave:false}});await page.getByRole('button',{name:'Retry save'}).click();await expect(page.getByRole('status')).toHaveText('All changes saved');
});
test('edits made during an autosave are saved by a subsequent request',async({page,request})=>{
 await login(page);await request.post(CONTROL,{data:{coreDelay:1200}});await page.getByRole('textbox',{name:questions.community}).fill('First draft');await expect(page.getByRole('status')).toHaveText('Saving…');await page.getByRole('textbox',{name:questions.community}).fill('Second draft while saving');await expect.poll(async()=>(await(await request.get(CONTROL)).json()).coreApplication?.answers.community).toBe('Second draft while saving');await expect(page.getByRole('status')).toHaveText('All changes saved');
});
test('a stale tab cannot silently overwrite another tab',async({page,context,request})=>{
 await login(page);const other=await context.newPage();await other.goto('/apply');await expect(other.getByRole('textbox',{name:questions.community})).toBeVisible();await page.getByRole('textbox',{name:questions.community}).fill('First tab answer');await expect(page.getByRole('status')).toHaveText('All changes saved');await other.getByRole('textbox',{name:questions.community}).fill('Other tab answer');await expect(other.locator('main [role="alert"]')).toContainText('changed in another tab');expect((await(await request.get(CONTROL)).json()).coreApplication.answers.community).toBe('First tab answer');await expect(other.getByRole('textbox',{name:questions.community})).toHaveValue('Other tab answer');
});
for(const width of [1440,390])test(`application layout at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await login(page);await page.screenshot({path:`test-results/core-team-${width}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('new members return to apply instead of being sent into an unrelated flow',async({page,request})=>{
 await request.post(CONTROL,{data:{member:{onboarding_completed:false,review_status:'draft',is_approved:false}}});await login(page);await expect(page.getByRole('link',{name:'Account setup — complete this'})).toHaveAttribute('href','/welcome?redirectTo=%2Fapply');
});

test('only full admins can review submitted applications',async({page,request})=>{
 await login(page);await fill(page);await page.getByRole('button',{name:'Submit application',exact:true}).click();await expect(page.getByRole('heading',{name:'Thanks for applying.'})).toBeVisible();
 await page.goto('/admin/core-team');await expect(page).not.toHaveURL(/\/admin\/core-team$/);await expect(page.getByText('More opportunities to show unfinished work.',{exact:true})).toHaveCount(0);
 await request.post(CONTROL,{data:{member:{is_admin:true}}});await page.goto('/admin/core-team');await expect(page.getByRole('heading',{name:'Applications',exact:true})).toBeVisible();await page.locator('summary').filter({hasText:'Session Fixture'}).click();await expect(page.getByText('More opportunities to show unfinished work.',{exact:true})).toBeVisible();
});
test('completed onboarding preserves the application return destination',async({page})=>{
 await login(page);await page.goto('/welcome?redirectTo=%2Fapply');await expect(page).toHaveURL(`${APP}/apply`);await expect(page.getByRole('textbox',{name:questions.community})).toBeVisible();
});

test('preview supports the exact loopback IP sign-in address',async({page})=>{
 await page.goto(APP.replace('localhost','127.0.0.1')+'/apply');
 await page.getByRole('link',{name:'Sign in or create an account'}).click();
 await expect(page.getByRole('heading',{name:'Sign in to apply'})).toBeVisible();
 await page.getByRole('button',{name:'Sign in with LEARN'}).click();
 await expect(page).toHaveURL(APP.replace('localhost','127.0.0.1')+'/apply');
 await expect(page.getByRole('textbox',{name:questions.community})).toBeVisible();
 await page.getByRole('textbox',{name:questions.community}).fill('Loopback test answer');
 await expect(page.getByRole('status')).toHaveText('All changes saved');
});

test('recruitment banner is localhost-only on the homepage',async({page})=>{
 await page.setViewportSize({width:868,height:964});await page.goto('/');
 const banner=page.getByRole('complementary',{name:'Core team recruitment'});
 await expect(banner).toBeVisible();
 const bounds=await banner.boundingBox();const header=await page.locator('header:visible').boundingBox();
 expect(bounds!.y).toBe(8);expect(bounds!.x).toBe(32);expect(bounds!.width).toBe(804);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(header!.y);
 await page.screenshot({path:'test-results/recruitment-home.png'});
 await page.goto('/apply');await page.screenshot({path:'test-results/recruitment-entry.png'});
 await page.getByRole('link',{name:'Sign in or create an account'}).click();
 await expect(page.getByRole('heading',{name:'Sign in to apply'})).toBeVisible();
 await expect(page.getByRole('dialog')).toBeVisible();await page.waitForTimeout(700);await page.screenshot({path:'test-results/recruitment-sign-in.png'});
});
