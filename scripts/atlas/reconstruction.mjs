// Transformation evidence is not historical payload authentication or live identity.
import {createHash} from 'node:crypto';
import path from 'node:path';
import {stampSource} from '../stamp-static-assets.mjs';
import {sha256,fail,portablePath} from './core.mjs';
export function authenticateSourceBlob(source,blobSHA1){
 const git=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+source.length+'\0'),source])).digest('hex');
 if(git!==blobSHA1)fail('RECONSTRUCTION_SOURCE','Source blob authentication failed');return git;
}
export function sourceTransformation({name,source,blobSHA1,revision,candidate,generatorControlled=false}){
 portablePath(name);
 if(!/^[a-f0-9]{40}$/.test(revision))fail('RECONSTRUCTION_SOURCE','Wrong source revision');
 const git=authenticateSourceBlob(source,blobSHA1);
 const kind=path.extname(name).slice(1),output=Buffer.from(stampSource(source.toString('utf8'),kind,revision));
 const bytes=['html','mjs','js'].includes(kind)?output:source;
 return {path:name,sourceBlobSHA1:git,sourceSHA256:sha256(source),transformedSHA256:sha256(bytes),candidateSHA256:sha256(candidate),transformation:sha256(source)===sha256(bytes)?'direct-source-copy':'canonical-static-stamp',exactCandidateMatch:sha256(bytes)===sha256(candidate),generatorControlled,reproducedSourceTransformation:true,historicalPayloadAuthenticated:false,currentLiveIdentityVerified:false};
}
export function generatedEvidence({inputKind,historicalResponseRetained,executedSHA256,candidateSHA256}){
 if(!['repository-seeds','historical-response','synthetic','unavailable'].includes(inputKind))fail('RECONSTRUCTION_INPUT','Unknown input provenance');
 if(inputKind==='historical-response'&&historicalResponseRetained!==true)fail('RECONSTRUCTION_INPUT','Missing retained historical response');
 return {inputKind,exactCandidateMatch:!!executedSHA256&&executedSHA256===candidateSHA256,execution:executedSHA256?'executed':'not-executed',historicalResponseRetained:historicalResponseRetained===true,historicalPayloadAuthenticated:false,claim:inputKind==='synthetic'?'synthetic-fixture-only':inputKind==='repository-seeds'?'authenticated-source-inputs; historical RPC equivalence unproved':inputKind==='historical-response'?'reproduced from retained response; deployed payload still unproved':'historical inputs unavailable'};
}
// This supplemental assessment never creates a certificate or a publication token.
// Only the existing certificate engine can issue its private in-memory capability.
export function closureConclusions({certification,reconstruction,browser=null,observationDate=null,evaluationDate=null}){
 if(!certification||!Array.isArray(certification.issues)||!reconstruction||!Array.isArray(reconstruction.paths))fail('CLOSURE_INPUT','Pinned validated certification and reconstruction reports required');
 if(reconstruction.paths.some(x=>x.historicalPayloadAuthenticated!==false||x.currentLiveIdentityVerified!==false))fail('CLOSURE_ESCALATION','Source/synthetic transformation cannot self-promote to payload/live proof');
 const historical={verdict:'Partially attested, publication blocked',pathMembership:reconstruction.pathMembership,sourceAssociated:reconstruction.sourceAssociated,exactSourceTransformations:reconstruction.exactSourceTransformations,generatedHistoricalInputsRetained:reconstruction.generatedHistoricalInputsRetained,authenticatedPayloadFiles:0,limitation:'Reproduced source/seeds do not establish the exact historical Supabase responses or original artifact payload'};
 const current={verdict:'Unknown',exactPreviouslyObserved:reconstruction.exactObserved,observationDate,evaluationDate,completeCurrentObservation:false,limitation:'Prior public observations are individual historical HTTP bodies, not a fresh complete current-production inventory'};
 const blockers=[...certification.issues.map(x=>x.code),...(!browser?.browserAccepted?['BROWSER_ACCEPTANCE_INCOMPLETE']:[]),'GENERATED_HISTORICAL_RPC_INPUTS_UNAVAILABLE','CURRENT_PRODUCTION_BYTES_NOT_COMPLETELY_ATTESTED'];
 return {schemaVersion:1,kind:'atlas-certification-closure',baselineManifestSHA256:reconstruction.baselineManifestSHA256,historicalReconstruction:historical,currentProductionBaseline:current,dimensions:{historicalPathMembership:reconstruction.pathMembership===423?'log-verified':'unknown',historicalSourceAssociation:reconstruction.sourceAssociated,generatedOutputAuthenticity:'repository-seed reproduction only; historical RPC response missing',currentProductionIdentity:'unknown',staticReferenceClosure:certification.properties.referenceCompleteness,versionCompatibility:certification.properties.versionConsistency,runtimeCompatibility:browser?.browserAccepted?'browser-receipt-validated; witness still required':'pending',operationsOwnerDisposition:certification.properties.ownerContentDisposition,rollbackReadiness:'exact local-candidate rollback only',ownerPublicationAuthorisation:'not-granted'},blockers:[...new Set(blockers)].sort(),technicalCertification:certification.technicalStatus,deployable:false,publicationAuthorised:false,recommendation:'Separately authorise a reviewed baseline-adoption decision if historical RPC/payload evidence is irrecoverable; do not relabel reconstructed bytes as historical or current-live proof'};
}
