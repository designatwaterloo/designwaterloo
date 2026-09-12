import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the actual route with isolated service boundaries; no real uploads,
// credentials, database writes, or Next request context are needed.
const route = ts.transpileModule(
  readFileSync(new URL('../src/app/api/upload-image/route.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

type SaveResult = { data: { slug: string } | null; error: Error | null };

async function upload(save: () => Promise<SaveResult>) {
  const revalidated: string[] = [];
  const updates: unknown[] = [];
  const query = {
    update(value: unknown) { updates.push(value); return this; },
    eq(column: string, value: string) {
      assert.equal(column, 'auth_user_id');
      assert.equal(value, 'fixture-user');
      return this;
    },
    select() { return this; },
    maybeSingle: save,
  };
  const dependencies: Record<string, unknown> = {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/supabase/server': {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'fixture-user' } } }) },
        from: (table: string) => { assert.equal(table, 'members'); return query; },
      }),
    },
    '@sanity/client': {
      createClient: () => ({ assets: { upload: async () => ({ _id: 'image-fixture-20x20-png' }) } }),
    },
    'next/cache': { revalidatePath: (path: string) => revalidated.push(path) },
  };
  const exported: { POST?: (request: unknown) => Promise<Response> } = {};
  runInNewContext(route, {
    exports: exported,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    Buffer,
    console: { error() {}, log() {} },
    process: { env: {
      SANITY_API_TOKEN: 'synthetic',
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'fixture',
      NEXT_PUBLIC_SANITY_DATASET: 'test',
    } },
  });
  const data = new FormData();
  data.set('file', new File(['fixture'], 'avatar.png', { type: 'image/png' }));
  const response = await exported.POST!({ formData: async () => data });
  assert.equal(updates.length, 1);
  return { response, body: await response.json(), revalidated };
}

test('avatar upload succeeds only after the member update succeeds', async () => {
  const { response, body, revalidated } = await upload(async () => ({ data: { slug: 'designer' }, error: null }));
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.imageUrl, 'https://cdn.sanity.io/images/fixture/test/fixture-20x20.png');
  assert.deepEqual(revalidated, ['/directory/designer', '/directory']);
});

test('avatar upload reports a conflict when no member row is saved', async () => {
  const { response, body, revalidated } = await upload(async () => ({ data: null, error: null }));
  assert.equal(response.status, 409);
  assert.equal(body.success, undefined);
  assert.match(body.error, /couldn't be saved/);
  assert.deepEqual(revalidated, []);
});

for (const mode of ['returned', 'thrown'] as const) {
  test(`avatar upload reports a save failure for ${mode} database errors`, async () => {
    const { response, body, revalidated } = await upload(async () => {
      const error = new Error('private database detail');
      if (mode === 'thrown') throw error;
      return { data: null, error };
    });
    assert.equal(response.status, 500);
    assert.equal(body.success, undefined);
    assert.match(body.error, /couldn't be saved/);
    assert.doesNotMatch(body.error, /private database detail/);
    assert.deepEqual(revalidated, []);
  });
}
