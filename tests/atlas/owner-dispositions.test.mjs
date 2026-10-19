import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {sha256,stable} from '../../scripts/atlas/core.mjs';
import {differenceIdentity,verifyOwnerDispositions} from '../../scripts/atlas/owner-dispositions.mjs';
import {certifyBaseline} from '../../scripts/atlas/certify-baseline.mjs';
import {certificationFixture} from './certification-fixture.mjs';
const matrix=JSON.parse(await fs.readFile(new URL('../../docs/atlas/evidence/phase2d-version-matrix.json',import.meta.url))),raw=await fs.readFile(new URL('../../docs/atlas/evidence/phase2e-owner-dispositions.json',import.meta.url)),value=JSON.parse(raw),digest=sha256(raw);
const options=()=>({value:structuredClone(value),digest,trustedDigests:[digest],rows:structuredClone(matrix.rows)});
test('owner disposition: Authorisation 24 selects only exact observed Operations bytes',()=>{const r=verifyOwnerDispositions(options());assert.deepEqual(r.resolved,['operations/snapshot.json']);assert.deepEqual(r.issues,[]);assert.equal(value.items[0].candidateSHA256,'0f8320dcc2a65cb1ec467ae1c70a3960b26dfd852bbd4c2853d9c8a5501837a3');assert.equal(value.scope,'content-preservation-only');});
test('owner disposition: self-supplied trust cannot resolve a content decision',()=>{const o=options();o.trustedDigests=[];const r=verifyOwnerDispositions(o);assert.equal(r.trusted,false);assert.deepEqual(r.resolved,[]);});
for(const key of ['candidateSHA256','observedLiveSHA256','repositorySHA256'])test('owner disposition: changed '+key+' cannot reuse approval',()=>{const o=options();o.rows.find(r=>r.path==='operations/snapshot.json')[key]='a'.repeat(64);assert.deepEqual(verifyOwnerDispositions(o).resolved,[]);});
test('owner disposition: cannot approve unrelated checkout or other difference',()=>{const o=options();o.rows=o.rows.filter(r=>r.path!=='operations/snapshot.json');o.rows.find(r=>r.path==='checkout/index.html').ownerDecisionRequired=true;const r=verifyOwnerDispositions(o);assert.deepEqual(r.resolved,[]);assert.equal(r.issues[0].code,'OWNER_DISPOSITION_BINDING');});
test('owner disposition: publication or rewrite authority is rejected',()=>{const o=options();o.value.scope='production-publication';assert.throws(()=>verifyOwnerDispositions(o),{code:'OWNER_DISPOSITION_SCHEMA'});});
test('owner disposition: real bytes remain untouched and missing evidence still blocks certification',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atlas-owner-'));try{
  const f=await certificationFixture(root),row=await f.addHistoricalDifference();row.ownerDecisionRequired=true;row.classification='requires-owner-review';await f.save();
  const selected={schemaVersion:1,kind:'atlas-owner-dispositions',decisionId:'synthetic-only',ownerReference:'synthetic test',scope:'content-preservation-only',items:[{path:row.path,differenceSHA256:differenceIdentity(row),repositorySHA256:row.repositorySHA256,observedLiveSHA256:row.observedLiveSHA256,candidateSHA256:row.candidateSHA256,decision:'preserve-observed-bytes'}]};
  const ref=await f.write('owner.json',selected);f.request.ownerDispositions=ref;f.request.reference=null;await f.save();
  const before=await fs.readFile(path.join(root,'baseline',row.path)),r=await certifyBaseline({...f.options,trustedOwnerDispositions:[ref.sha256]});assert.equal(r.technicalStatus,'blocked');assert.equal(r.counts.ownerDispositionsVerified,1);assert.equal(r.properties.ownerContentDisposition,'verified-preservation');assert.ok(r.issues.some(x=>x.code==='REFERENCE_MISSING'));assert.ok(!r.issues.some(x=>x.code==='UNRESOLVED_DIFFERENCE'));assert.deepEqual(await fs.readFile(path.join(root,'baseline',row.path)),before);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
