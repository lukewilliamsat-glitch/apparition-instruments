import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {certificationFixture} from './certification-fixture.mjs';
import {certifyBaseline,requireCertifiedBaseline} from '../../scripts/atlas/certify-baseline.mjs';
import {prepareRelease} from '../../scripts/atlas/prepare-release.mjs';
import {runRelease} from '../../scripts/atlas/run-release.mjs';
import {assessRecovery} from '../../scripts/atlas/assess-recovery.mjs';
import {verifyArtifact} from '../../scripts/atlas/assemble-static-overlay.mjs';
import {sha256,stable,makeManifest} from '../../scripts/atlas/core.mjs';
async function fixture(run){const root=await fs.mkdtemp(path.join(os.tmpdir(),'atlas-certification-'));try{return await run(await certificationFixture(root));}finally{await fs.rm(root,{recursive:true,force:true});}}
async function blocked(f,code){const r=await certifyBaseline(f.options);assert.equal(r.technicalStatus,'blocked');assert.ok(r.issues.some(x=>x.code===code),JSON.stringify(r.issues));assert.throws(()=>requireCertifiedBaseline(r,f.request.baseline.sha256),{code:'CERTIFICATION_REQUIRED'});return r;}
test('certification: independent signed fixture, source cross-check, exact reference and rollback; no publication authority',()=>fixture(async f=>{const a=await certifyBaseline(f.options),b=await certifyBaseline(f.options);assert.equal(a.technicalStatus,'certified');assert.equal(a.properties.publicationAuthorisation,'not-granted');assert.equal(a.deployable,false);assert.equal(stable(a),stable(b));assert.equal(requireCertifiedBaseline(a,f.request.baseline.sha256),a);assert.throws(()=>requireCertifiedBaseline(JSON.parse(stable(a)),f.request.baseline.sha256),{code:'CERTIFICATION_REQUIRED'});}));
test('certification: no trust anchors means no authenticity, even if evidence is signed',()=>fixture(async f=>{f.options.trustedSigners={};await blocked(f,'UNTRUSTED_WITNESS');}));
test('certification: absence of complete reference cannot be approved away',()=>fixture(async f=>{f.request.reference=null;await f.save();await blocked(f,'REFERENCE_MISSING');}));
test('certification: unsigned reconstruction flags are not evidence',()=>fixture(async f=>{f.request.inventoryWitness=null;f.request.functionalWitness=null;await f.saveRequest();await blocked(f,'WITNESS_MISSING');}));
test('certification: forged verdict cannot bypass lower-level production adapter',()=>fixture(async f=>{f.x.config.purpose='production-preflight';await assert.rejects(prepareRelease({...f.x.config,certificate:{technicalStatus:'certified'}}),{code:'CERTIFICATION_REQUIRED'});}));
test('certification: verified contract enables only local guarded assembly and final integrity verification',()=>fixture(async f=>{const certificate=await certifyBaseline(f.options);f.x.config.purpose='production-preflight';const r=await prepareRelease({...f.x.config,certificate});assert.equal(r.verified.valid,true);assert.equal(r.productionPublicationAuthorised,false);assert.equal((await verifyArtifact(f.x.config.output,{expectedReceiptSHA256:r.assembled.receiptSHA256})).valid,true);await assert.rejects(prepareRelease({...f.x.config,certificate}),{code:'OUTPUT_EXISTS'});}));
for(const [label,mutation,code]of [
 ['missing route',async f=>{f.requirements.categories.routes.push('missing/index.html');await f.save();},'REQUIRED_FILE_MISSING'],
 ['unknown runtime dependency',async f=>{f.requirements.unknownDynamicDependencies.push('Unreviewed dynamic import');await f.save();},'DYNAMIC_DEPENDENCIES_UNKNOWN'],
 ['hidden checkout category',async f=>{f.requirements.categories.checkout=[];f.requirements.emptyCategoryReasons.checkout='Owner says unnecessary';await f.save();},'MISCLASSIFIED_COVERAGE'],
 ['hidden product image category',async f=>{f.requirements.categories.productImages=[];f.requirements.emptyCategoryReasons.productImages='Owner says unnecessary';await f.save();},'MISCLASSIFIED_COVERAGE'],
 ['failed functional review',async f=>{f.functional.checks[0].status='failed';await f.save();},'FUNCTIONAL_NOT_PASSED'],
 ['incomplete functional review',async f=>{f.functional.checks.pop();await f.save();},'FUNCTIONAL_COVERAGE'],
 ['independent source alias',async f=>{f.request.repository={...f.request.baseline};await f.save();},'DEPENDENT_SOURCE'],
 ['rollback changed',async f=>{await fs.writeFile(path.join(f.root,'rollback/style.css'),'changed');},'SNAPSHOT_INTEGRITY'],
 ['reference changed',async f=>{await fs.writeFile(path.join(f.root,'reference/style.css'),'changed');},'VERSION_SET_MISMATCH'],
 ['candidate tamper',async f=>{await fs.writeFile(path.join(f.root,'baseline/style.css'),'changed');},'SNAPSHOT_INTEGRITY'],
 ['unexpected candidate asset',async f=>{await fs.writeFile(path.join(f.root,'baseline/new.png'),'unexpected');},'SNAPSHOT_INTEGRITY'],
 ['missing original asset',async f=>{await fs.unlink(path.join(f.root,'baseline/products/cde-synthetic/image.png'));},'REFERENCE_CLOSURE'],
 ['replaced observed version',async f=>{await fs.writeFile(path.join(f.root,'observations/style.css'),'observed different');},'OBSERVED_VERSION_REPLACED'],
 ['unreported version conflict',async f=>{await fs.writeFile(path.join(f.root,'repository/style.css'),'historical different');},'MATRIX_COVERAGE']
])test('certification rejects '+label+' without output',()=>fixture(async f=>{await mutation(f);await blocked(f,code);await assert.rejects(fs.stat(f.x.config.output),{code:'ENOENT'});}));
for(const [label,mutation]of [
 ['unknown contract version',f=>{f.request.schemaVersion=2;}],['missing schema field',f=>{delete f.request.baselineId;}],['unexpected self approval',f=>{f.request.ownerApproved=true;}],['unknown nested field',f=>{f.request.baseline.complete=true;}],['invalid digest',f=>{f.request.matrix.sha256='not-a-hash';}]
])test('certification strict schema: '+label,()=>fixture(async f=>{mutation(f);await f.saveRequest();await assert.rejects(certifyBaseline(f.options),e=>['CERT_SCHEMA','INVALID_CONTRACT'].includes(e.code));}));
test('certification: supplied request hash must be independently pinned',()=>fixture(async f=>{await assert.rejects(certifyBaseline({...f.options,requestSHA256:undefined}),{code:'CERT_PIN'});await assert.rejects(certifyBaseline({...f.options,requestSHA256:'a'.repeat(64)}),{code:'INPUT_DIGEST_MISMATCH'});}));
test('certification: duplicate JSON key rejected',()=>fixture(async f=>{const raw=(await fs.readFile(f.options.requestFile,'utf8')).replace('"schemaVersion": 1','"schemaVersion": 1, "schemaVersion": 1');await fs.writeFile(f.options.requestFile,raw);f.options.requestSHA256=sha256(raw);await assert.rejects(certifyBaseline(f.options),{code:'DUPLICATE_JSON_KEY'});}));
test('certification: authenticated witness payload tamper is rejected',()=>fixture(async f=>{const file=path.join(f.root,f.request.inventoryWitness.path),env=JSON.parse(await fs.readFile(file));env.payload.deploymentId='tamper';f.request.inventoryWitness=await f.write(f.request.inventoryWitness.path,env);await f.saveRequest();await blocked(f,'WITNESS_SIGNATURE');}));
test('certification: signed review cannot override modified evidence bytes',()=>fixture(async f=>{await fs.writeFile(path.join(f.root,f.functional.checks[0].evidence.path),'{}');await assert.rejects(certifyBaseline(f.options),{code:'INPUT_DIGEST_MISMATCH'});}));
test('certification: serialised certificate cannot be reused after process restart',()=>fixture(async f=>{const r=await certifyBaseline(f.options);assert.throws(()=>requireCertifiedBaseline({...r},f.request.baseline.sha256),{code:'CERTIFICATION_REQUIRED'});assert.throws(()=>requireCertifiedBaseline(r,'a'.repeat(64)),{code:'CERTIFICATION_REQUIRED'});}));
test('certification: individually bound observed/historical mismatch is preserved without choosing the newer source',()=>fixture(async f=>{await f.addHistoricalDifference();const r=await certifyBaseline(f.options);assert.equal(r.technicalStatus,'certified');assert.equal(r.counts.differences,1);}));
for(const [label,mutation,code]of [
 ['owner decision unresolved',r=>{r.ownerDecisionRequired=true;r.classification='requires-owner-review';},'UNRESOLVED_DIFFERENCE'],
 ['false generated equivalence',r=>{r.classification='expected-generated-difference';},'FALSE_GENERATED_CLAIM'],
 ['false stamp claim',r=>{r.exactCanonicalStampMatch=true;},'STAMP_EVIDENCE'],
 ['wrong observed bytes',r=>{r.observedLiveSHA256='a'.repeat(64);},'MATRIX_BINDING'],
 ['wrong candidate bytes',r=>{r.candidateSHA256='a'.repeat(64);},'MATRIX_BINDING'],
 ['unresolved protected discrepancy',r=>{r.classification='unresolved-unsafe';},'UNRESOLVED_DIFFERENCE']
])test('certification version matrix rejects '+label+' despite signed review',()=>fixture(async f=>{const row=await f.addHistoricalDifference();mutation(row);await f.save();await blocked(f,code);}));
test('certification: duplicate matrix paths rejected',()=>fixture(async f=>{const row=await f.addHistoricalDifference();f.matrix.rows.push({...row});await f.save();await assert.rejects(certifyBaseline(f.options),{code:'PATH_COLLISION'});}));
test('certification: same-origin absolute product image cannot hide in external-reference classification',()=>fixture(async f=>{
 const original=await fs.readFile(path.join(f.root,'baseline/index.html'),'utf8'),html=original.replace('</body>','<img src="https://apparitioninstruments.co.uk/products/unrecovered/image.png" alt="Synthetic missing"><\/body>');
 for(const name of ['baseline','repository','observations','reference','rollback']){
  await fs.writeFile(path.join(f.root,name,'index.html'),html);const m=await makeManifest(path.join(f.root,name),{provenance:{type:'supplied-artifact',description:'Synthetic same-origin reference test'}});await fs.writeFile(path.join(f.root,name+'-manifest.json'),stable(m));f.request[name].sha256=sha256(stable(m));
 }
 f.functional.baselineManifestSHA256=f.request.baseline.sha256;await f.save();const r=await blocked(f,'FIRST_PARTY_ASSET_MISSING');assert.equal(r.counts.missingFirstPartyAssets,1);assert.equal(r.properties.referenceCompleteness,'failed');
}));
test('certification: complete guarded run re-verifies independent evidence and binds deterministic release/rollback identities',()=>fixture(async f=>{
 const scope={schemaVersion:1,kind:'atlas-completeness-scope',categories:{routes:f.requirements.categories.routes,protectedContent:f.x.f.baselineManifest.files.map(x=>x.path),productImages:f.requirements.categories.productImages,news:f.requirements.categories.news,cms:[],checkout:f.requirements.categories.checkout,staticAssets:f.requirements.categories.staticAssets},emptyCategoryReasons:{cms:'Explicit fixture has no CMS'},inventoryAuthority:'owner-reviewed',inventoryReference:'Synthetic contract review only',versionCompatibilityReviewed:true,unknownPaths:[],excludedPaths:[],artifactReview:null};
 const provenance={schemaVersion:1,kind:'atlas-recovery-provenance',files:f.x.f.baselineManifest.files.map(x=>({path:x.path,sha256:x.sha256,sourceType:'verified-historical-repository-object',sourceId:'synthetic-git-source',revision:f.request.sourceRevision}))};
 const scopeRef=await f.write('scope.json',scope),provenanceRef=await f.write('provenance.json',provenance),plan={schemaVersion:1,kind:'atlas-release-run',sourceRevision:f.request.sourceRevision,mode:'static-only',context:f.x.config.context,preparation:{path:'release-input.json',sha256:f.x.config.inputSHA256},evidence:{path:'evidence.json',sha256:f.x.config.evidenceSHA256},scope:scopeRef,provenance:provenanceRef};
 const assessment=await assessRecovery({root:f.x.f.baselineRoot,manifestFile:path.join(f.root,'baseline-manifest.json'),manifestSHA256:f.x.input.baseline.sha256,scopeFile:path.join(f.root,scopeRef.path),scopeSHA256:scopeRef.sha256,provenanceFile:path.join(f.root,provenanceRef.path),provenanceSHA256:provenanceRef.sha256});
 const approval=await f.write('approval.json',{schemaVersion:1,kind:'atlas-completeness-approval',assessmentSHA256:sha256(stable(assessment)),manifestSHA256:f.x.input.baseline.sha256,sourceRevision:f.request.sourceRevision,approvalReference:'Synthetic contract-only approval, NOT real authority'}),planRef=await f.write('run-plan.json',plan);
 const options={planFile:path.join(f.root,planRef.path),planSHA256:planRef.sha256,sourceRevision:f.request.sourceRevision,output:f.x.config.output,approvalFile:path.join(f.root,approval.path),approvalSHA256:approval.sha256,certificationRequestFile:f.options.requestFile,certificationRequestSHA256:f.options.requestSHA256,trustedSigners:f.options.trustedSigners};
 const a=await runRelease(options),b=await runRelease({...options,output:path.join(f.root,'second')});assert.equal(stable(a),stable(b));assert.equal(a.certificate.technicalStatus,'certified');assert.equal(a.rollback.baselineId,f.request.baseline.sha256);assert.match(a.releaseId,/^[a-f0-9]{64}$/);assert.equal(a.deploymentEnabled,false);
}));
