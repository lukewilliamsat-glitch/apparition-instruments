import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Window} from 'happy-dom';
import {accountRedirect,createAccountApp} from '../dist/account/app.mjs';

const html=readFileSync('dist/account/index.html','utf8');
assert(html.includes('name="robots" content="noindex,nofollow"'));
assert(!readFileSync('dist/sitemap.xml','utf8').includes('/account/'));
const pages=[];
function visit(path){for(const entry of readdirSync(path,{withFileTypes:true})){
 const name=path+'/'+entry.name;
 if(entry.isDirectory()&&entry.name!=='admin')visit(name);
 else if(entry.isFile()&&entry.name==='index.html'&&!['dist/wiring-kits/build/index.html','dist/wiring-diagrams/index.html'].includes(name))pages.push(name);
}}
visit('dist');
for(const path of pages){const page=readFileSync(path,'utf8');assert(page.includes('href="/account/"'),path);}
assert(pages.length>=30);
const accountSources=['dist/account/app.mjs','dist/account/bootstrap.mjs','dist/account/supabase-client.mjs'].map(p=>readFileSync(p,'utf8')).join('\n');
assert(!/service_role|client_secret|SMTP_PASSWORD|STRIPE_SECRET_KEY/.test(accountSources));
assert.equal(accountRedirect,'https://apparitioninstruments.co.uk/account/');

function fixture({session=null,user=null,url=accountRedirect,sessionError=null}={}){
 const window=new Window({url});window.document.write(html);
 let listener,calls=[],currentUser=user;
 const auth={
  onAuthStateChange(callback){listener=callback;return {data:{subscription:{unsubscribe(){}}}};},
  async getSession(){calls.push('session');return {data:{session},error:sessionError};},
  async getUser(){calls.push('user');return {data:{user:currentUser},error:null};},
  async signUp(args){calls.push(['signup',args]);return {data:{user:{}},error:null};},
  async resend(args){calls.push(['resend',args]);return {error:null};},
  async signInWithPassword(args){calls.push(['signin',args]);currentUser={email:args.email,email_confirmed_at:'2026-09-27T00:00:00Z'};return {data:{session:{}},error:null};},
  async resetPasswordForEmail(email,options){calls.push(['reset',email,options]);return {error:null};},
  async updateUser(args){calls.push(['update',args]);return {error:null};},
  async signInWithOAuth(args){calls.push(['oauth',args]);return {error:null};},
  async signOut(args){calls.push(['signout',args]);listener('SIGNED_OUT');return {error:null};}
 };
 const history={replaceState(...args){calls.push(['history',args[2]]);}};
 const timers=[];
 const app=createAccountApp({auth,document:window.document,location:window.location,history,setTimeoutFn:(fn,ms)=>{timers.push([fn,ms]);}});
 const el=id=>window.document.getElementById(id);
 async function submit(id,values){const form=el(id);for(const [key,value] of Object.entries(values))form.elements[key].value=value;
  form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,0));}
 async function click(id){el(id).click();await new Promise(resolve=>setTimeout(resolve,0));}
 return {app,window,el,calls,listener:()=>listener,timers,submit,click};
}
const guest=fixture();await guest.app.start();assert.equal(guest.el('account-signed-out').hidden,false);assert(!guest.calls.includes('user'));
guest.app.setView('signup');await guest.submit('signup-form',{email:'alice@example.com',password:'password123',confirm:'otherpass'});
assert.match(guest.el('account-error').textContent,/do not match/);assert.equal(guest.calls.filter(c=>Array.isArray(c)&&c[0]==='signup').length,0);
await guest.submit('signup-form',{email:'alice@example.com',password:'password123',confirm:'password123'});
assert.equal(guest.calls.find(c=>c[0]==='signup')[1].options.emailRedirectTo,accountRedirect);
assert.equal(guest.el('account-confirmation').hidden,false);
guest.el('resend-confirmation').disabled=false;guest.timers.find(([,ms])=>ms===60000)[0]();
await guest.click('resend-confirmation');assert.equal(guest.calls.filter(c=>c[0]==='resend').length,0); // server limit still enforced
guest.app.setView('recover');await guest.submit('recovery-request-form',{email:'alice@example.com'});
assert.equal(guest.calls.find(c=>c[0]==='reset')[2].redirectTo,accountRedirect);
guest.app.setView('signin');await guest.click('google-signin');assert.deepEqual(guest.calls.find(c=>c[0]==='oauth')[1],{provider:'google',options:{redirectTo:accountRedirect}});
await guest.submit('signin-form',{email:'alice@example.com',password:'password123'});
assert.equal(guest.el('account-signed-in').hidden,false);assert.equal(guest.el('account-email').textContent,'alice@example.com');
await guest.click('account-signout');assert.equal(guest.el('account-signed-out').hidden,false);assert.equal(guest.el('account-email').textContent,'');
assert.deepEqual(guest.calls.find(c=>c[0]==='signout')[1],{scope:'local'});
const unconfirmed=fixture({session:{},user:{email:'x@example.com',email_confirmed_at:null}});await unconfirmed.app.start();assert.equal(unconfirmed.el('account-signed-in').hidden,true);
const signed=fixture({session:{},user:{email:'verified@example.com',email_confirmed_at:'2026-09-27T00:00:00Z'}});await signed.app.start();assert.equal(signed.el('account-email').textContent,'verified@example.com');
signed.listener()('PASSWORD_RECOVERY');signed.timers.shift()[0]();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(signed.el('account-recovery').hidden,false);
await signed.submit('password-update-form',{password:'newpassword123',confirm:'newpassword123'});assert.equal(signed.el('account-signed-in').hidden,false);
const callback=fixture({url:accountRedirect+'?code=invalid',session:null});await callback.app.start();assert.match(callback.el('account-error').textContent,/invalid or has expired/);assert(callback.calls.some(c=>c[0]==='history'&&c[1]===accountRedirect));
const denied=fixture({url:accountRedirect+'?error=access_denied&error_code=access_denied'});await denied.app.start();assert.match(denied.el('account-error').textContent,/cancelled/);
const failed=fixture({sessionError:{code:'bad'}});await failed.app.start();assert.equal(failed.el('account-signed-out').hidden,false);
for(const item of [guest,unconfirmed,signed,callback,denied,failed])item.window.happyDOM.abort();
console.log('P09B: routes, noindex, signup, resend gating, recovery, Google, session, signout, callbacks and error handling PASS');
