import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { emptyAnswers, parseAnswers, applicationErrors, profileRequirements } from '../src/lib/core-team';
import type { CoreTeamApplication } from '../src/lib/core-team';
import type { Member } from '../src/types/database';
const uid='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222', admin='33333333-3333-4333-8333-333333333333';
const answers={...emptyAnswers,community:'More spaces to share unfinished work.',interests:'Editorial and exhibitions.',proud_of:'A zine we made together.'};
async function setup(){const db=new PGlite();await db.exec(readFileSync('tests/database-fixture.sql','utf8'));await db.exec(readFileSync('supabase/migrations/20260912010000_core_team_applications.sql','utf8'));for(const id of [uid,other,admin]){await db.query('insert into auth.users(id,email) values($1,$2)',[id,`${id}@uwaterloo.ca`]);await db.query(`insert into members(id,auth_user_id,first_name,last_name,slug,school_email,school,program,graduating_class,bio,profile_image_url,specialties,onboarding_completed,is_admin) values($1,$1,'Test','Person',$2,$2,'University of Waterloo','Design','2027','My bio','https://example.com/photo.png',array['Design'],true,$3)`,[id,`${id}@uwaterloo.ca`,id===admin]);}await asUser(db,uid);return db;}
async function asUser(db:PGlite,id:string){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function save(db:PGlite,a=answers,revision=0,submit=false){return (await db.query<{app:CoreTeamApplication}>('select to_jsonb(public.save_core_team_application($1,$2,$3)) as app',[a,revision,submit])).rows[0].app;}

test('application input accepts partial drafts but validates required answers and URLs for submission',()=>{
 assert.deepEqual(parseAnswers(emptyAnswers),emptyAnswers);assert.equal(parseAnswers({...answers,interests:42}),null);assert.equal(parseAnswers({...answers,community:'x'.repeat(6001)}),null);
 assert.equal(Object.keys(applicationErrors(emptyAnswers)).length,3);assert.equal(Object.keys(applicationErrors(answers)).length,0);assert.ok(applicationErrors({...answers,work_link:'javascript:alert(1)'}).work_link);
 const m={first_name:'A',last_name:'B',slug:'ab',school:'University of Waterloo',program:'Design',graduating_class:'2027',bio:'Bio',profile_image_url:'photo',specialties:['Design'],onboarding_completed:true,is_approved:false} as Member;
 assert.ok(profileRequirements(m).every(r=>r.complete));assert.ok(profileRequirements({...m,bio:' '}).some(r=>!r.complete));
});
test('drafts are private; writes are only through the versioned owner RPC',async()=>{const db=await setup();try{
 const a=await save(db);assert.equal(a.revision,1);assert.equal((await save(db)).revision,1);
 await assert.rejects(save(db,{...answers,community:'Stale update'},0),/another tab/);
 await assert.rejects(db.query("update core_team_applications set status='submitted' where id=$1",[a.id]),/permission denied/);
 await asUser(db,other);assert.equal((await db.query('select * from core_team_applications')).rows.length,0);
 await asUser(db,admin);assert.equal((await db.query('select * from core_team_applications')).rows.length,0);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from core_team_applications'),/permission denied/);await assert.rejects(save(db),/permission denied/);
}finally{await db.close();}});
test('profile completeness and required answers are enforced in the database',async()=>{const db=await setup();try{
 await assert.rejects(save(db,emptyAnswers,0,true),/required questions/);
 await db.exec(`reset role;update members set bio='' where id='${uid}';set role authenticated`);
 await assert.rejects(save(db,answers,0,true),/Complete your profile/);
 assert.equal((await db.query('select * from core_team_applications')).rows.length,0);
 await save(db,{...emptyAnswers,community:'A partial draft'});assert.equal((await db.query<{status:string}>('select status from core_team_applications')).rows[0].status,'draft');
}finally{await db.close();}});
test('submission is immutable, retry-safe, and preserves a private profile snapshot without publishing',async()=>{const db=await setup();try{
 const a=await save(db,answers,0,true);assert.equal(a.status,'submitted');assert.equal((await save(db,answers,0,true)).id,a.id);
 await assert.rejects(save(db,{...answers,interests:'Changed'},a.revision),/already submitted/);
 await db.exec(`reset role;update members set bio='New bio' where id='${uid}';set role authenticated`);
 assert.equal((await db.query<{profile_snapshot:{bio:string}}>('select profile_snapshot from core_team_applications')).rows[0].profile_snapshot.bio,'My bio');
 assert.equal((await db.query<{is_approved:boolean}>('select is_approved from members where id=$1',[uid])).rows[0].is_approved,false);
 await asUser(db,other);await save(db);await asUser(db,admin);const visible=await db.query('select member_id,status from core_team_applications');assert.deepEqual(visible.rows,[{member_id:uid,status:'submitted'}]);
}finally{await db.close();}});
test('database rejects oversized answers and unsafe links even without the API',async()=>{const db=await setup();try{
 await assert.rejects(save(db,{...answers,community:'x'.repeat(6001)}),/length or type/);
 await assert.rejects(save(db,{...answers,work_link:'javascript:alert(1)'},0,true),/Invalid project link/);
}finally{await db.close();}});
