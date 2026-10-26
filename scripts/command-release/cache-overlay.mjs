// Offline source-only compilation. Reuse the installed publisher's exact cache
// rule without regenerating catalogue/CMS or rewriting unrelated website files.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,dirname,extname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {stampSource} from '../stamp-static-assets.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sorted(value[k])])):value;
export const canonical=value=>JSON.stringify(sorted(value));
const require=(ok,message)=>{if(!ok)throw Error(message);};
const shared=new Set(['admin/admin-auth.mjs','admin/admin-gate.mjs','admin/application.mjs']);
export async function cacheOverlay({root,manifest,out,baseRead=path=>execFileSync('git',['show',manifest.baseSourceCommit+':dist/'+path],{cwd:root})}={}){
 require(manifest.kind==='COMMAND_READONLY_SOURCE_OVERLAY_V1'&&manifest.entries?.length===21,'Reviewed source manifest required.');
 for(const key of ['sourceCommit','baseSourceCommit'])require(/^[a-f0-9]{40}$/.test(manifest[key]),'Exact source identity required.');
 require(new Set(manifest.entries.map(e=>e.path)).size===21,'Duplicate source path.');
 const rawManifestSHA256=sha(canonical(manifest)),entries=[],provenance=[];
 const compiled=[];
 for(const entry of manifest.entries){
  const path=entry.path;require(!path.includes('..')&&!path.includes('\\')&&(shared.has(path)||path.startsWith('admin/command/'))&&/\.(mjs|html|css)$/.test(path),'Unreviewed source path.');
  const raw=await readFile(join(root,'dist',path));require(raw.length===entry.bytes&&sha(raw)===entry.afterSHA256,'Accepted source drift: '+path);
  const data=Buffer.from(stampSource(raw.toString('utf8'),extname(path).slice(1),manifest.sourceCommit));
  let before=null;
  if(entry.beforeSHA256!==null){require(shared.has(path),'Only reviewed shared preimages may exist.');const base=baseRead(path);require(sha(base)===entry.beforeSHA256,'Base source drift: '+path);before=sha(stampSource(base.toString('utf8'),extname(path).slice(1),manifest.baseSourceCommit));}
  entries.push({path,beforeSHA256:before,afterSHA256:sha(data),bytes:data.length});provenance.push({path,rawSourceSHA256:sha(raw)});compiled.push({path,data});
 }
 const stamper=await readFile(join(root,'scripts/stamp-static-assets.mjs'));
 const result={kind:manifest.kind,sourceCommit:manifest.sourceCommit,baseSourceCommit:manifest.baseSourceCommit,entries,sourceProvenance:provenance,cacheIdentity:{candidateRevision:manifest.sourceCommit,baseRevision:manifest.baseSourceCommit,stamperSourceSHA256:sha(stamper),rawManifestSHA256}};
 await mkdir(out,{mode:0o700});
 for(const {path,data} of compiled){const target=join(out,'dist',path);await mkdir(dirname(target),{recursive:true,mode:0o700});await writeFile(target,data,{flag:'wx',mode:0o600});}
 await writeFile(join(out,'source-manifest.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 return {manifest:result,manifestSHA256:sha(canonical(result)),compiledFiles:compiled.length,realArchiveReads:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [root,manifestPath,out]=process.argv.slice(2);require(root&&manifestPath&&out,'Usage: node cache-overlay.mjs <source-root> <raw-source-manifest.json> <new-output-directory>');
 const result=await cacheOverlay({root:resolve(root),manifest:JSON.parse(await readFile(manifestPath,'utf8')),out:resolve(out)});
 console.log(JSON.stringify({compiledFiles:result.compiledFiles,manifestSHA256:result.manifestSHA256,realArchiveReads:0}));
}
