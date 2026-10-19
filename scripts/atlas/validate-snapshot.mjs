import {inventory,manifestContract,sameFiles,sha256,stable,makeManifest} from './core.mjs';
import {checkReferences} from './references.mjs';
export {makeManifest};
export async function validateSnapshot(root,manifest){
 manifestContract(manifest);
 const inv=await inventory(root,{protectedPaths:manifest.protectedPaths,manifestPaths:manifest.files.map(f=>f.path)}),expected=new Map(manifest.files.map(f=>[f.path,f])),actual=new Map(inv.files.map(f=>[f.path,f])),errors=[];
 for(const f of inv.files){const e=expected.get(f.path);if(!e){errors.push({code:'UNEXPECTED_FILE',path:f.path});continue;}if(f.sha256!==e.sha256)errors.push({code:'HASH_MISMATCH',path:f.path});if(f.size!==e.size)errors.push({code:'SIZE_MISMATCH',path:f.path});}
 for(const e of manifest.files)if(!actual.has(e.path))errors.push({code:'MISSING_FILE',path:e.path});
 for(const k of ['criticalRoutes','criticalAssets'])for(const p of manifest[k])if(!actual.has(p))errors.push({code:k==='criticalRoutes'?'MISSING_CRITICAL_ROUTE':'MISSING_CRITICAL_ASSET',path:p});
 const refs=await checkReferences(root,inv.files);errors.push(...refs.errors);
 const after=await inventory(root,{protectedPaths:manifest.protectedPaths,manifestPaths:manifest.files.map(f=>f.path)});if(!sameFiles(inv,after))errors.push({code:'SNAPSHOT_CHANGED',message:'Snapshot changed during validation'});
 const protectedFiles=manifest.protectedPaths.map(p=>({path:p,expectedSHA256:expected.get(p).sha256,actualSHA256:actual.get(p)?.sha256??null,preserved:actual.get(p)?.sha256===expected.get(p).sha256&&actual.get(p)?.size===expected.get(p).size}));
 return {schemaVersion:1,status:errors.length?'invalid':'valid',valid:errors.length===0,manifestConsistency:errors.some(e=>['MISSING_FILE','UNEXPECTED_FILE','HASH_MISMATCH','SIZE_MISMATCH'].includes(e.code))?'failed':'consistent',localSnapshotConsistency:errors.length?'failed':'consistent',productionCompleteness:'not-attested',manifestSHA256:sha256(stable(manifest)),inventory:inv,protectedFiles,errors,warnings:refs.warnings,referenceReport:refs,coverage:{expectedFiles:manifest.files.length,actualFiles:inv.files.length,criticalRoutes:manifest.criticalRoutes.length,criticalAssets:manifest.criticalAssets.length,protectedFiles:protectedFiles.length,referenceCoverage:refs.coverage,provenance:manifest.provenance,productionCompleteness:'Requires separately verified artifact/capture provenance and owner coverage acceptance; not established by this tool.'}};
}
