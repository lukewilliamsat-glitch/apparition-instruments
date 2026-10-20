// Current Atlas tooling; preserved candidate; validation-only; inherited network denial.
import path from 'node:path';
import * as fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {loadJSON,sha256,stable,inventory,sameFiles} from '../../scripts/atlas/core.mjs';
import {runRelease} from '../../scripts/atlas/run-release.mjs';
import {certifyBaseline,requireCertifiedBaseline} from '../../scripts/atlas/certify-baseline.mjs';
import {closureConclusions} from '../../scripts/atlas/reconstruction.mjs';
const [previous,reconstructionFile,out]=process.argv.slice(2);if(!out)throw Error('Explicit previous/reconstruction/fresh output required');await fs.mkdir(out);
const reconstruction=(await loadJSON(reconstructionFile)).value,request=await loadJSON(path.join(previous,'certification.json'));
const verdict=await certifyBaseline({requestFile:path.join(previous,'certification.json'),requestSHA256:request.sha256,trustedOwnerDispositions:['bde8f5eff303f687e5b3f97d0dc41db1bb0796225562294bdefabd9ec5ae67b0']});
assert.equal(verdict.technicalStatus,'blocked');assert.throws(()=>requireCertifiedBaseline(verdict,reconstruction.baselineManifestSHA256));
const planFile=path.join(previous,'run-plan.json'),plan=await loadJSON(planFile),opts={planFile,planSHA256:plan.sha256,sourceRevision:plan.value.sourceRevision};
const a=await runRelease({...opts,output:path.join(out,'assembly-a')}),b=await runRelease({...opts,output:path.join(out,'assembly-b')});assert.equal(stable(a),stable(b));assert.equal(a.staging.assembled.protectedUnchanged,422);assert.equal(sameFiles(await inventory(path.join(previous,'baseline')),await inventory(path.join(previous,'rollback'))),true);
const closure=closureConclusions({certification:verdict,reconstruction,observationDate:'Preserved individual Phase2D–2F observations; no new production GET',evaluationDate:'2026-10-20'});
await fs.writeFile(path.join(out,'VERDICT.json'),stable(verdict));await fs.writeFile(path.join(out,'CLOSURE.json'),stable(closure));
const report={mode:'validation-only',candidateManifestSHA256:reconstruction.baselineManifestSHA256,deterministicAssembly:true,protectedFilesUnchanged:422,exactCandidateRollback:true,originalCandidatePreserved:true,staticOnly:true,productionPreflightBlocked:true,spectreFixture:'Frozen source reused; no publication',runtimeNetwork:'inherited seccomp + injected fixtures',browserAccepted:false,productionRequests:0,stripeRequests:0,deployments:0};await fs.writeFile(path.join(out,'REHEARSAL.json'),stable(report));console.log(stable(report));
