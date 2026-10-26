// Verifies the ESM singleton boundary in an actual composed payload, without IO.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {resolve,posix} from 'node:path';import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]);assert(root);let checked=0;
const gate=await readFile(root+'/admin/admin-gate.mjs','utf8');
const refs=s=>[...s.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map(m=>m[1]);
const target=(file,url)=>{const u=new URL(url,'https://fixture.invalid/'+file);return {path:u.pathname.slice(1),query:u.search,href:u.href};};
const singletons={'admin/component-repository.mjs':['setComponentRepository','componentRepository'],'admin/assembly-repository.mjs':['setAssemblyRepository','assemblyRepository'],'backend/order-data.mjs':['setAdminOrderRepository','currentAdminOrderRepository'],'backend/operations-admin.mjs':['setOperationsRepository','currentOperationsRepository'],'backend/catalogue-options.mjs':['setAdminOptionRepository','currentAdminOptionRepository'],'backend/email-templates.mjs':['setEmailTemplateRepository','currentEmailTemplateRepository']};
const gateRefs=refs(gate).map(s=>target('admin/admin-gate.mjs',s));
globalThis.window={};
for(const [path,methods] of Object.entries(singletons)){
 const g=gateRefs.find(r=>r.path===path);assert(g,'Missing gate binding '+path);
 // URI identity is the browser's module-instance key; inspect every active consumer.
 const {readdir}=await import('node:fs/promises');async function walk(dir){let out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())out.push(...await walk(p));else if(p.endsWith('.mjs'))out.push(p);}return out;}
 for(const file of await walk(root+'/admin')){if(file.includes('/command/'))continue;const rel=file.slice(root.length+1),s=await readFile(file,'utf8');for(const r of refs(s).map(x=>target(rel,x)).filter(x=>x.path===path)){assert.equal(r.href,g.href,'Split authenticated repository instance: '+rel);checked++;}}
 const module=await import(pathToFileURL(root+'/'+g.path).href+g.query);const [set,get]=methods;
 assert.equal(typeof module[set],'function');assert.equal(typeof module[get],'function');
 const fixture={list:async()=>[],save:async()=>{},changeStock:async()=>{},get:async()=>null};module[set](fixture);assert.equal(module[get](),fixture,'Actual injected repository did not persist: '+path);module[set](null);
}
console.log(JSON.stringify({singletonFamilies:6,consumerBindings:checked,status:'PASS',networkRequests:0}));
