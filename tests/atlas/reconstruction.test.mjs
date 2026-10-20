import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {sourceTransformation,generatedEvidence,closureConclusions} from '../../scripts/atlas/reconstruction.mjs';
import {checkScreenshotPNG} from '../../scripts/atlas/png-evidence.mjs';
const revision='b'.repeat(40),source=Buffer.from('<script src="/app.mjs"></script>'),blob=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+source.length+'\0'),source])).digest('hex');
const args={name:'index.html',source,blobSHA1:blob,revision,candidate:Buffer.from('<script src="/app.mjs?build='+revision+'"></script>')};
test('source transformation executes exact stamping, without payload/live promotion',()=>{const r=sourceTransformation(args);assert.equal(r.exactCandidateMatch,true);assert.equal(r.historicalPayloadAuthenticated,false);assert.equal(r.currentLiveIdentityVerified,false);});
test('source transformation rejects forged Git blob provenance',()=>assert.throws(()=>sourceTransformation({...args,blobSHA1:'0'.repeat(40)}),{code:'RECONSTRUCTION_SOURCE'}));
test('source transformation reports generator drift as mismatch',()=>assert.equal(sourceTransformation({...args,candidate:Buffer.from('changed')}).exactCandidateMatch,false));
test('source transformation wrong stamp cannot match',()=>assert.equal(sourceTransformation({...args,revision:'c'.repeat(40)}).exactCandidateMatch,false));
test('missing historical response cannot be labelled historical input',()=>assert.throws(()=>generatedEvidence({inputKind:'historical-response',historicalResponseRetained:false}),{code:'RECONSTRUCTION_INPUT'}));
test('matching synthetic output remains synthetic',()=>{const r=generatedEvidence({inputKind:'synthetic',executedSHA256:'a',candidateSHA256:'a'});assert.equal(r.exactCandidateMatch,true);assert.equal(r.historicalPayloadAuthenticated,false);assert.equal(r.claim,'synthetic-fixture-only');});
test('matching repository seed does not authenticate published RPC state',()=>{const r=generatedEvidence({inputKind:'repository-seeds',executedSHA256:'a',candidateSHA256:'a'});assert.match(r.claim,/unproved/);assert.equal(r.historicalPayloadAuthenticated,false);});
test('missing generator input remains unexecuted',()=>assert.equal(generatedEvidence({inputKind:'unavailable'}).execution,'not-executed'));
const reconstruction={paths:[{historicalPayloadAuthenticated:false,currentLiveIdentityVerified:false}],pathMembership:423,sourceAssociated:415,exactSourceTransformations:325,generatedHistoricalInputsRetained:0,exactObserved:54,baselineManifestSHA256:'a'.repeat(64)};
const certification={technicalStatus:'blocked',issues:[{code:'WITNESS_MISSING'}],properties:{referenceCompleteness:'passed',versionConsistency:'blocked',ownerContentDisposition:'verified-preservation'}};
test('historical reconstruction and current-live conclusions remain separate',()=>{const r=closureConclusions({certification,reconstruction,observationDate:'2026-10-19',evaluationDate:'2026-10-20'});assert.equal(r.historicalReconstruction.verdict,'Partially attested, publication blocked');assert.equal(r.currentProductionBaseline.verdict,'Unknown');assert.equal(r.deployable,false);});
test('a stale public observation cannot certify current production',()=>assert.equal(closureConclusions({certification,reconstruction,observationDate:'2000-01-01'}).currentProductionBaseline.completeCurrentObservation,false));
test('missing runtime witness remains a blocker even with browser receipt',()=>{const r=closureConclusions({certification,reconstruction,browser:{browserAccepted:true}});assert(r.blockers.includes('WITNESS_MISSING'));assert.equal(r.deployable,false);});
test('reconstruction cannot self-promote to historical artifact',()=>assert.throws(()=>closureConclusions({certification,reconstruction:{...reconstruction,paths:[{historicalPayloadAuthenticated:true,currentLiveIdentityVerified:false}]}}),{code:'CLOSURE_ESCALATION'}));
test('reconstruction cannot self-promote to current production',()=>assert.throws(()=>closureConclusions({certification,reconstruction:{...reconstruction,paths:[{historicalPayloadAuthenticated:false,currentLiveIdentityVerified:true}]}}),{code:'CLOSURE_ESCALATION'}));
test('owner engineering authority never becomes publication authority',()=>assert.equal(closureConclusions({certification,reconstruction}).publicationAuthorised,false));
test('fabricated PNG header cannot stand in for screenshot',()=>{const b=Buffer.alloc(24);b.write('89504e470d0a1a0a',0,'hex');b.writeUInt32BE(1440,16);b.writeUInt32BE(900,20);assert.throws(()=>checkScreenshotPNG(b,1440,900),{code:'BROWSER_SCREENSHOT'});});
function crc(b){let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,b){const n=Buffer.alloc(4),t=Buffer.from(type),s=Buffer.alloc(4);n.writeUInt32BE(b.length);s.writeUInt32BE(crc(Buffer.concat([t,b])));return Buffer.concat([n,t,b,s]);}
function png(){const h=Buffer.alloc(13);h.writeUInt32BE(2,0);h.writeUInt32BE(2,4);h[8]=8;h[9]=6;return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',h),chunk('IDAT',deflateSync(Buffer.alloc(18))),chunk('IEND',Buffer.alloc(0))]);}
test('valid synthetic PNG verifies structure, not execution authenticity',()=>assert.equal(checkScreenshotPNG(png(),2,2).structurallyValid,true));
test('corrupt PNG chunk is rejected even with recomputed outer file hash',()=>{const b=png();b[40]^=1;assert.throws(()=>checkScreenshotPNG(b,2,2),{code:'BROWSER_SCREENSHOT'});});
test('PNG wrong viewport is rejected',()=>assert.throws(()=>checkScreenshotPNG(png(),1440,900),{code:'BROWSER_SCREENSHOT'}));
