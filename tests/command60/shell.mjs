import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {mountAdminShell,adminRoutes,workspaceFor,concealAdminShell} from '../../dist/admin/application.mjs';
import {bootAdminGate} from '../../dist/admin/admin-gate.mjs';
const routes=['/admin/','/admin/?view=assemblies','/admin/?view=maintenance','/admin/overview/','/admin/orders/','/admin/orders/?new=external','/admin/orders/?view=aftercare','/admin/orders/?view=attempts','/admin/orders/build-sheet/','/admin/orders/invoice/','/admin/catalogue-settings/','/admin/wiring-kit-master/','/admin/conjure/','/admin/hub-cms/','/admin/hub-media/','/admin/site-operations/','/admin/site-operations/#news','/admin/site-operations/#commercial-destinations','/admin/email-templates/','/admin/email-preview/'];
const settings={disableCSSFileLoading:true,disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableIframePageLoading:true};let passed=0;
for(const route of routes){
 const u=new URL('https://fixture.invalid'+route),w=new Window({url:u.href,settings});w.happyDOM.setWindowSize({width:390,height:844});const d=w.document;d.write(await readFile('dist'+u.pathname+'index.html','utf8'));
 const forms=[...d.querySelectorAll('form')],controls=[...d.querySelectorAll('main button,main input,main select,main textarea,main iframe')];const oldTitles=[...d.querySelectorAll('[data-page-title]')];
 const out=d.createElement('button');out.className='admin-lock';out.textContent='Sign Out';mountAdminShell(d,out);d.body.classList.add('admin-authorized');
 assert.equal(d.querySelectorAll('[data-admin-topbar]').length,1);assert.equal(d.querySelectorAll('nav[aria-label="Admin workspaces"]').length,1);assert(d.querySelector('.admin-app-brand').textContent.includes('COMMAND'));assert.equal(d.querySelector('.admin-app-brand').getAttribute('href'),'/admin/');assert(!d.querySelector('nav[aria-label="Admin workspaces"] a[href="/admin/command/"]'));
 for(const n of [...forms,...controls,...oldTitles])assert(n.isConnected,'Existing domain node removed: '+route);
 assert.equal(d.querySelectorAll('.admin-workspaces,.admin-navigation,nav.admin-tabs,body>.site-header').length,0);
 assert.equal(d.querySelectorAll('nav[aria-label="Admin workspaces"] [aria-current=page]').length,1);const main=d.querySelector('main');const menu=d.querySelector('[data-admin-menu]');menu.click();assert(main.inert);assert.equal(d.querySelector('#admin-sidebar').getAttribute('aria-modal'),'true');d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!main.inert);assert.equal(d.activeElement,menu);
 if(u.pathname==='/admin/conjure/')for(const a of d.querySelectorAll('.admin-app-sidebar a,.admin-app-brand,.admin-breadcrumb a'))assert(a.hasAttribute('data-conjure-exit'),'New navigation must use existing unsaved-draft guard');
 mountAdminShell(d,d.createElement('button'));assert.equal(d.querySelectorAll('[data-admin-topbar]').length,1);assert.equal(d.querySelectorAll('[data-admin-session] button').length,1);
 const dialog=d.querySelector('dialog');if(dialog){dialog.showModal();concealAdminShell(d);assert(!dialog.open);}
 await w.happyDOM.close();passed++;
}
for(const status of ['signed-out','denied','authorized']){const w=new Window({url:'https://fixture.invalid/admin/',settings}),d=w.document;d.write(await readFile('dist/admin/index.html','utf8'));let loads=0,outs=0;await bootAdminGate({document:d,auth:{restore:async()=>({status}),signOut:async()=>{outs++;return {status:'signed-out'};}},load:async()=>{loads++;return {};}});assert.equal(loads,status==='authorized'?1:0);assert.equal(d.body.classList.contains('admin-authorized'),status==='authorized');if(status==='authorized'){d.querySelector('.admin-lock').click();await new Promise(r=>setTimeout(r,0));assert.equal(outs,1);assert(!d.body.classList.contains('admin-authorized'));assert(d.querySelector('input[type=password]'));}await w.happyDOM.close();passed++;}
assert.equal(new Set(adminRoutes.map(r=>r.href)).size,adminRoutes.length);assert.equal(workspaceFor(new URL('https://fixture.invalid/admin/orders/?view=aftercare')),'aftercare');assert.equal(workspaceFor(new URL('https://fixture.invalid/admin/orders/?new=external')),'external');assert.equal(workspaceFor(new URL('https://fixture.invalid/admin/command/')),'inventory');
console.log(JSON.stringify({passed,total:23,activeRouteVariants:routes.length,realRequests:0,realMutations:0,authentication:'Fictional boundary checks; normal Auth implementation unchanged'}));
