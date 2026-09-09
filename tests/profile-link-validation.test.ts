import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('database rejects social domain spoofing without blocking unchanged legacy links', async () => {
 const db = new PGlite();
 try {
  await db.exec(readFileSync('tests/database-fixture.sql','utf8'));
  await db.exec("insert into members(first_name,last_name,slug,school_email,github) values('Test','Person','test','test@uwaterloo.ca','https://legacy.example');");
  await db.exec(readFileSync('supabase/migrations/20260909020000_profile_link_validation.sql','utf8'));
  await db.exec("update members set bio='Updated',github=github;");
  for (const value of ['https://github.com.evil.example/user','https://github.com@evil.example/user','javascript:alert(1)','https://example.com/user']) {
   await assert.rejects(db.query('update members set github=$1',[value]));
  }
  await db.exec("update members set github='https://github.com/example',instagram='https://instagram.com/example',twitter='https://x.com/example',linkedin='https://www.linkedin.com/in/example';");
  await db.exec("update members set github=null;");
 } finally {await db.close();}
});
