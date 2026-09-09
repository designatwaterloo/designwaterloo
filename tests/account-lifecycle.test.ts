import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
type Row = { member: { slug: string; onboardingCompleted: boolean }; auth_user_id: string | null; n: number; company: string; bio: string | null; review_status: string };
const uid = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
async function setup() {
  const db = new PGlite();
  await db.exec(readFileSync('tests/database-fixture.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260906010000_account_lifecycle.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260907010000_experience_import.sql','utf8'));
  await db.query<Row>(`insert into auth.users values ($1,'audit@uwaterloo.ca',now(),'{"full_name":"Audit Person"}'),($2,'other@uwaterloo.ca',now(),'{}')`,[uid,other]);
  await db.query<Row>(`select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.email','audit@uwaterloo.ca',false),set_config('request.jwt.claim.role','authenticated',false)`,[uid]);
  await db.exec('set role authenticated');
  return db;
}
test('account resolver is idempotent and ignores editable metadata for ownership', async () => {
 const db=await setup();
 try {
  await db.exec(`reset role; insert into public.members(first_name,last_name,slug,school_email) values('Other','Person','other','other@uwaterloo.ca');
   update auth.users set raw_user_meta_data='{"full_name":"Other Person","preferred_username":"other@uwaterloo.ca"}' where email='audit@uwaterloo.ca'; set role authenticated;`);
  const a=await db.query<Row>('select public.ensure_member() as member');
  const b=await db.query<Row>('select public.ensure_member() as member');
  assert.equal((a.rows[0]).member.slug,(b.rows[0]).member.slug);
  const result=await db.query<Row>('select auth_user_id from public.members where slug=\'other\'');
  assert.equal((result.rows[0]).auth_user_id,null);
  assert.equal((await db.query<Row>('select count(*)::int as n from public.members where auth_user_id=auth.uid()')).rows[0].n,1);
 } finally {await db.close();}
});
test('verified Azure alias links an existing migrated profile without changing its ID', async()=>{
 const db=await setup();try {
  await db.exec(`reset role; insert into auth.identities values('${uid}','azure','{"preferred_username":"watid@uwaterloo.ca"}');
    insert into public.members(first_name,last_name,slug,school_email,onboarding_completed) values('Audit','Person','migrated','watid@uwaterloo.ca',true); set role authenticated;`);
  const r=await db.query<Row>('select public.ensure_member() as member');assert.equal((r.rows[0]).member.slug,'migrated');
  assert.equal((r.rows[0]).member.onboardingCompleted,true);
 }finally {await db.close();}
});
test('a failed save rolls back profile, child deletions, and submission',async()=>{
 const db=await setup();try{
  await db.exec(`select public.ensure_member(); insert into public.member_experiences(member_id,company) select id,'Original' from public.members where auth_user_id=auth.uid();`);
  await assert.rejects(db.query<Row>('select public.save_my_profile($1,$2,$3,true)',[{bio:'changed',specialties:[],work_schedule:[]},[{company:null}],[]]));
  assert.equal((await db.query<Row>('select company from public.member_experiences')).rows[0].company,'Original');
  const m=(await db.query<Row>('select bio,review_status from public.members where auth_user_id=auth.uid()')).rows[0];assert.equal(m.bio,null);assert.equal(m.review_status,'draft');
  await db.query<Row>('select public.save_my_profile($1,$2,$3,true)',[{bio:'saved',specialties:[],work_schedule:[]},[{company:'Updated'}],[]]);
  assert.equal((await db.query<Row>('select review_status from public.members where auth_user_id=auth.uid()')).rows[0].review_status,'pending_review');
 }finally{await db.close();}
});
test('ordinary users cannot self-promote, self-approve or reassign ownership',async()=>{
 const db=await setup();try{
  await db.exec(`insert into public.members(auth_user_id,first_name,last_name,slug,school_email,is_admin,is_approved,review_status)
    values('${uid}','Audit','Person','audit','audit@uwaterloo.ca',true,true,'approved');`);
  let m=(await db.query<Row>('select is_admin,is_approved,review_status from public.members')).rows[0];assert.deepEqual(m,{is_admin:false,is_approved:false,review_status:'draft'});
  await db.exec(`update public.members set is_admin=true,is_approved=true,review_status='approved' where auth_user_id=auth.uid()`);
  m=(await db.query<Row>('select is_admin,is_approved from public.members')).rows[0];assert.deepEqual(m,{is_admin:false,is_approved:false});
  await assert.rejects(db.exec(`update public.members set auth_user_id='${other}' where auth_user_id=auth.uid()`));
 }finally{await db.close();}
});
test('an already claimed identifier fails without creating a duplicate',async()=>{
 const db=await setup();try{
  await db.exec(`reset role; insert into public.members(auth_user_id,first_name,last_name,slug,school_email) values('${other}','Other','Person','taken','audit@uwaterloo.ca'); set role authenticated;`);
  await assert.rejects(db.query('select public.ensure_member()'));
  assert.equal((await db.query<{n:number}>('select count(*)::int as n from public.members')).rows[0].n,1);
 }finally{await db.close();}
});
test('service-role review and ordinary-user resubmission keep approval state consistent',async()=>{
 const db=await setup();try{
  await db.exec(`select public.ensure_member(); reset role; set role service_role; select set_config('request.jwt.claim.role','service_role',false); update public.members set is_approved=true,review_status='approved';`);
  assert.equal((await db.query<{is_approved:boolean}>('select is_approved from public.members')).rows[0].is_approved,true);
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.role','authenticated',false);`);
  await db.query('select public.save_my_profile($1,$2,$3,true)',[{specialties:[],work_schedule:[]},[],[]]);
  assert.equal((await db.query<{is_approved:boolean}>('select is_approved from public.members')).rows[0].is_approved,false);
 }finally{await db.close();}
});

test('experience-only imports are atomic and leave profile details intact',async()=>{
 const db=await setup();try{
  await db.exec(`select public.ensure_member(); update public.members set bio='Keep me' where auth_user_id=auth.uid();`);
  const entries=[{position_title:'Designer',company:'Studio',start_year:'2024',end_year:'2025',description:'Built things'}];
  await db.query('select public.save_my_experiences($1)',[entries]);
  assert.equal((await db.query<{description:string}>('select description from public.member_experiences')).rows[0].description,'Built things');
  assert.equal((await db.query<{bio:string}>('select bio from public.members where auth_user_id=auth.uid()')).rows[0].bio,'Keep me');
  await assert.rejects(db.query('select public.save_my_experiences($1)',[[{company:'Missing title'}]]));
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.member_experiences')).rows[0].n,1);
 }finally{await db.close();}
});
