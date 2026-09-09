import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { validDeletionConfirmation } from '../src/lib/account-deletion';

test('account deletion requires both the exact phrase and current full name', () => {
  const good = { phrase: 'delete my account', fullName: 'Alex Demo' };
  assert.equal(validDeletionConfirmation(good, 'Alex Demo'), true);
  for (const body of [null, {}, {...good, phrase: 'DELETE MY ACCOUNT'}, {...good, phrase: 'delete my account '}, {...good, fullName: 'Alex'}, {...good, fullName: 'Someone Else'}, {...good, fullName: 123}]) {
    assert.equal(validDeletionConfirmation(body, 'Alex Demo'), false);
  }
  assert.equal(validDeletionConfirmation(good, 'Alex Changed'), false);
});

test('deleting the login removes only its profile and dependent records', async () => {
  const db = new PGlite();
  try {
    await db.exec(readFileSync('tests/database-fixture.sql', 'utf8'));
    await db.exec(`
      insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111111','delete@uwaterloo.ca'), ('22222222-2222-4222-8222-222222222222','keep@uwaterloo.ca');
      insert into members(id,auth_user_id,first_name,last_name,slug,school_email) values
        ('11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Delete','Me','delete-me','delete@uwaterloo.ca'),
        ('22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','Keep','Me','keep-me','keep@uwaterloo.ca');
      insert into member_experiences(member_id,company) select id,'Example' from members;
      delete from auth.users where email='delete@uwaterloo.ca';
    `);
    assert.deepEqual((await db.query('select slug from members')).rows, [{slug:'keep-me'}]);
    assert.deepEqual((await db.query('select member_id from member_experiences')).rows, [{member_id:'22222222-2222-4222-8222-222222222222'}]);
  } finally { await db.close(); }
});
