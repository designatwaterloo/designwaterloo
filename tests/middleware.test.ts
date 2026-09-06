import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';
import { safeRedirect } from '../src/lib/auth/redirect';
const user={id:'11111111-1111-4111-8111-111111111111',email:'test@uwaterloo.ca',aud:'authenticated',app_metadata:{},user_metadata:{},created_at:''};
function request(path='/dashboard',expired=false) {
 const session={access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+(expired?-100:3600),token_type:'bearer',user};
 return new NextRequest('https://app.invalid'+path,{headers:{cookie:'sb-test-auth-token=base64-'+Buffer.from(JSON.stringify(session)).toString('base64url')}});
}
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-key';
test('a valid 3.2 second auth response does not redirect to sign-in',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>{await new Promise(r=>setTimeout(r,3200));return Response.json(user)};
 try {const r=await middleware(request());assert.equal(r.status,200);assert.equal(r.headers.get('location'),null);}finally{globalThis.fetch=previous;}
});
test('transient authentication failure is retryable and does not clear cookies',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({message:'unavailable'},{status:503});
 try {const r=await middleware(request());assert.equal(r.status,503);assert.equal(r.headers.get('location'),null);assert.equal(r.cookies.getAll().length,0);}finally{globalThis.fetch=previous;}
});
test('refresh cookies survive the sign-in redirect',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async(url)=>String(url).includes('/token')?Response.json({access_token:'refreshed',refresh_token:'rotated',expires_in:3600,token_type:'bearer',user}):Response.json(user);
 try {const r=await middleware(request('/sign-in',true));assert.equal(r.status,307);assert.equal(r.headers.get('location'),'https://app.invalid/dashboard');assert.ok(r.cookies.getAll().some(c=>c.name==='sb-test-auth-token'&&c.value));}finally{globalThis.fetch=previous;}
});
test('anonymous protected navigation preserves destination; public pages need no auth call',async()=>{
 const r=await middleware(new NextRequest('https://app.invalid/dashboard?tab=profile'));
 assert.equal(new URL(r.headers.get('location')!).searchParams.get('redirectTo'),'/dashboard?tab=profile');
 assert.equal((await middleware(new NextRequest('https://app.invalid/directory/example'))).status,200);
});
test('redirects reject external hosts, backslashes and auth loops',()=>{
 for(const path of ['https://evil.invalid','//evil.invalid','/\\evil.invalid','/auth/reset','/sign-in','/api/claim'])assert.equal(safeRedirect(path),'/dashboard');
 assert.equal(safeRedirect('/directory/me?edit=true'),'/directory/me?edit=true');
});
