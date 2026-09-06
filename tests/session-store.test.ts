import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { SessionStore } from '../src/lib/auth/session-store';
import type { Database } from '../src/types/database';
const tick = () => new Promise(resolve => setTimeout(resolve, 20));
function session(id='one'): Session {
 return {access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id,email:`${id}@uwaterloo.ca`,app_metadata:{},user_metadata:{},aud:'authenticated',created_at:''}};
}
function fixture() {
 let callback: (event: string,s: Session|null)=>void = ()=>{};
 let resolve: (r: unknown)=>void=()=>{};
 const client={auth:{onAuthStateChange:(fn: typeof callback)=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}}}},from:()=>({select(){return this},eq(){return this},abortSignal(){return this},maybeSingle:()=>new Promise(r=>{resolve=r})})} as unknown as SupabaseClient<Database>;
 const store=new SessionStore(client);store.start();
 return {store,event:(s:Session|null)=>callback('SIGNED_IN',s),resolve:(data:unknown,error:unknown=null)=>resolve({data,error}),getResolver:()=>resolve};
}
test('temporary member failure retains last profile; sign-out clears it',async()=>{
 const f=fixture();try{
  f.event(session());await tick();f.resolve({id:'member'});await tick();
  const request=f.store.refreshMember();f.resolve(null,{message:'offline'});await request;
  assert.equal(f.store.getSnapshot().member?.id,'member');assert.equal(f.store.getSnapshot().memberStatus,'error');
  f.event(null);assert.equal(f.store.getSnapshot().member,null);assert.equal(f.store.getSnapshot().status,'anonymous');
 }finally{f.store.stop();}
});
test('late profile response cannot restore a signed-out or different user',async()=>{
 const f=fixture();try{
  f.event(session());await tick();const late=f.getResolver();
  f.event(session('two'));assert.equal(f.store.getSnapshot().member,null);await tick();
  late({data:{id:'wrong-member'},error:null});await tick();assert.equal(f.store.getSnapshot().member,null);
  f.resolve({id:'right-member'});await tick();assert.equal(f.store.getSnapshot().member?.id,'right-member');
  const pending=f.store.refreshMember();f.event(null);f.resolve({id:'stale'});await pending;assert.equal(f.store.getSnapshot().member,null);
 }finally{f.store.stop();}
});
test('remount restarts a cancelled initial profile request',async()=>{
 const f=fixture();try{
  f.event(session());await tick();f.store.stop();f.store.start();f.event(session());await tick();f.resolve({id:'member'});await tick();assert.equal(f.store.getSnapshot().memberStatus,'ready');
 }finally{f.store.stop();}
});
test('installed Supabase SDK refresh completes without waiting on its own event lock',async()=>{
 const value=session();const storage=new Map([['test-auth',JSON.stringify(value)]]);let queries=0;
 const client=createClient<Database>('https://test.invalid','test-key',{
  auth:{storageKey:'test-auth',autoRefreshToken:false,detectSessionInUrl:false,storage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{storage.set(k,v)},removeItem:k=>{storage.delete(k)}}},
  global:{fetch:async(url,init)=>{if(init?.signal?.aborted)throw init.signal.reason;
   if(String(url).includes('/token'))return Response.json({...value,access_token:'new-token'});
   if(String(url).includes('/user'))return Response.json(value.user);
   queries++;return Response.json({id:'member',auth_user_id:'one'});
  }},
 });
 const store=new SessionStore(client);store.start();
 try {
  await tick();assert.equal(store.getSnapshot().member?.id,'member');
  const before=queries;
  const outcome=await Promise.race([client.auth.refreshSession().then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),300))]);
  assert.equal(outcome,true);assert.equal(store.getSnapshot().member?.id,'member');assert.equal(queries,before);
 }finally{store.stop();await client.auth.stopAutoRefresh();}
});
