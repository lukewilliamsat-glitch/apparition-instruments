import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {hash} from './assemble.mjs';
const [from,sourceA,sourceB,destination]=process.argv.slice(2).map(x=>resolve(x));
if(!from||!sourceA||!sourceB||!destination)throw Error('Expected live-package root, exact source A and B, and output root');
const pre='41fab337-e7df-499f-9292-fef300e46fe7',source='783a30a0523c11625f1d07a806dda51e4c66ae48';
const baseline=join(from,'candidate');
function inventory(dir){
 const out={};
 for(const item of readdirSync(dir,{recursive:true,withFileTypes:true})){
  if(item.isDirectory())continue;assert(item.isFile(),'No nonregular files');
  const p=resolve(item.parentPath,item.name);out[p.slice(dir.length+1)]=hash(readFileSync(p));
 }
 return Object.fromEntries(Object.entries(out).sort());
}
const different=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(f=>a[f]!==b[f]).sort();
function get(dir,path){return readFileSync(join(dir,path),'utf8');}
function copy(dir,path,root,target=path){const f=join(root,target);mkdirSync(dirname(f),{recursive:true});writeFileSync(f,readFileSync(join(dir,path)));}
const existing=JSON.parse(get(from,'ironclad69a-receipt.json')),base=inventory(baseline);
assert.equal(existing.candidate,source);assert.deepEqual(base,existing.release);
assert(base['admin/ironclad/estimator.mjs']&&base['admin/site-operations/operations.mjs']);
mkdirSync(destination,{recursive:true});
const outA=join(destination,'release-a-site'),outB=join(destination,'release-b-after-a-site');
assert(!existsSync(outA)&&!existsSync(outB));cpSync(baseline,outA,{recursive:true});
const aPaths=[
 'admin/admin-gate.mjs','admin/admin.css','admin/application.mjs','admin/delivery/delivery.css','admin/delivery/delivery.mjs','admin/delivery/index.html','admin/index.html',
 'admin/orders/aftercare-direct.mjs','admin/orders/app.mjs','admin/orders/commercial-date.mjs','admin/orders/customer-aftercare.mjs',
 'admin/orders/eclipse-model.mjs','admin/orders/eclipse-repository.mjs','admin/orders/eclipse-settings.mjs','admin/orders/eclipse-ui.mjs','admin/orders/eclipse.css',
 'admin/orders/economics-v2.mjs','admin/orders/economics.mjs','admin/orders/finance-ui.mjs','admin/orders/financial-order.mjs','admin/orders/index.html',
 'admin/orders/invoice/app.mjs','admin/orders/invoice/index.html','admin/orders/order-date-correction.mjs','admin/orders/view.mjs','admin/overview.mjs',
 'backend/operations-admin.mjs','backend/order-data.mjs','backend/providers.mjs','basket-ui.mjs','checkout/checkout.mjs','checkout/index.html','storefront/entry.mjs'
];
for(const p of aPaths)copy(sourceA,'dist/'+p,outA,p);
// Preserve the live calculator navigation verbatim across A.
const liveAdmin=get(baseline,'admin/index.html'),target=get(outA,'admin/index.html');
const link=liveAdmin.match(/<p class="storage-note"><a href="\/admin\/ironclad\/">IRONCLAD: The Armoury<\/a> · Landed cost calculator<\/p>/)?.[0];
const main='<main id="main" class="admin-main">';
assert(link&&target.split(main).length===2&&!target.includes('href="/admin/ironclad/"'));
writeFileSync(join(outA,'admin/index.html'),target.replace(main,main+link));
const social='admin/orders/customer-aftercare.mjs',aftercare=get(outA,social);
const sendLine=aftercare.split('\n').find(l=>l.includes("button('Aftercare Direct'")&&l.includes('openAftercareDirect('));
assert(sendLine&&sendLine.trim().endsWith(';'));
const disabled=aftercare.replace("import {openAftercareDirect} from './aftercare-direct.mjs';\n",'')
 .replace(sendLine,"  const directStatus=document.createElement('p');directStatus.className='storage-note';directStatus.textContent='Aftercare Direct sending is off. Use the eBay order conversation or the existing manual-copy draft.';section.append(directStatus);");
assert(!disabled.includes('openAftercareDirect'));
// Use the actual containing element from the accepted block, without changing existing fallback operations.
const parent=aftercare.match(/(?:const |,)(\w+)=el\('section',undefined,'order-aftercare'\)/)?.[1];
assert(parent,'Aftercare panel container not found');
writeFileSync(join(outA,social),disabled.replace('section.append(directStatus)',parent+'.append(directStatus)'));
const a=inventory(outA);
assert(different(base,a).every(p=>aPaths.includes(p)));
for(const p of Object.keys(base).filter(k=>k.startsWith('admin/ironclad/')||k.startsWith('admin/site-operations/')||k==='operations/snapshot.json'))assert.equal(base[p],a[p],p);
const edge=[
 'supabase/functions/create-checkout/index.ts','supabase/functions/_shared/customer-auth.ts',
 'supabase/functions/overseer-aftercare/index.ts','supabase/functions/transactional-email/smtp.ts'
];
for(const f of edge)copy(sourceA,f,join(destination,'release-a-edges'));
const ed=get(sourceA,edge[2]);
assert(ed.includes("OVERSEER_EBAY_SMTP_ENABLED")&&ed.includes("Direct transport is disabled."));
cpSync(outA,outB,{recursive:true});
const bPaths=['admin/ironclad/index.html','admin/ironclad/armoury.css','admin/ironclad/entry.mjs','admin/ironclad/app.mjs','admin/ironclad/model.mjs','admin/ironclad/repository.mjs','admin/orders/eclipse-ui.mjs','admin/orders/financial-order.mjs'];
for(const p of bPaths)copy(sourceB,'dist/'+p,outB,p);
const app=join(outB,'admin/ironclad/app.mjs'),original=readFileSync(app,'utf8');
const fixtureLines=original.split('\n').filter(l=>l.trimStart().startsWith('if(fixture)'));
assert.equal(fixtureLines.length,2);assert(fixtureLines.every(l=>/fictional|Fictional/.test(l)));
writeFileSync(app,original.split('\n').filter(l=>!fixtureLines.includes(l)).join('\n'));

const repo='admin/ironclad/repository.mjs',s=get(outB,repo),stage='prwmowexhonguvtiywsy',prod='acdxpxvksvdwfajntzfx';
assert.equal(s.split(stage).length,2);
writeFileSync(join(outB,repo),s.replace(stage,prod).replace('IRONCLAD staging is isolated from production. Use an authorised staging build.','IRONCLAD requires the authorised production Admin endpoint.'));
const entry=get(outB,'admin/index.html');assert(entry.includes(link));writeFileSync(join(outB,'admin/index.html'),entry.replace(link,link.replace('Landed cost calculator','Procurement and inventory')));
const b=inventory(outB);
assert(different(a,b).every(p=>bPaths.includes(p)||p==='admin/index.html'));
assert(b['admin/site-operations/operations.mjs']===base['admin/site-operations/operations.mjs']);
for(const f of bPaths){
 const content=get(outB,f);assert(!/prwmowexhonguvtiywsy|Fictional Coil Hardware|fixture-order-001/.test(content),f);
}
function validateImports(site,files,all){
 for(const f of files){
  const source=get(site,f);
  const refs=f.endsWith('.mjs')?[...source.matchAll(/(?:from\s+|import\s*)['"]((?:\.{1,2}\/)[^'"]+)['"]/g)].map(m=>m[1]):
    f.endsWith('.html')?[...source.matchAll(/(?:src|data-admin-entry)=['"]([^'"]+\.mjs(?:\?[^'"]*)?)['"]/g)].map(m=>m[1]):[];
  for(const ref of refs){
   if(ref.startsWith('https:'))continue;
   const prefix=ref.startsWith('/')?site:resolve(site,dirname(f));
   const p=resolve(prefix,ref.replace(/^\//,'').split(/[?#]/)[0]).slice(site.length+1);
   assert(Object.hasOwn(all,p),f+' imports missing '+p);
  }
 }
}
validateImports(outA,aPaths,a);validateImports(outB,bPaths,b);
const outStandalone=join(destination,'release-b-independent-site');
assert(!existsSync(outStandalone));cpSync(baseline,outStandalone,{recursive:true});
const standalonePaths=[...bPaths.filter(p=>p.startsWith('admin/ironclad/')),'admin/index.html'];
for(const p of standalonePaths)copy(outB,p,outStandalone);
const standalone=inventory(outStandalone);
assert(different(base,standalone).every(p=>standalonePaths.includes(p)));
validateImports(outStandalone,standalonePaths,standalone);
const manifest={releaseAuthority:'PREPARATION ONLY / DO NOT DEPLOY',
 sources:{live69a:source,releaseA:'cc34aa5ae5326134dbc215af673b5132c45da29c',releaseB:source},
 currentRollback:pre,releaseA:{requiresAnchor:true,changed:different(base,a),files:a,edge:inventory(join(destination,'release-a-edges'))},
 releaseB:{requiresAnchor:true,requiresExactApproval:true,rollback:'Verified live Release A deployment, capture before Release B',changed:different(a,b),files:b,independent:{rollback:pre,changed:different(base,standalone),files:standalone,eclipseIntegration:false}}};
writeFileSync(join(destination,'composition.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({baselineFiles:Object.keys(base).length,releaseAChanges:manifest.releaseA.changed.length,releaseBChanges:manifest.releaseB.changed.length,releaseBIndependentChanges:manifest.releaseB.independent.changed.length,manifestSha:hash(JSON.stringify(manifest,null,2)),productionWrites:0}));
