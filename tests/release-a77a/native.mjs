import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]||'incident77/fixed');
const module=rel=>import(pathToFileURL(resolve(root,rel)));
const {createAdminAuth,adminAuthSessionKey:key}=await module('admin/admin-auth.mjs');
const config={url:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'};
const now=1700000000000,clock=()=>now,user='4e98f557-5429-472b-ab59-d73a1ef4412a';
const storage=()=>{const items=new Map();return {getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v),removeItem:k=>items.delete(k)};};
const seed=(s,seconds)=>s.setItem(key,JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:now/1000+seconds}));
const action=(path,reply)=>[path,reply];
function harness(actions,s=storage()){
 const list=actions.slice(),traffic=[];
 const auth=createAdminAuth({config,storage:s,now:clock,request:async(u,init={})=>{
  const a=list.shift();assert(a,'unexpected network call');
  const path=new URL(u).pathname;traffic.push(path);
  assert.equal(path,a[0]);const {status=200,body={}}=a[1];
  if(!path.endsWith('/token'))assert.match(init.headers.Authorization,/^Bearer fixture-/);
  return Response.json(body,{status});
 }});
 return {auth,s,traffic,done(){assert.equal(list.length,0);}};
}
const USER=action('/auth/v1/user',{body:{id:user}}), authRoute='/auth/v1/token',members='/rest/v1/admin_members';
const member=action(members,{body:[{user_id:user}]});
const refresh=action(authRoute,{body:{access_token:'fixture-new',refresh_token:'fixture-next',expires_in:2400}});
for(const [label,arr,start,outcome] of [
 ['signed-out',[],null,'signed-out'],
 ['approved', [USER,member],3600,'authorized'],
 ['non-member',[USER,action(members,{body:[]})],3600,'denied'],
 ['expired and renewed once',[refresh,USER,member],-30,'authorized'],
 ['server refuses token then renewal succeeds',[action('/auth/v1/user',{status:401}),refresh,USER,member],3600,'authorized'],
 ['membership returns 401',[USER,action(members,{status:401})],3600,'signed-out']
]){
 const h=harness(arr);if(start!==null)seed(h.s,start);assert.equal((await h.auth.restore()).status,outcome,label);h.done();
}
{
 const h=harness([action(authRoute,{status:401})]);seed(h.s,-1);
 await assert.rejects(()=>h.auth.restore(),/Admin session expired/);assert.equal(h.s.getItem(key),null);h.done();
}
{
 const h=harness([action('/auth/v1/logout',{status:401})]);seed(h.s,3600);
 let called=0;h.auth.subscribe(()=>called++);await h.auth.signOut();assert.equal(h.s.getItem(key),null);assert.equal(called,1);h.done();
}
{
 const {createAuthenticatedRepositoryTransport}=await module('backend/providers.mjs');
 let sent=0,calls=0;const transport=createAuthenticatedRepositoryTransport({accessToken:async()=>{calls++;return 'fixture-access';}},{config,request:async()=>{sent++;return Response.json([]);}});
 await assert.rejects(()=>transport.send('arbitrary_private_table'),/Unsupported Admin repository/);assert.equal(calls,0);
 await transport.send('orders');assert.equal(sent,1);assert.equal(calls,1);
}
console.log('Native PASS: 9 session, refresh, membership, logout and repository allowlist groups.');
