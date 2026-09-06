import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { validateUsername } from '../src/lib/usernames';
import { profileDestination } from '../src/lib/profile-urls';

const first = '11111111-1111-4111-8111-111111111111';
const second = '22222222-2222-4222-8222-222222222222';
async function setup() {
  const db = new PGlite();
  await db.exec(readFileSync('tests/database-fixture.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20260906010000_account_lifecycle.sql', 'utf8'));
  await db.exec(`insert into auth.users values ('${first}','first@uwaterloo.ca',now(),'{}'),('${second}','second@uwaterloo.ca',now(),'{}');`);
  await db.exec(`insert into public.members(auth_user_id,first_name,last_name,slug,school_email,is_approved,onboarding_completed)
    values('${first}','First','Member','first-member','first@uwaterloo.ca',true,true),
    ('${second}','Second','Member','second-member','second@uwaterloo.ca',false,true);`);
  await db.exec(readFileSync('supabase/migrations/20260907010000_editable_usernames.sql', 'utf8'));
  await asUser(db, first);
  return db;
}
async function asUser(db: PGlite, uid: string) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${uid}',false),set_config('request.jwt.claim.role','authenticated',false); set role authenticated;`);
}
async function value<T>(db: PGlite, sql: string, params: unknown[] = []) {
  return (await db.query<{ value: T }>(sql, params)).rows[0].value;
}

test('username syntax is explicit and profile redirects preserve query parameters safely', () => {
  assert.deepEqual(validateUsername(' @BMP '), { ok: true, normalized: 'bmp' });
  for (const input of ['ab', 'admin', 'work', 'a'.repeat(41), 'a.b', 'a_b', 'a--b', '-abc', 'abc-', '../bmp']) {
    assert.equal(validateUsername(input).ok, false, input);
  }
  assert.equal(profileDestination('bmp', { edit: 'true', tag: ['a', 'b'] }), '/@bmp?edit=true&tag=a&tag=b');
});

test('renames preserve member identity and all previous handles resolve directly to the current one', async () => {
  const db = await setup();
  try {
    const id = await value<string>(db, "select id as value from members where slug='first-member'");
    await db.exec("insert into member_experiences(member_id,company) select id,'Studio' from members where slug='first-member'");
    await db.exec("select change_my_username('BMP','first-member'); select change_my_username('new-name','bmp')");
    assert.equal(await value(db, "select id as value from members where slug='new-name'"), id);
    assert.equal(await value(db, "select member_id as value from member_experiences where company='Studio'"), id);
    for (const old of ['first-member', 'bmp', 'NEW-NAME']) {
      assert.equal(await value(db, 'select resolve_username($1) as value', [old]), 'new-name');
    }
    await db.exec("select change_my_username('first-member','new-name')");
    assert.equal(await value(db, "select resolve_username('bmp') as value"), 'first-member');
  } finally { await db.close(); }
});

test('current and historical usernames cannot be stolen via RPC, direct updates, or inserts', async () => {
  const db = await setup();
  try {
    await db.exec("select change_my_username('bmp','first-member')");
    await asUser(db, second);
    for (const handle of ['first-member', 'bmp']) {
      assert.equal(await value(db, 'select username_available($1) as value', [handle]), false);
      await assert.rejects(db.query('select change_my_username($1,$2)', [handle, 'second-member']), /taken or reserved/);
      await assert.rejects(db.query('update members set slug=$1 where auth_user_id=auth.uid()', [handle]), /taken or reserved/);
    }
    await assert.rejects(db.exec("update username_claims set member_id=null"), /permission denied/);
    await db.exec('reset role');
    await assert.rejects(db.exec("insert into members(first_name,last_name,slug,school_email) values('New','User','first-member','new@uwaterloo.ca')"), /taken or reserved/);
    assert.equal(await value(db, "select slug as value from members where auth_user_id='" + second + "'"), 'second-member');
  } finally { await db.close(); }
});

test('validation, stale saves, and anonymous writes fail without changing the account', async () => {
  const db = await setup();
  try {
    for (const candidate of ['ab','a_b','admin','a'.repeat(41)]) {
      await assert.rejects(db.query('select change_my_username($1,$2)', [candidate, 'first-member']));
    }
    await db.exec("select change_my_username('bmp','first-member')");
    await assert.rejects(db.exec("select change_my_username('outdated','first-member')"), /profile changed/);
    await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role anon");
    await assert.rejects(db.exec("select change_my_username('steal','bmp')"), /permission denied/);
    assert.equal(await value(db, "select resolve_username('first-member') as value"), 'bmp');
    assert.equal(await value(db, "select resolve_username('second-member') as value"), null);
    await asUser(db, second);
    assert.equal(await value(db, "select resolve_username('second-member') as value"), 'second-member');
  } finally { await db.close(); }
});

test('deleted accounts retain reservations and no longer resolve', async () => {
  const db = await setup();
  try {
    await db.exec("select change_my_username('bmp','first-member'); reset role; delete from members where slug='bmp'");
    await asUser(db, second);
    assert.equal(await value(db, "select resolve_username('first-member') as value"), null);
    assert.equal(await value(db, "select username_available('bmp') as value"), false);
    await assert.rejects(db.exec("select change_my_username('bmp','second-member')"), /taken or reserved/);
  } finally { await db.close(); }
});

test('automatic onboarding handles short, reserved, long names and previously reserved usernames', async () => {
  const db = await setup();
  try {
    await db.exec("select change_my_username('bmp','first-member'); reset role; delete from members where slug='bmp'");
    for (const name of ['A', 'Admin', 'X'.repeat(100), 'First Member', '!!']) {
      await db.exec(`reset role; delete from auth.users where id='${first}';`);
      await db.query('insert into auth.users values ($1,$2,now(),$3)', [first, 'new@uwaterloo.ca', { full_name: name }]);
      await asUser(db, first);
      const result = await value<{ slug: string }>(db, 'select ensure_member() as value');
      assert.equal(validateUsername(result.slug).ok, true);
      assert.notEqual(result.slug, 'first-member');
      await db.exec(`reset role; delete from members where auth_user_id='${first}'`);
    }
  } finally { await db.close(); }
});
