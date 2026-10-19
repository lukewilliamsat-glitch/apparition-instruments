// Merge only pinned local evidence. Observed live bytes win; historical fills are explicit.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fail,record,isHash,pathsUnique,loadJSON,stable,sha256,readRegular,safeRoot,makeManifest} from './core.mjs';
import {validateSnapshot} from './validate-snapshot.mjs';
export async function reconstructCandidate({sources,excludedPaths=[],output}){
 if(!Array.isArray(sources)||!sources.length||sources.length>8)fail('RECONSTRUCTION_SOURCES','One to eight explicit pinned sources required');pathsUnique(excludedPaths,'explicit exclusions');
 const dest=path.resolve(output);for(const s of sources){const root=path.resolve(s.root);if(dest===root||dest.startsWith(root+path.sep)||root.startsWith(dest+path.sep))fail('RECONSTRUCTION_OVERLAP','Input roots and output must be disjoint');}
 const selected=new Map(),conflicts=[],sourcePins=[];
 for(const source of sources){
  record(source,['root','manifestFile','manifestSHA256','sourceType','sourceId','revision'],'reconstruction source');
  if(!isHash(source.manifestSHA256)||!['publicly-observed-live-bytes','verified-historical-repository-object','verified-deployed-artifact'].includes(source.sourceType)||typeof source.sourceId!=='string'||!source.sourceId||typeof source.revision!=='string'||!source.revision)fail('RECONSTRUCTION_SOURCE','Source pin/provenance missing');
  const m=(await loadJSON(source.manifestFile,source.manifestSHA256)).value,v=await validateSnapshot(source.root,m);
  if(v.errors.some(e=>e.code!=='BROKEN_REFERENCE'))fail('RECONSTRUCTION_INTEGRITY','Source byte/path integrity failed');
  sourcePins.push({manifestSHA256:source.manifestSHA256,sourceType:source.sourceType,sourceId:source.sourceId,revision:source.revision});
  for(const f of m.files){
   if(excludedPaths.includes(f.path))continue;
   const old=selected.get(f.path),item={file:f,root:source.root,sourceType:source.sourceType,sourceId:source.sourceId+'/'+f.path,revision:source.revision};
   if(!old){selected.set(f.path,item);continue;}if(old.file.sha256===f.sha256)continue;
   conflicts.push({path:f.path,firstSHA256:old.file.sha256,laterSHA256:f.sha256,firstRevision:old.revision,laterRevision:source.revision});
   if(old.sourceType==='publicly-observed-live-bytes'&&source.sourceType==='verified-historical-repository-object')continue;
   if(old.sourceType==='verified-historical-repository-object'&&source.sourceType==='publicly-observed-live-bytes'){selected.set(f.path,item);continue;}
   fail('RECONSTRUCTION_CONFLICT','Conflicting equally authoritative versions require explicit review');
  }
 }
 pathsUnique([...selected.keys()],'reconstructed union');await safeRoot(path.dirname(path.resolve(output)));await fs.mkdir(output,{mode:0o700});const site=path.join(output,'site');await fs.mkdir(site);
 const provenance={schemaVersion:1,kind:'atlas-recovery-provenance',files:[]};
 for(const [name,item] of [...selected].sort(([a],[b])=>a.localeCompare(b))){const b=await readRegular(path.join(item.root,name));if(sha256(b)!==item.file.sha256||b.length!==item.file.size)fail('RECONSTRUCTION_CHANGED','Source changed before copy');const dest=path.join(site,name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b,{flag:'wx',mode:0o444});provenance.files.push({path:name,sha256:item.file.sha256,sourceType:item.sourceType,sourceId:item.sourceId,revision:item.revision});}
 const manifest=await makeManifest(site,{provenance:{type:'public-reconstruction',description:'Mixed pinned historical repository and publicly observed evidence; version compatibility and production completeness unverified'}});
 const validation=await validateSnapshot(site,manifest);
 for(const source of sources){const m=(await loadJSON(source.manifestFile,source.manifestSHA256)).value;const after=await validateSnapshot(source.root,m);if(after.errors.some(e=>e.code!=='BROKEN_REFERENCE'))fail('RECONSTRUCTION_CHANGED','Pinned source changed during reconstruction');}
 const result={schemaVersion:1,classification:'reconstructed-candidate-requiring-approval',deployable:false,productionComplete:false,versionCompatibility:'unverified',files:manifest.files.length,totalBytes:manifest.files.reduce((n,f)=>n+f.size,0),sourcePins,excludedPaths,conflicts,manifestSHA256:sha256(stable(manifest)),provenanceSHA256:sha256(stable(provenance)),referenceErrors:validation.errors.length,liveObservedFiles:provenance.files.filter(f=>f.sourceType==='publicly-observed-live-bytes').length,historicalFiles:provenance.files.filter(f=>f.sourceType==='verified-historical-repository-object').length};
 for(const [name,value] of [['manifest.json',manifest],['provenance.json',provenance],['validation.json',validation],['RESULT.json',result]])await fs.writeFile(path.join(output,name),stable(value),{flag:'wx',mode:0o444});return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [input,pin,output]=process.argv.slice(2);if(!isHash(pin))fail('RECONSTRUCTION_PIN','Pinned input required');const p=(await loadJSON(input,pin)).value;record(p,['sources','excludedPaths'],'reconstruction plan');process.stdout.write(stable(await reconstructCandidate({...p,output})));}
 catch(e){process.stdout.write(stable({classification:'invalid-evidence',deployable:false,errorCode:e.code||'RECONSTRUCTION_IO'}));process.exitCode=1;}
}
