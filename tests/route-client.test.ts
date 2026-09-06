import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '../src/lib/supabase/route-client';

test('OAuth redirect waits for deferred SDK session cookies, including chunked sessions', async () => {
 const previousUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,previousKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-key';
 const originalFetch=globalThis.fetch;
 const session={access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600,token_type:'bearer',user:{id:'fixture-user',aud:'authenticated',email:'fixture@uwaterloo.ca',created_at:'',app_metadata:{},user_metadata:{padding:'x'.repeat(5000)}}};
 globalThis.fetch=async()=>Response.json(session);
 try {
  const request=new NextRequest('http://localhost/auth/callback?code=synthetic', {headers:{cookie:`sb-fixture-auth-token-code-verifier=base64-${Buffer.from(JSON.stringify('verifier')).toString('base64url')}`}});
  const {client,waitForSessionCookies,applyCookies}=createRouteClient(request);
  const {data,error}=await client.auth.exchangeCodeForSession('synthetic');assert.equal(error,null);assert.ok(data.session);
  await waitForSessionCookies(data.session.access_token);
  const response=applyCookies(NextResponse.redirect('http://localhost/dashboard'));
  const chunks=response.cookies.getAll().filter(c=>/^sb-fixture-auth-token\.\d+$/.test(c.name)).sort((a,b)=>a.name.localeCompare(b.name));
  assert.ok(chunks.length>1,'fixture must exercise chunked cookies');
  const persisted=JSON.parse(Buffer.from(chunks.map(c=>c.value).join('').slice(7),'base64url').toString());
  assert.equal(persisted.access_token,session.access_token);
  assert.equal(persisted.refresh_token,session.refresh_token);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(response.cookies.get('sb-fixture-auth-token-code-verifier')?.value,'');
 } finally {
  globalThis.fetch=originalFetch;
  if(previousUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=previousUrl;
  if(previousKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=previousKey;
 }
});
