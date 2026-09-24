import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {bootAdminGate} from '../dist/admin/admin-gate.mjs';
import {createAdminAuth,adminAuthSessionKey} from '../dist/admin/admin-auth.mjs';
import {createAuthenticatedRepositoryTransport} from '../dist/backend/providers.mjs';
import {publicBackendConfig} from '../dist/backend/public-config.mjs';

const member='1c893207-37fb-42d4-8b79-125fa573cb3b',nonMember='00000000-0000-4000-8000-000000000001';
const makeStorage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
const reply=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
function server(){let id=member,logouts=0,refreshes=0;const calls=[];
 const request=async(url,options={})=>{calls.push({url,options});if(url.includes('grant_type=password'))return options.body.includes('incorrect')?reply({},400):reply({access_token:'access',refresh_token:'refresh',expires_in:120});
  if(url.includes('grant_type=refresh_token')){refreshes++;return reply({access_token:'renewed',refresh_token:'refresh-new',expires_in:3600});}
  if(url.endsWith('/auth/v1/user'))return reply({id});
  if(url.includes('/rest/v1/admin_members'))return reply(id===member?[{user_id:member}]:[]);
  if(url.includes('/auth/v1/logout')){logouts++;return reply(null,204);}
  throw new Error('Unexpected endpoint: '+url);
 };return {request,calls,setId:value=>{id=value;},get logouts(){return logouts;},get refreshes(){return refreshes;}};
}
const storage=makeStorage(),mock=server(),clock={value:1000000};
let auth=createAdminAuth({request:mock.request,storage,now:()=>clock.value});
assert.deepEqual(await auth.restore(),{status:'signed-out'});
assert.deepEqual(await auth.signIn('luke@example.test','incorrect'),{status:'invalid-credentials'});
assert.equal(storage.getItem(adminAuthSessionKey),null);
assert.deepEqual(await auth.signIn('luke@example.test','private password'),{status:'authorized'});
assert.match(storage.getItem(adminAuthSessionKey),/refresh/);
assert.ok(mock.calls.find(call=>call.url.includes('/rest/v1/admin_members')&&call.options.headers.Authorization==='Bearer access'));
auth=createAdminAuth({request:mock.request,storage,now:()=>clock.value});
assert.deepEqual(await auth.restore(),{status:'authorized'},'refreshing the page restores and verifies membership');
clock.value+=121000;assert.equal(await auth.accessToken(),'renewed');assert.equal(mock.refreshes,1);
const transport=createAuthenticatedRepositoryTransport(auth,{request:mock.request});
await transport.send('components',{method:'GET'}).catch(()=>{});
assert.ok(mock.calls.some(c=>c.url.endsWith('/rest/v1/components')&&c.options.headers.Authorization==='Bearer renewed'));
assert.throws(()=>createAuthenticatedRepositoryTransport({}),/Invalid authenticated/);
await assert.rejects(transport.send('admin_members'),/Unsupported Admin repository resource/);
mock.setId(nonMember);assert.deepEqual(await auth.restore(),{status:'denied'});
await auth.signOut();assert.equal(mock.logouts,1);assert.equal(storage.getItem(adminAuthSessionKey),null);
assert.deepEqual(await auth.restore(),{status:'signed-out'});

const page=(entry='./app.mjs')=>{const window=new Window({url:'https://example.test/apparition-instruments/admin/?view=assemblies'});window.document.body.className='admin-page';window.document.body.innerHTML='<main class="admin-main">Protected Admin content</main><script data-admin-entry="'+entry+'"></script>';return window;};
let window=page(),loaded=[];window.sessionStorage.setItem('apparition.admin.temporary-access.v1','granted');await bootAdminGate({document:window.document,auth:{restore:async()=>({status:'signed-out'})},load:async s=>loaded.push(s)});
assert.equal(loaded.length,0);assert.equal(window.document.body.classList.contains('admin-authorized'),false);assert.ok(window.document.querySelector('input[type=email]'));
window=page();await bootAdminGate({document:window.document,auth:{restore:async()=>({status:'denied'}),signOut:async()=>({status:'signed-out'})},load:async s=>loaded.push(s)});
assert.equal(loaded.length,0);assert.match(window.document.body.textContent,/not authorised/);
window=page('./app.mjs,./create.mjs');let loggedOut=0;await bootAdminGate({document:window.document,auth:{restore:async()=>({status:'authorized'}),signOut:async()=>{loggedOut++;}},load:async s=>loaded.push(s)});
assert.equal(window.document.body.classList.contains('admin-authorized'),true);assert.equal(loaded.length,2);
window.document.querySelector('.admin-lock').click();await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(loggedOut,1);assert.equal(window.document.body.classList.contains('admin-authorized'),false);
assert.ok(window.document.querySelector('input[type=email]'));

for(const pagePath of ['../dist/admin/index.html','../dist/admin/orders/index.html','../dist/admin/orders/build-sheet/index.html','../dist/admin/wiring-kit-master/index.html']){
 const html=await readFile(new URL(pagePath,import.meta.url),'utf8');assert.match(html,/admin-gate\.mjs/);assert.match(html,/data-admin-entry=/);
}
for(const pagePath of ['../dist/index.html','../dist/components/index.html','../dist/wiring-kits/index.html','../dist/les-paul-kits/index.html','../dist/basket/index.html']){
 const html=await readFile(new URL(pagePath,import.meta.url),'utf8');assert.doesNotMatch(html,/admin-gate\.mjs/);
}
const gate=await readFile(new URL('../dist/admin/admin-gate.mjs',import.meta.url),'utf8');
assert.doesNotMatch(gate,/temporaryPasswordDigest|sessionStorage|authorizeAdmin\(/);
assert.equal(publicBackendConfig.url,'https://acdxpxvksvdwfajntzfx.supabase.co');
console.log('Supabase Admin gate: signed-out, login, session restoration/refresh, membership, non-Admin denial, sign-out, and public routes passed.');
