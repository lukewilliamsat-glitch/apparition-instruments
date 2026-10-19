// Full local Atlas pipeline with frozen Spectre bytes and explicitly synthetic routes.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {recoveryFixture} from './recovery-fixture.mjs';
import {writeFiles,BASE_FILES} from './fixture.mjs';
import {htmlTokens} from '../../scripts/atlas/references.mjs';
import {makeManifest,sha256,stable,loadJSON,readRegular} from '../../scripts/atlas/core.mjs';
import {makeProtection,makePolicy} from '../../scripts/atlas/assemble-static-overlay.mjs';
import {runRelease} from '../../scripts/atlas/run-release.mjs';
import {validateSnapshot} from '../../scripts/atlas/validate-snapshot.mjs';
const [frozenDist,output]=process.argv.slice(2);if(!frozenDist||!output)throw Error('Usage: spectre-release-rehearsal.mjs FROZEN_DIST NEW_OUTPUT');await fs.mkdir(output);const f=await recoveryFixture(output);
const spec=(await loadJSON(fileURLToPath(new URL('../../docs/atlas/spectre-source.json',import.meta.url)))).value;const overlay={};
for(const item of spec.files){const b=await readRegular(path.join(frozenDist,item.path));assert.equal(sha256(b),item.sha256);assert.equal(b.length,item.size);overlay[item.path]=b;}
const stubs={'assets/apparition-logo-email.png':BASE_FILES['products/cde-synthetic/image.png']};
for(const t of htmlTokens(overlay['landing-v02/index.html'].toString()))if(t.name==='a'&&t.attrs.href?.startsWith('/')&&t.attrs.href.endsWith('/')&&t.attrs.href!=='/')stubs[t.attrs.href.slice(1)+'index.html']='<html><head><title>Synthetic linked route</title></head><body>Fixture only</body></html>\n';
await writeFiles(f.x.f.baselineRoot,stubs);await writeFiles(f.x.f.overlayRoot,overlay);
f.x.f.baselineManifest=await makeManifest(f.x.f.baselineRoot,{provenance:{type:'synthetic',description:'Synthetic route baseline for complete Spectre release rehearsal'}});
f.x.f.overlayManifest=await makeManifest(f.x.f.overlayRoot,{criticalRoutes:['index.html','landing-v02/index.html'],provenance:{type:'supplied-artifact',description:'Frozen Spectre source bytes with synthetic homepage footer insertion'}});
f.x.f.protectedManifest=makeProtection(f.x.f.baselineManifest);f.x.f.policy=makePolicy(f.x.f.baselineManifest,f.x.f.overlayManifest,f.x.f.protectedManifest);
for(const [name,value,key] of [['baseline-manifest.json',f.x.f.baselineManifest,'baseline'],['overlay-manifest.json',f.x.f.overlayManifest,'overlay'],['protection.json',f.x.f.protectedManifest,'protection'],['policy.json',f.x.f.policy,'policy']]){await fs.writeFile(path.join(output,name),stable(value));f.x.input[key].sha256=sha256(stable(value));}
f.x.evidence.baselineManifestSHA256=f.x.input.baseline.sha256;f.scope.categories.protectedContent=f.x.f.baselineManifest.files.map(x=>x.path);f.provenance.files=f.x.f.baselineManifest.files.map(x=>({path:x.path,sha256:x.sha256,sourceType:'synthetic-fixture',sourceId:'synthetic/'+x.path,revision:'synthetic-v1'}));await f.save();
const r=await runRelease(f.run);assert.equal(r.status,'rehearsal-verified');assert.equal(r.deployable,false);assert.equal(r.staging.assembled.protectedUnchanged,23);
for(const item of spec.files)assert.equal(sha256(await readRegular(path.join(f.run.output,'site',item.path))),item.sha256);
const rollback=await validateSnapshot(f.x.f.baselineRoot,f.x.f.baselineManifest);assert.equal(rollback.valid,true);assert.equal(rollback.manifestSHA256,f.x.input.baseline.sha256);
const report={...r,spectreSource:spec.commit,spectreTree:spec.tree,frozenAssetHashesMatch:true,protectedUnchanged:23,rollbackBaselineVerified:true,browserAcceptance:false,livePublication:false};await fs.writeFile(path.join(output,'REHEARSAL.json'),stable(report));console.log(JSON.stringify({status:r.status,protectedUnchanged:23,rollbackBaselineVerified:true,deployable:false}));
