import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {prepareRelease} from '../../scripts/atlas/prepare-release.mjs';
import {makeProtection,makePolicy} from '../../scripts/atlas/assemble-static-overlay.mjs';
import {releaseFixture} from './release-fixture.mjs';
import {sha256,stable} from '../../scripts/atlas/core.mjs';
async function withFixture(run){const root=await fs.mkdtemp(path.join(os.tmpdir(),'atlas-release-'));try{return await run(await releaseFixture(root));}finally{await fs.rm(root,{recursive:true,force:true});}}
const absent=p=>fs.access(p).then(()=>false,()=>true);
test('release: pinned synthetic input assembles and verifies without publication authority',()=>withFixture(async x=>{
 const r=await prepareRelease(x.config);assert.equal(r.status,'candidate-verified');assert.equal(r.verified.valid,true);assert.equal(r.publicationAllowed,false);assert.equal(r.deploymentEnabled,false);assert.equal(r.modeDecision.mode,'blocked');
 const preservation=JSON.parse(await fs.readFile(path.join(x.config.output,'preservation.json'),'utf8'));assert.equal(preservation.filter(x=>x.status==='unchanged').length,15);
 for(const f of x.f.baselineManifest.files)if(f.path!=='index.html')assert.deepEqual(await fs.readFile(path.join(x.f.baselineRoot,f.path)),await fs.readFile(path.join(x.config.output,'site',f.path)));
}));
for(const mode of ['full-build','cms-only'])test('release: '+mode+' never invokes a live generator or fallback',()=>withFixture(async x=>{x.config.context.mode=mode;await assert.rejects(prepareRelease(x.config),{code:'LIVE_BUILD_UNAVAILABLE'});assert.ok(await absent(x.config.output));}));
for(const classification of ['synthetic','partial-capture','candidate-reconstruction'])test('release: production rejects '+classification,()=>withFixture(async x=>{x.evidence.classification=classification;await x.save();x.config.purpose='production-preflight';await assert.rejects(prepareRelease(x.config),{code:'BASELINE_NOT_ATTESTED'});assert.ok(await absent(x.config.output));}));
for(const [name,mutate,code] of [
 ['missing input pin',x=>delete x.config.inputSHA256,'PIN_REQUIRED'],
 ['missing review pin',x=>delete x.config.evidenceSHA256,'PIN_REQUIRED'],
 ['missing manifest pin',async x=>{delete x.input.baseline.sha256;await x.save();},'PIN_REQUIRED'],
 ['input digest',x=>x.config.inputSHA256='a'.repeat(64),'INPUT_DIGEST_MISMATCH'],
 ['evidence digest',x=>x.config.evidenceSHA256='a'.repeat(64),'INPUT_DIGEST_MISMATCH'],
 ['source mismatch',x=>x.config.sourceRevision='a'.repeat(40),'SOURCE_MISMATCH'],
 ['missing baseline',x=>fs.rm(x.f.baselineRoot,{recursive:true}),'ENOENT'],
 ['corrupt baseline',x=>fs.writeFile(path.join(x.f.baselineRoot,'robots.txt'),'corrupt'),'INVALID_BASELINE'],
 ['traversal',async x=>{x.input.baseline.root='../baseline';await x.save();},'UNSAFE_PATH'],
 ['untrusted branch',x=>x.config.context.ref='refs/heads/not-main','REF_BLOCKED'],
 ['scheduled static',x=>x.config.context.event='schedule','SCHEDULE_NO_PUBLICATION'],
 ['malformed mode',x=>x.config.context.mode='static-ish','INVALID_CONTEXT'],
 ['unmarked push',x=>x.config.context.event='push','MODE_MISMATCH'],
 ['conflicting push',x=>{x.config.context.event='push';x.config.context.commitMessage='[static-only] [cms-only]';},'MODE_MISMATCH'],
 ['synthetic promoted',async x=>{x.evidence.classification='authenticated-complete-production-artifact';await x.save();},'SYNTHETIC_ATTESTATION'],
 ['executable bit',x=>fs.chmod(path.join(x.f.baselineRoot,'checkout/app.mjs'),0o755),'UNEXPECTED_EXECUTABLE'],
 ['unsupported executable',x=>fs.writeFile(path.join(x.f.baselineRoot,'launch.sh'),'exit 0'),'UNEXPECTED_EXECUTABLE'],
 ['protection digest',async x=>{x.input.protection.sha256='a'.repeat(64);await x.save();},'INPUT_DIGEST_MISMATCH'],
 ['duplicate JSON key',async x=>{const b=Buffer.from('{"schemaVersion":1,"schemaVersion":1}');await fs.writeFile(x.config.inputFile,b);x.config.inputSHA256=sha256(b);},'DUPLICATE_JSON_KEY']
])test('release: blocks '+name+' before output',()=>withFixture(async x=>{await mutate(x);await assert.rejects(prepareRelease(x.config),{code});assert.ok(await absent(x.config.output));}));
test('release: audit only verifies baseline and creates no candidate',()=>withFixture(async x=>{x.config.context={event:'schedule',ref:'refs/heads/main',mode:'audit-only',commitMessage:''};const r=await prepareRelease(x.config);assert.equal(r.status,'audit-passed');assert.equal(r.candidateCreated,false);assert.ok(await absent(x.config.output));}));
test('release: failed validation can recover without touching pinned rollback input',()=>withFixture(async x=>{const original=await fs.readFile(path.join(x.f.baselineRoot,'robots.txt'));await fs.writeFile(path.join(x.f.baselineRoot,'robots.txt'),'bad');await assert.rejects(prepareRelease(x.config));await fs.writeFile(path.join(x.f.baselineRoot,'robots.txt'),original);const r=await prepareRelease(x.config);assert.equal(r.verified.valid,true);assert.equal(r.rollback.baselineManifestSHA256,x.input.baseline.sha256);}));
test('release: simulated complete review alone cannot substitute independent certification',()=>withFixture(async x=>{
 // Mock review only. Test bytes remain synthetic; this is not an actual attestation.
 x.f.baselineManifest.provenance={type:'supplied-artifact',description:'Mock artifact provenance for isolated contract test'};
 const protection=makeProtection(x.f.baselineManifest),policy=makePolicy(x.f.baselineManifest,x.f.overlayManifest,protection);
 for(const [name,value,key] of [['baseline-manifest.json',x.f.baselineManifest,'baseline'],['protection.json',protection,'protection'],['policy.json',policy,'policy']]){await fs.writeFile(path.join(x.f.root,name),stable(value));x.input[key].sha256=sha256(stable(value));}
 x.evidence.classification='authenticated-complete-production-artifact';x.evidence.baselineManifestSHA256=x.input.baseline.sha256;await x.save();x.config.purpose='production-preflight';
 await assert.rejects(prepareRelease(x.config),{code:'CERTIFICATION_REQUIRED'});assert.ok(await absent(x.config.output));
}));
test('release: CLI blocked output is machine readable; no default dist fallback',()=>{const p=spawnSync(process.execPath,[fileURLToPath(new URL('../../scripts/atlas/prepare-release.mjs',import.meta.url))],{encoding:'utf8',env:process.env});assert.equal(p.status,1);assert.equal(JSON.parse(p.stdout).status,'blocked');});
