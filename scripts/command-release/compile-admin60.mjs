// Offline, reviewed frontend overlay. The served baseline supplies every unrelated byte.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,dirname,extname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {stampSource} from '../stamp-static-assets.mjs';
const unifiedCore=['admin/application.mjs','admin/application.css','admin/admin-gate.mjs','admin/overview.mjs','admin/command/index.html','admin/command-redirect.mjs'];
const phases={A:['admin/application.css','admin/overview.mjs'],B:['admin/application.css','admin/admin.mjs']};
const sha=b=>createHash('sha256').update(b).digest('hex');
const require=(v,m)=>{if(!v)throw Error(m);};
async function tree(root){const files=new Map();async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);require(!e.isSymbolicLink(),'Links refused');if(e.isDirectory())await walk(p);else{require(e.isFile(),'Special file refused');files.set(p.slice(root.length+1).replaceAll('\\','/'),await readFile(p));}}}await walk(root);return files;}
function replaceReferences(raw,path,targets,revision){let source=raw.toString('utf8');const replacements=[];
 function url(u){if(!/^(?:\.{1,2}\/|\/(?!\/))/.test(u)||!u.split('?')[0].match(/\.(?:mjs|js|css)$/))return u;const parsed=new URL(u,'https://fixture.invalid/'+path);if(!targets.has(parsed.pathname.slice(1)))return u;const [p,q='']=u.split('?');const params=new URLSearchParams(q);params.set('build',revision);const after=p+'?'+params.toString();if(after!==u&&!replacements.some(r=>r.before===u))replacements.push({before:u,after,count:source.split(u).length-1});return after;}
 const kind=extname(path);let after=source;
 if(kind==='.html')after=source.replace(/((?:src|href|data-admin-entry)=["'])([^"']+)(["'])/g,(_,a,u,z)=>a+(a.includes('data-admin-entry')?u.split(',').map(v=>url(v.trim())).join(','):url(u))+z);
 if(kind==='.mjs'||kind==='.js')after=source.replace(/(\b(?:from|import)\s*\(?\s*["']|\bnew\s+URL\(\s*["'])([^"']+)(["'])/g,(_,a,u,z)=>a+url(u)+z);
 return {data:Buffer.from(after),replacements};
}
const [baselineArg,source,outArg,phase,dependencyRevision]=process.argv.slice(2);require(/^[a-f0-9]{40}$/.test(source),'Immutable source required');require(!phase||Object.hasOwn(phases,phase),'Unknown Admin phase');const core=phase?phases[phase]:unifiedCore,legacy=phase?dependencyRevision:'2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f';require(/^[a-f0-9]{40}$/.test(legacy),'Canonical dependency revision required');const namespace=phase?'command61-'+phase:'command60';const baseline=resolve(baselineArg),out=resolve(outArg),base=await tree(baseline),files=new Map(base),affected=new Set(core),entries=[];
for(const path of core){const raw=execFileSync('git',['show',source+':dist/'+path]);require(raw.equals(await readFile('dist/'+path)),'Unverified source changes: '+path);const kind=extname(path).slice(1),stamped=Buffer.from(stampSource(raw.toString(),kind,legacy));const {data}=replaceReferences(stamped,path,affected,source);files.set(path,data);entries.push({path,beforeSHA256:base.has(path)?sha(base.get(path)):null,afterSHA256:sha(data),bytes:data.length,rawSourceSHA256:sha(raw)});}
let grew=true;while(grew){grew=false;for(const [path,raw]of base){if(core.includes(path)||!(path.startsWith('admin/')||path==='commercial/admin.mjs')||!path.match(/\.(?:html|mjs|js)$/))continue;const {data}=replaceReferences(raw,path,affected,source);if(!data.equals(raw)){files.set(path,data);if(!affected.has(path)){affected.add(path);grew=true;}}}}
const changes=entries.map(e=>({path:e.path,operation:'compiled-admin',source:'release-overlays/'+namespace+'/'+e.path,beforeSHA256:e.beforeSHA256,afterSHA256:e.afterSHA256,bytes:e.bytes}));
for(const [path,raw]of base){if(core.includes(path)||!affected.has(path))continue;const {data,replacements}=replaceReferences(raw,path,affected,source);require(data.equals(files.get(path)),'Unstable dependency closure');changes.push({path,operation:'replace',beforeSHA256:sha(raw),afterSHA256:sha(data),bytes:data.length,replacements});}
await mkdir(out,{recursive:true,mode:0o700});for(const [path,data]of files){const p=join(out,'candidate',path);await mkdir(dirname(p),{recursive:true});await writeFile(p,data);}
for(const e of entries){const p=join('release-overlays',namespace,e.path);await mkdir(dirname(p),{recursive:true});await writeFile(p,files.get(e.path));}
const manifest={kind:phase?'COMMAND_ASCENDANCE_V1':'COMMAND_UNIFIED_ADMIN_V1',...(phase?{phase}:{}),sourceCommit:source,baseSourceCommit:phase?legacy:'bc5eeef3f998c439b7cb88daeb8d6d1ecd5dd7b0',unchangedRepositoryRevision:legacy,entries};const manifestPath=phase?'docs/command/command61/source-manifest-'+phase+'.json':'docs/command/command60/source-manifest.json';await mkdir(dirname(manifestPath),{recursive:true});await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');await writeFile(join(out,'changes.json'),JSON.stringify(changes,null,2)+'\n');console.log(JSON.stringify({coreFiles:core.length,cacheReferenceFiles:changes.length-core.length,changedFiles:changes.length,candidateFiles:files.size,source,phase:phase||'COMMAND60'}));
