import path from 'node:path';
import {readRegular,LIMITS,fail} from './core.mjs';
export function textUTF8(b){try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);}catch{fail('INVALID_UTF8','Text file is not UTF-8');}}
const entity=s=>s.replace(/&(?:amp|quot|apos|lt|gt);|&#(?:x[0-9a-f]+|\d+);/gi,x=>{const named={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};if(named[x.toLowerCase()])return named[x.toLowerCase()];const v=x[2].toLowerCase()==='x'?parseInt(x.slice(3,-1),16):Number(x.slice(2,-1));return v>0&&v<=0x10ffff?String.fromCodePoint(v):'\ufffd';});
// Conservative HTML tokeniser, not a browser or full HTML5 tree constructor.
export function htmlTokens(s){
 const out=[];let i=0;
 while(i<s.length){
  const start=s.indexOf('<',i);if(start<0)break;
  if(s.startsWith('<!--',start)){const end=s.indexOf('-->',start+4);if(end<0)fail('HTML_SYNTAX','Unclosed comment');i=end+3;continue;}
  let j=start+1,q=null;for(;j<s.length;j++){const c=s[j];if(q){if(c===q)q=null;}else if(c==='"'||c==="'")q=c;else if(c==='>')break;}
  if(j===s.length)fail('HTML_SYNTAX','Unclosed HTML tag');
  const raw=s.slice(start,j+1);i=j+1;if(/^<!|^<\?/.test(raw))continue;
  const m=raw.match(/^<\s*(\/?)\s*([a-z][a-z0-9:-]*)/i);if(!m)continue;
  const name=m[2].toLowerCase(),closing=!!m[1],attrs={};
  if(!closing){
   let rest=raw.slice(m[0].length,-1);if(rest.endsWith('/'))rest=rest.slice(0,-1);
   while(rest.trim()){
    const a=rest.match(/^\s*([^\s=<>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/);
    if(!a)fail('HTML_SYNTAX','Malformed attribute');const k=a[1].toLowerCase();if(Object.hasOwn(attrs,k))fail('HTML_SYNTAX','Duplicate HTML attribute');attrs[k]=entity(a[2]??a[3]??a[4]??'');rest=rest.slice(a[0].length);
   }
  }
  const token={name,closing,attrs,start,end:i,raw};out.push(token);
  if(!closing&&['script','style','textarea','title'].includes(name)){
   const re=new RegExp('</'+name+'\\s*>','ig');re.lastIndex=i;const end=re.exec(s);if(!end)fail('HTML_SYNTAX','Unclosed raw-text element');token.content=s.slice(i,end.index);out.push({name,closing:true,attrs:{},start:end.index,end:re.lastIndex,raw:end[0]});i=re.lastIndex;
  }
 }
 return out;
}
function srcset(value,issue){
 if(/^(?:data:)|[{}$]/.test(value)){issue('UNRESOLVED_DYNAMIC','Unsupported/dynamic srcset','warning');return [];}
 const candidates=value.split(',').map(x=>x.trim());if(candidates.some(x=>!x)){issue('INVALID_SRCSET','Empty srcset candidate');return [];}
 const refs=[],descriptors=new Set();let kind=null;
 for(const c of candidates){const p=c.split(/\s+/);if(p.length>2){issue('INVALID_SRCSET','Too many descriptors');continue;}
  const d=p[1]||'1x';let k;if(/^[1-9]\d*w$/.test(d))k='w';else if(/^(?:\d+(?:\.\d+)?|\.\d+)x$/.test(d)&&Number(d.slice(0,-1))>0)k='x';else{issue('INVALID_SRCSET','Invalid srcset descriptor');continue;}
  const normalized=k+Number(d.slice(0,-1));if(descriptors.has(normalized)||kind&&kind!==k){issue('INVALID_SRCSET','Duplicate or mixed srcset descriptors');continue;}descriptors.add(normalized);kind=k;refs.push(p[0]);
 }
 return refs;
}
function cssRefs(s,issue){
 const clean=s.replace(/\/\*[\s\S]*?\*\//g,'');const refs=[];
 for(const m of clean.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)/gi))refs.push(m[1]??m[2]??m[3]);
 for(const m of clean.matchAll(/@import\s+(?:"([^"]+)"|'([^']+)')/gi))refs.push(m[1]??m[2]);
 if(/url\([^)]*(?:var\(|\$\{|\\)/i.test(clean))issue('UNRESOLVED_DYNAMIC','CSS URL uses dynamic/escaped syntax','warning');
 return refs;
}
export async function checkReferences(root,files){
 const names=new Set(files.map(f=>f.path)),errors=[],warnings=[],external=[],references=[];
 function resolve(from,value){
  const ref=value.trim();if(!ref||ref.startsWith('#'))return;
  if(/[{}]|\$\{|<%|\[\[/.test(ref)){warnings.push({code:'UNRESOLVED_DYNAMIC',file:from,reference:ref});return;}
  if(/^javascript:/i.test(ref)){errors.push({code:'UNSAFE_REFERENCE',file:from,reference:ref});return;}
  if(/^[a-z][a-z0-9+.-]*:/i.test(ref)||ref.startsWith('//')){external.push({file:from,reference:ref});return;}
  let clean;try{clean=decodeURIComponent(ref.split(/[?#]/,1)[0]);}catch{errors.push({code:'INVALID_URL_ENCODING',file:from,reference:ref});return;}
  if(!clean)return;
  if(/[\\\u0000-\u001f\u007f]/.test(clean)){errors.push({code:'UNSAFE_REFERENCE',file:from,reference:ref});return;}
  const stack=clean.startsWith('/')?[]:path.posix.dirname(from).split('/').filter(x=>x!=='.');
  for(const part of clean.split('/')){if(!part||part==='.')continue;if(part==='..'){if(!stack.length){errors.push({code:'REFERENCE_ESCAPE',file:from,reference:ref});return;}stack.pop();}else stack.push(part);}
  let target=stack.join('/');if(clean.endsWith('/')||!target)target=(target?target+'/':'')+'index.html';
  if(!names.has(target)&&names.has(target+'/index.html'))target+='/index.html';
  const item={file:from,reference:ref,target};references.push(item);if(!names.has(target))errors.push({code:'BROKEN_REFERENCE',...item});
 }
 for(const f of files){
  if(!/\.(?:html?|css|m?js)$/i.test(f.path))continue;
  const s=textUTF8(await readRegular(path.join(root,...f.path.split('/')),LIMITS.textBytes));const issue=(code,message,severity='error')=>(severity==='warning'?warnings:errors).push({code,file:f.path,message});
  if(/\.html?$/i.test(f.path)){
   let tokens;try{tokens=htmlTokens(s);}catch(e){issue(e.code||'HTML_SYNTAX',e.message);continue;}
   for(const t of tokens){if(t.closing)continue;
    if(t.name==='base'){issue('UNSUPPORTED_BASE','HTML base URL is unsupported; cannot prove reference resolution');continue;}
    for(const k of ['src','href','poster','action','data'])if(Object.hasOwn(t.attrs,k))resolve(f.path,t.attrs[k]);
    if(t.attrs.srcset)for(const v of srcset(t.attrs.srcset,issue))resolve(f.path,v);
    if(t.attrs.style)for(const v of cssRefs(t.attrs.style,issue))resolve(f.path,v);
    if(t.name==='style')for(const v of cssRefs(t.content||'',issue))resolve(f.path,v);
    if(t.name==='script'&&t.content?.trim()&&!/^(?:application\/ld\+json|application\/json)$/i.test(t.attrs.type||''))issue('UNRESOLVED_SCRIPT','Inline script/runtime URL construction not statically proven','warning');
    if(t.name==='meta'&&t.attrs['http-equiv']?.toLowerCase()==='refresh')issue('UNRESOLVED_REDIRECT','Meta refresh requires separate review','warning');
   }
  }else if(f.path.endsWith('.css'))for(const v of cssRefs(s,issue))resolve(f.path,v);
  else{
   for(const m of s.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g))if(m[1].startsWith('.')||m[1].startsWith('/'))resolve(f.path,m[1]);else external.push({file:f.path,reference:m[1]});
   warnings.push({code:'RUNTIME_JS_UNPROVEN',file:f.path,message:'Static imports inspected; runtime network/DOM/computed URLs are not proved.'});
  }
 }
 return {errors,warnings,external,references,coverage:'partial-static-only',limitations:['Not a full HTML5/CSS/JS interpreter or browser.','External/absolute-scheme URLs, fragments, runtime URL construction, fetched JSON and service workers are not verified.','No external URL is fetched; matching manifest does not prove production completeness.']};
}
