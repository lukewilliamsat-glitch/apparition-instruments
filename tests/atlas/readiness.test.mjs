import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {certificationFixture} from './certification-fixture.mjs';
import {certifyBaseline,requireReleaseReadiness} from '../../scripts/atlas/certify-baseline.mjs';
import {checkRuntimeAcceptance,checkDeploymentInventory} from '../../scripts/atlas/readiness-evidence.mjs';
import {makeManifest,stable,sha256} from '../../scripts/atlas/core.mjs';
import {stampSource} from '../../scripts/stamp-static-assets.mjs';
async function fixture(run){const root=await fs.mkdtemp(path.join(os.tmpdir(),'atlas-readiness-'));try{return await run(await certificationFixture(root));}finally{await fs.rm(root,{recursive:true,force:true});}}
test('readiness: v2 independent witness binds inventory/runtime and still grants no publication',()=>fixture(async f=>{const r=await certifyBaseline(f.options);assert.equal(r.technicalStatus,'certified');assert.equal(r.evidenceVersion,2);assert.equal(requireReleaseReadiness(r,f.request.baseline.sha256),r);assert.equal(r.deployable,false);}));
for(const key of ['deploymentInventory','runtimeAcceptance'])test('readiness: missing '+key+' cannot use old flags',()=>fixture(async f=>{delete f.request[key];await f.saveRequest();await assert.rejects(certifyBaseline(f.options),{code:'READINESS_REQUIRED'});}));
test('readiness: legacy certificate cannot enter production preflight',()=>fixture(async f=>{f.request.schemaVersion=1;await f.save();const r=await certifyBaseline(f.options);assert.equal(r.technicalStatus,'certified');assert.throws(()=>requireReleaseReadiness(r,f.request.baseline.sha256),{code:'READINESS_REQUIRED'});}));
test('readiness: changed runtime report cannot reuse independent witness',()=>fixture(async f=>{const old=JSON.parse(await fs.readFile(path.join(f.root,f.request.runtimeAcceptance.path)));old.checks[0].detail='tampered evidence';f.request.runtimeAcceptance=await f.write('runtime-acceptance.json',old);await f.saveRequest();const r=await certifyBaseline(f.options);assert.equal(r.technicalStatus,'blocked');assert.ok(r.issues.some(x=>x.code==='WITNESS_BINDING'));}));
test('readiness: changed deployment manifest cannot reuse witness',()=>fixture(async f=>{const d=JSON.parse(await fs.readFile(path.join(f.root,f.request.deploymentInventory.path)));d.entries[0].sha256='a'.repeat(64);f.request.deploymentInventory=await f.write('deployment-inventory.json',d);await f.saveRequest();await assert.rejects(certifyBaseline(f.options),{code:'DEPLOYMENT_INVENTORY_BINDING'});}));
test('readiness: partial inventory cannot promote itself by complete=true',()=>fixture(async f=>{const d=JSON.parse(await fs.readFile(path.join(f.root,f.request.deploymentInventory.path)));d.complete=true;const r=checkDeploymentInventory(d,f.request.baseline.sha256,f.x.f.baselineManifest.files);assert.equal(r.complete,false);}));
test('readiness: browser=true without process isolation and completed checks remains pending',()=>fixture(async f=>{const d=JSON.parse(await fs.readFile(path.join(f.root,f.request.runtimeAcceptance.path)));d.mode='offline-node-fixtures-and-static-analysis';d.checks.find(x=>x.id==='browser-rendering').status='pending';assert.equal(checkRuntimeAcceptance(d,f.request.baseline.sha256).browserAccepted,false);}));
test('readiness: production access or unknown runtime state rejected',()=>fixture(async f=>{const d=JSON.parse(await fs.readFile(path.join(f.root,f.request.runtimeAcceptance.path)));d.productionRequests=1;assert.throws(()=>checkRuntimeAcceptance(d,f.request.baseline.sha256),{code:'RUNTIME_EVIDENCE_BINDING'});d.productionRequests=0;d.checks[0].status='probably-passed';assert.throws(()=>checkRuntimeAcceptance(d,f.request.baseline.sha256),{code:'RUNTIME_EVIDENCE_BINDING'});}));
test('readiness: missing console/browser checks rejected',()=>fixture(async f=>{const d=JSON.parse(await fs.readFile(path.join(f.root,f.request.runtimeAcceptance.path)));d.checks.pop();assert.throws(()=>checkRuntimeAcceptance(d,f.request.baseline.sha256),{code:'RUNTIME_EVIDENCE_BINDING'});}));
for(const arbitrary of [false,true])test('readiness: '+(arbitrary?'signed arbitrary content cannot impersonate':'exact canonical source transform has independent')+' provenance',()=>fixture(async f=>{
 const p='checkout/app.mjs',source="export {forgeFixture} from '../circuit-forge/app.mjs';\n",candidate=arbitrary?'export const arbitrary="unapproved";\n':stampSource(source,'mjs',f.request.sourceRevision);
 await fs.writeFile(path.join(f.root,'repository',p),source);await fs.unlink(path.join(f.root,'observations',p));
 for(const name of ['baseline','reference','rollback'])await fs.writeFile(path.join(f.root,name,p),candidate);
 for(const name of ['baseline','repository','observations','reference','rollback']){const m=await makeManifest(path.join(f.root,name),{provenance:{type:'supplied-artifact',description:'Synthetic canonical transformation contract'}});await fs.writeFile(path.join(f.root,name+'-manifest.json'),stable(m));f.request[name].sha256=sha256(stable(m));}
 f.functional.baselineManifestSHA256=f.request.baseline.sha256;await f.save();const r=await certifyBaseline(f.options);assert.equal(r.technicalStatus,arbitrary?'blocked':'certified');assert.equal(r.issues.some(x=>x.code==='PROVENANCE_MISSING'),arbitrary);
}));
test('prepared browser fixture server denies APIs, external paths and mutations; build identities remain usable',()=>{
 const module=fileURLToPath(new URL('../../scripts/atlas/serve-runtime-fixture.py',import.meta.url));
 const code="import importlib.util,sys\ns=importlib.util.spec_from_file_location('fixture',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nassert m.fixture_path('/')=='index.html'\nassert m.fixture_path('/site.mjs?build=abc123')=='site.mjs'\nfor p in ['https://example.invalid/','/rest/v1/x','/%2e%2e/x','/functions/v1/send','/site.mjs?token=bad']:\n try:m.fixture_path(p)\n except ValueError:continue\n raise AssertionError(p)\nassert \"connect-src 'none'\" in m.CSP and \"form-action 'none'\" in m.CSP and \"worker-src 'none'\" in m.CSP\nprint('policy-only checks; no server or browser started')";
 const r=spawnSync('/usr/bin/python3',['-c',code,module],{encoding:'utf8',env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',PYTHONDONTWRITEBYTECODE:'1'}});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/no server or browser started/);
});
