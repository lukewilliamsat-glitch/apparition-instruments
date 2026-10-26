import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {Window} from 'happy-dom';
import {createProductionFixture,fixtureConfig} from '../command05/production-fixture.mjs';
import {cacheOverlay,canonical} from '../../scripts/command-release/cache-overlay.mjs';
import {stampSource} from '../../scripts/stamp-static-assets.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const root=resolve('.'),manifest=JSON.parse(await readFile('docs/command/command05/COMMAND_RELEASE_SOURCE.json','utf8')),temp=await mkdtemp(join(tmpdir(),'command-cache-'));
try{
 const result=await cacheOverlay({root,manifest,out:join(temp,'compiled')});assert.equal(result.compiledFiles,21);
 for(const entry of result.manifest.entries){const raw=await readFile(join(root,'dist',entry.path)),kind=entry.path.split('.').at(-1);assert.equal(sha(await readFile(join(temp,'compiled/dist',entry.path))),entry.afterSHA256);assert.equal(entry.afterSHA256,sha(stampSource(raw.toString(),kind,manifest.sourceCommit)));}
 const gate=result.manifest.entries.find(e=>e.path==='admin/admin-gate.mjs'),rawGate=manifest.entries.find(e=>e.path===gate.path);assert.notEqual(gate.beforeSHA256,rawGate.beforeSHA256,'Raw-Git preimage must not be mistaken for deployed stamped bytes');
 const old=execFileSync('git',['show',manifest.baseSourceCommit+':dist/'+gate.path]);assert.equal(gate.beforeSHA256,sha(stampSource(old.toString(),'mjs',manifest.baseSourceCommit)));
 const compiled=await readFile(join(temp,'compiled/dist/admin/admin-gate.mjs'),'utf8');assert.match(compiled,new RegExp("admin-auth\\.mjs\\?build="+manifest.sourceCommit));assert.match(compiled,new RegExp("application\\.mjs\\?build="+manifest.sourceCommit));
 const html=await readFile(join(temp,'compiled/dist/admin/command/index.html'),'utf8');assert.match(html,new RegExp('admin-gate\\.mjs\\?build='+manifest.sourceCommit));assert.match(html,new RegExp('data-admin-entry="\\./entry\\.mjs\\?build='+manifest.sourceCommit));
 assert.equal(result.manifestSHA256,sha(canonical(result.manifest)));
 // Execute the actual stamped Auth/adapter/editor module graph, including the
 // production factory's identity brand, without any live network or private site.
 const graph=new Set(),overlaid=new Set(result.manifest.entries.map(e=>e.path));
 async function baselineClosure(path){
  if(graph.has(path))return;graph.add(path);
  const source=await readFile(join(root,'dist',path),'utf8');
  if(!overlaid.has(path)){
   assert.equal(source,execFileSync('git',['show',manifest.baseSourceCommit+':dist/'+path],{encoding:'utf8'}),'Unchanged baseline module drift');
   const target=join(temp,'compiled/dist',path);await mkdir(dirname(target),{recursive:true});await writeFile(target,stampSource(source,path.split('.').at(-1),manifest.baseSourceCommit));
  }
  for(const match of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g)){
   const spec=match[1].split('?')[0];if(!spec.startsWith('.')&&!spec.startsWith('/'))continue;
   const next=spec.startsWith('/')?spec.slice(1):relative(join(root,'dist'),resolve(root,'dist',dirname(path),spec)).replaceAll('\\','/');
   assert(!next.startsWith('..'));if(/\.(mjs|js)$/.test(next))await baselineClosure(next);
  }
 }
 await baselineClosure('admin/command/entry.mjs');await baselineClosure('admin/admin-auth.mjs');
 const load=path=>import(pathToFileURL(join(temp,'compiled/dist',path)).href+'?build='+manifest.sourceCommit);
 const [{createAdminAuth},{createProductionReadAdapter},{mountAdminWorkspace}]=await Promise.all([load('admin/admin-auth.mjs'),load('admin/command/production-read.mjs'),load('admin/command/entry.mjs')]);
 const w=new Window({url:'http://127.0.0.1/admin/command/',settings:{disableCSSFileLoading:true,disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true}});w.document.write(html);w.document.body.classList.add('admin-authorized');
 const f=createProductionFixture(),auth=createAdminAuth({config:fixtureConfig,request:f.request,storage:f.storage}),adapter=createProductionReadAdapter({auth,config:fixtureConfig,request:f.request,activation:{enabled:true,inventoryRead:true},events:w});let app;
 try{app=await mountAdminWorkspace({document:w.document,auth,services:{commandReadAdapter:adapter}});await app.workbench.refresh();assert.equal(app.workbench.snapshot().rows.length,14);await app.workbench.select('fx-pot-01');assert.equal(app.workbench.snapshot().detailStatus,'ready');assert(w.document.querySelector('[data-enter-editor]').disabled);assert.equal(await app.editor.save(),false);assert.equal(f.calls.filter(c=>c.path.endsWith('/components')).length,2);}finally{app?.destroy();f.adapter.dispose();await w.happyDOM.close();}
 const bad=structuredClone(manifest);bad.entries[0].afterSHA256='0'.repeat(64);await assert.rejects(cacheOverlay({root,manifest:bad,out:join(temp,'bad')}),/drift/);
 const path=structuredClone(manifest);path.entries[0].path='../index.html';await assert.rejects(cacheOverlay({root,manifest:path,out:join(temp,'unsafe')}),/Unreviewed/);
 await assert.rejects(cacheOverlay({root,manifest,out:join(temp,'compiled')}));
 console.log(JSON.stringify({suite:'command55-cache-overlay',status:'PASS',compiledFiles:21,checks:['actual deployed preimage transformation','transitive Auth/application cache identity','HTML entry cache identity','all compiled byte hashes','canonical manifest identity','executed stamped Auth/read-only workspace graph','source drift rejection','path rejection','no output overwrite'],realArchiveReads:0,backendRequests:0}));
}finally{await rm(temp,{recursive:true,force:true});}
