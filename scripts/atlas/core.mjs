// Atlas build-time tools. Standard library only. No network, archive extraction or deployment.
import * as fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const VERSION=1;
export const LIMITS=Object.freeze({files:20000,fileBytes:32*1024*1024,totalBytes:512*1024*1024,textBytes:4*1024*1024,jsonBytes:8*1024*1024,depth:40});
export class AtlasError extends Error {constructor(code,message){super(message);this.code=code;}}
export const fail=(code,message)=>{throw new AtlasError(code,message);};
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const isHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x,2)+'\n';
export const order=(a,b)=>a<b?-1:a>b?1:0;
export function record(v,keys,label){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))fail('INVALID_CONTRACT','Unexpected object fields: '+label);
 return v;
}
export function pathsUnique(values,label){
 if(!Array.isArray(values))fail('INVALID_PATHS',label+' must be an array');
 const seen=new Set();
 for(const v of values){portablePath(v);const key=v.toLowerCase();if(seen.has(key))fail('PATH_COLLISION',label+': '+v);seen.add(key);}
 return values;
}
export function portablePath(v){
 if(typeof v!=='string'||!v||v.length>240||v.includes('\\')||v.startsWith('/')||v.includes('%')||!/^[\x21-\x7e]+$/.test(v))fail('UNSAFE_PATH','Invalid portable relative path');
 const parts=v.split('/');
 for(const p of parts){
  if(!p||p==='.'||p==='..'||p.length>100||/[ .]$/.test(p)||!(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p)||p==='.nojekyll'||p==='.well-known')||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))fail('UNSAFE_PATH','Unsafe path segment: '+p);
 }
 return v;
}
export function mime(p){return ({'.html':'text/html','.htm':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain','.xml':'application/xml','.pdf':'application/pdf','.wasm':'application/wasm'})[path.posix.extname(p).toLowerCase()]||'application/octet-stream';}
// JSON.parse itself cannot detect duplicate object keys. Validate syntax, then walk tokens.
export function parseJSON(raw){
 if(raw.length>LIMITS.jsonBytes)fail('JSON_LIMIT','JSON exceeds limit');
 let s;try{s=new TextDecoder('utf-8',{fatal:true}).decode(raw);}catch{fail('INVALID_UTF8','Invalid JSON encoding');}
 let result;try{result=JSON.parse(s);}catch{fail('INVALID_JSON','Malformed JSON');}
 let i=0;const ws=()=>{while(/\s/.test(s[i]||'')&&i<s.length)i++;};
 const str=()=>{const start=i++;while(i<s.length){if(s[i++]==='"')return JSON.parse(s.slice(start,i));if(s[i-1]==='\\')i++;}fail('INVALID_JSON','Unterminated string');};
 function value(depth=0){
  if(depth>64)fail('JSON_LIMIT','JSON too deep');ws();
  if(s[i]==='{'){i++;ws();const keys=new Set();if(s[i]==='}'){i++;return;}while(true){const key=str();if(keys.has(key))fail('DUPLICATE_JSON_KEY','Duplicate JSON key');keys.add(key);ws();i++;value(depth+1);ws();if(s[i++]==='}')break;ws();}return;}
  if(s[i]==='['){i++;ws();if(s[i]===']'){i++;return;}while(true){value(depth+1);ws();const delimiter=s[i++];if(delimiter===']')break;}return;}
  if(s[i]==='"'){str();return;}
  const m=s.slice(i).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/);if(!m)fail('INVALID_JSON','Invalid value');i+=m[0].length;
 }
 value();return result;
}
export async function safeRoot(root){
 const abs=path.resolve(root);let cur=path.parse(abs).root;
 for(const segment of abs.slice(cur.length).split(path.sep).filter(Boolean)){cur=path.join(cur,segment);const st=await fs.lstat(cur);if(st.isSymbolicLink()||!st.isDirectory())fail('UNSAFE_ROOT','Root/ancestor must be a real directory');}
 return abs;
}
const signature=st=>[st.dev,st.ino,st.size,st.mtimeNs,st.ctimeNs].join(':');
export async function readRegular(file,max=LIMITS.fileBytes){
 const before=await fs.lstat(file,{bigint:true});
 if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1n)fail('UNSAFE_FILE','Not a single-link regular file');
 if(before.size>BigInt(max))fail('SIZE_LIMIT','File exceeds size budget');
 const h=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const opened=await h.stat({bigint:true});if(signature(before)!==signature(opened))fail('FILE_CHANGED','File changed before read');
  const chunks=[];let length=0;while(true){const part=Buffer.alloc(Math.min(65536,max+1-length));const {bytesRead}=await h.read(part,0,part.length,null);if(!bytesRead)break;length+=bytesRead;if(length>max)fail('SIZE_LIMIT','File grew beyond read budget');chunks.push(part.subarray(0,bytesRead));}const b=Buffer.concat(chunks,length);const after=await h.stat({bigint:true});const named=await fs.lstat(file,{bigint:true});
  if(signature(opened)!==signature(after)||signature(after)!==signature(named)||BigInt(b.length)!==after.size)fail('FILE_CHANGED','File changed while reading');
  return b;
 }finally{await h.close();}
}
export async function loadJSON(file,expectedHash){
 await safeRoot(path.dirname(path.resolve(file)));const bytes=await readRegular(file,LIMITS.jsonBytes);
 if(expectedHash!==undefined&&(!isHash(expectedHash)||sha256(bytes)!==expectedHash))fail('INPUT_DIGEST_MISMATCH','JSON input does not match supplied SHA-256');
 return {value:parseJSON(bytes),sha256:sha256(bytes)};
}
export async function inventory(root,{protectedPaths=[],manifestPaths=[]}={}){
 const abs=await safeRoot(root),files=[],seen=new Set(),dirs=[];let total=0;
 const protectedSet=new Set(protectedPaths),listed=new Set(manifestPaths);let nodes=0;
 async function walk(dir,rel='',depth=0){
  if(depth>LIMITS.depth)fail('DEPTH_LIMIT','Directory nesting too deep');
  const st=await fs.lstat(dir,{bigint:true});if(!st.isDirectory()||st.isSymbolicLink())fail('UNSAFE_DIRECTORY','Not a real directory');
  dirs.push({dir,signature:signature(st)});
  const entries=await fs.readdir(dir,{encoding:'buffer'});const decoded=[];
  for(const n of entries){let name;try{name=new TextDecoder('utf-8',{fatal:true}).decode(n);}catch{fail('INVALID_UTF8','Invalid filename encoding');}decoded.push(name);}
  for(const name of decoded.sort(order)){if(++nodes>LIMITS.files*2)fail('SNAPSHOT_LIMIT','Too many file/directory entries');
   const p=rel?rel+'/'+name:name;portablePath(p);const key=p.toLowerCase();if(seen.has(key))fail('PATH_COLLISION','Case-insensitive path collision: '+p);seen.add(key);
   const full=path.join(dir,name),s=await fs.lstat(full);
   if(s.isSymbolicLink())fail('SYMLINK','Symbolic links are forbidden');
   if(s.isDirectory()){await walk(full,p,depth+1);continue;}
   if(!s.isFile())fail('SPECIAL_FILE','Special files are forbidden');
   const b=await readRegular(full);total+=b.length;
   if(files.length>=LIMITS.files||total>LIMITS.totalBytes)fail('SNAPSHOT_LIMIT','Snapshot exceeds resource budget');
   files.push({path:p,size:b.length,sha256:sha256(b),contentType:mime(p),extension:path.posix.extname(p).toLowerCase(),protected:protectedSet.has(p),includedInManifest:listed.has(p)});
  }
 }
 await walk(abs);
 for(const d of dirs){const now=await fs.lstat(d.dir,{bigint:true});if(signature(now)!==d.signature)fail('DIRECTORY_CHANGED','Directory changed during inventory: '+path.relative(abs,d.dir));}
 return {schemaVersion:VERSION,files:files.sort((a,b)=>order(a.path,b.path)),totalBytes:total};
}
export function manifestContract(m){
 record(m,['schemaVersion','kind','provenance','files','protectedPaths','criticalRoutes','criticalAssets'],'manifest');
 if(m.schemaVersion!==1||m.kind!=='atlas-static-snapshot'||!Array.isArray(m.files)||m.files.length<1||m.files.length>LIMITS.files)fail('INVALID_MANIFEST','Manifest version/kind/files invalid');
 record(m.provenance,['type','description'],'provenance');if(!['synthetic','supplied-artifact','public-reconstruction'].includes(m.provenance.type)||typeof m.provenance.description!=='string'||!m.provenance.description||m.provenance.description.length>2000)fail('INVALID_MANIFEST','Invalid provenance');
 for(const f of m.files)record(f,['path','size','sha256','contentType'],'manifest file');pathsUnique(m.files.map(f=>f.path),'manifest files');let total=0;
 for(const f of m.files){record(f,['path','size','sha256','contentType'],'manifest file');if(!Number.isSafeInteger(f.size)||f.size<0||f.size>LIMITS.fileBytes||!isHash(f.sha256)||f.contentType!==mime(f.path))fail('INVALID_MANIFEST','Invalid size/hash/content type');total+=f.size;}
 if(total>LIMITS.totalBytes)fail('SNAPSHOT_LIMIT','Manifest total too large');
 const set=new Set(m.files.map(f=>f.path));
 for(const k of ['protectedPaths','criticalRoutes','criticalAssets']){pathsUnique(m[k],k);for(const p of m[k])if(!set.has(p))fail('INVALID_MANIFEST','Declared required path missing from manifest: '+p);}
 if(!m.criticalRoutes.length)fail('INVALID_MANIFEST','At least one critical route file required');
 for(const p of m.criticalRoutes)if(!/\.html?$/i.test(p))fail('INVALID_MANIFEST','Critical route must be an HTML file');
 return m;
}
export async function makeManifest(root,{criticalRoutes=['index.html'],criticalAssets=[],provenance={type:'synthetic',description:'Locally inventoried; production completeness not attested'}}={}){
 const inv=await inventory(root);const m={schemaVersion:1,kind:'atlas-static-snapshot',provenance,files:inv.files.map(({path,size,sha256,contentType})=>({path,size,sha256,contentType})),protectedPaths:inv.files.map(f=>f.path),criticalRoutes,criticalAssets};return manifestContract(m);
}
export function sameFiles(a,b){const triples=x=>x.files.map(({path,size,sha256})=>({path,size,sha256})).sort((u,v)=>order(u.path,v.path));return stable(triples(a))===stable(triples(b));}
