import {mkdir,readFile,writeFile,cp,readdir} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=resolve(process.argv[2]), inv=resolve(process.argv[3]);
assert(!inv.startsWith(dir+'/'),'Inventory stays outside served files');
const put=async(path,body)=>{const to=join(dir,path);await mkdir(dirname(to),{recursive:true});await writeFile(to,body);};
for(const file of ['admin/omniscience/entry.mjs','admin/omniscience/model.mjs','admin/omniscience/workspace.css','admin/orders/economics-v2.mjs','admin/orders/economics.mjs','admin/orders/commercial-date.mjs']){
 await put(file,await readFile(join('dist',file)));
}
await put('admin/omniscience/repository.mjs',"export function financeRepository(){throw Error('Protected fixture preview has no backend connection.');}\n");
await cp('tests/leviathan74/fixture.mjs',join(dir,'fixture.mjs'));
await put('index.html',`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Omniscience protected preview</title><link rel="stylesheet" href="/admin/omniscience/workspace.css"><script type="module" src="/preview.mjs"></script></head><body class="admin-page"><aside class="omniscience"><strong>Protected preview · Fictional data</strong><p>Changes exist only in this tab and disappear on reload. This preview has no connection to Apparition orders, finance or payments.</p></aside><main class="admin-main omniscience" id="main"></main></body></html>`);
await put('preview.mjs',`import {mountAdminWorkspace} from '/admin/omniscience/entry.mjs';
import {row} from '/fixture.mjs';
import {londonDay} from '/admin/orders/commercial-date.mjs';
const day=londonDay(), seen=new Set();
const examples=[{...row,day,reference:'PREVIEW-001'},{...row,day,id:'a1da93d7-236c-44f7-a202-c0a86b8e0d6f',channel:'DIRECT',reference:'PREVIEW-002',finance:null}];
const outlays=[{id:'68a00000-0000-4000-8000-000000000003',day,vendor:'Example workshop supplier',category:'Tools and equipment',purpose:'Synthetic tooling purchase',currency:'GBP',original_minor:1800,sterling_minor:1800,funding:'director',treatment:'overhead',reimbursed:0,evidence:'example-receipt'}];
mountAdminWorkspace({document,repository:{
 async orders({from,to}){return {rows:examples.filter(x=>from<=x.day&&x.day<=to),next:null};},
 async outlays({from,to}){return {rows:outlays.filter(x=>from<=x.day&&x.day<=to),next:null};},
 async outlay(id,d){
  if(seen.has(id))return {id,duplicate:true};
  if(outlays.some(x=>x.evidence.toLowerCase()===d.evidence.toLowerCase()))throw Error('This evidence reference already exists in the fixture.');
  seen.add(id);outlays.unshift({id,day:d.date,vendor:d.vendor,category:d.category,purpose:d.purpose,currency:d.currency,original_minor:d.original,sterling_minor:d.gbp,
  funding:d.funding,treatment:d.treatment,reimbursed:0,evidence:d.evidence,external_reference:d.link,recurring:d.recurring,notes:d.notes});
  return {id,duplicate:false};
 },
 async reimburse(id,d){
  if(seen.has(id))return {id,duplicate:true};
  const o=outlays.find(x=>x.id===d.p_outlay&&x.funding==='director');
  if(!o||d.p_gbp<=0||o.reimbursed+d.p_gbp>o.sterling_minor)throw Error('Enter a payment up to the fixture balance.');
  seen.add(id);o.reimbursed+=d.p_gbp;o.last_reimbursement=d.p_date;return {id,duplicate:false};
 }
}});
`);
await put('_headers',`/*
  X-Robots-Tag: noindex, nofollow, noarchive
  Cache-Control: no-store
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
`);
const files=(await readdir(dir,{recursive:true,withFileTypes:true})).filter(e=>!e.isDirectory()).map(e=>{
 assert(e.isFile());return resolve(e.parentPath,e.name).slice(dir.length+1);
}).sort();
const manifest=[];
for(const path of files){const b=await readFile(join(dir,path));assert(!/https?:|supabase\.co|sb_secret_|sk_live_|rk_live_|whsec_/.test(b.toString()),path+' contains an external reference');manifest.push({path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
await writeFile(inv,JSON.stringify(manifest));
console.log('Verified protected fixture package:',manifest.length,'files');
