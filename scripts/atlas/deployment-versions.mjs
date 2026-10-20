import path from 'node:path';
import {readRegular,sha256} from './core.mjs';
export async function deploymentVersions({root,attestation}){
 const rows=[];
 for(const f of attestation.entries){
  let stamps=[];if(/\.(?:html?|m?js|css)$/.test(f.path)){const b=await readRegular(path.join(root,f.path));if(sha256(b)!==f.sha256)throw Error('Version input changed');const text=b.toString().replaceAll('&amp;','&');stamps=[...new Set([...text.matchAll(/[?&]build=([a-f0-9]{7,40})(?=[^a-f0-9]|$)/g)].map(x=>x[1]))].sort();}
  const incompatible=stamps.filter(x=>x!==attestation.sourceRevision);
  rows.push({path:f.path,sha256:f.sha256,sourceRevision:attestation.sourceRevision,stamps,classification:incompatible.length?'incompatible-build-stamp':f.observedSHA256&&f.observedSHA256!==f.sha256?'observed-content-mismatch':f.evidenceAuthoritative?'exact-public-version':f.source?.candidateMatchesCanonical?'source-derived-version-only':'generated-version-unresolved',independentByteProof:f.evidenceAuthoritative,artifactMember:f.deploymentPathAuthenticated,generatedInput:f.source?.mutationClass??'source-absent',incompatible});
 }
 return {schemaVersion:1,kind:'atlas-deployment-versions',baselineManifestSHA256:attestation.baselineManifestSHA256,sourceRevision:attestation.sourceRevision,rows,conflictingPaths:rows.filter(x=>x.incompatible.length||x.classification==='observed-content-mismatch').map(x=>x.path),coherentReconstruction:!rows.some(x=>x.incompatible.length||x.classification==='observed-content-mismatch'),authenticatedHistoricalDeployment:false,verifiedCurrentProductionBaseline:false,limitation:'A consistent build parameter and authenticated path membership do not authenticate unobserved generator output bytes.'};
}
