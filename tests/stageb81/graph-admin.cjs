const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const site='https://apparitioninstruments.co.uk';
const names=process.argv.slice(3);
const all=[];
const getFiles=d=>fs.readdirSync(d,{recursive:true,withFileTypes:true}).filter(f=>f.isFile()).map(f=>path.relative(d,path.join(f.parentPath||f.path,f.name)).replaceAll(path.sep,'/')).sort();
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const stateful=/(?:\/admin\/(?:admin-auth|component-repository|assembly-repository|application)\.mjs|\/backend\/(?:providers|order-data|operations-admin|catalogue-options|email-templates|public-read)\.mjs)$/;
const dynamicImports=raw=>[...raw.matchAll(/\bimport\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g)].map(m=>m[2]);
const htmlModules=raw=>[...raw.matchAll(/<script\b[^>]*>/gi)].flatMap(([tag])=>[...tag.matchAll(/\b(src|data-admin-entry)\s*=\s*(['"])([^'"]+)\2/g)].flatMap(([,kind,,value])=>kind==='data-admin-entry'?value.split(',').map(x=>x.trim()):/\.m?js(?:[?#]|$)/.test(value)?[value]:[]));
async function audit(name){
 const root=path.resolve(process.argv[2],name),files=getFiles(root),index=new Set(files);
 const bodies=new Map(),badSyntax=[],allEdges=new Set(),parseMap=new Map(),assetRefs=[];
 for(const fn of files)if(/\.(?:m?js)$/.test(fn)){
  const raw=fs.readFileSync(path.join(root,fn),'utf8');bodies.set(fn,raw);
  try {
   let mod;
   if(fn.endsWith('.mjs')||/(^|[;\n])\s*(?:export|import)(?!\s*\()\b/m.test(raw)){mod=new vm.SourceTextModule(raw,{identifier:fn});}
   else {try{new vm.Script(raw,{filename:fn});}catch{mod=new vm.SourceTextModule(raw,{identifier:fn});}}
   parseMap.set(fn,mod?.dependencySpecifiers??mod?.moduleRequests?.map(x=>x.specifier)??[]);
  } catch(e){badSyntax.push({file:fn,message:e.message});}
 }
 const routes=files.filter(f=>f.endsWith('.html')&&(f.startsWith('admin/')||f.startsWith('circuit-forge/')||f.startsWith('forge-pro/')));
 const records=[];
 for(const fn of routes){
  const entry=new URL('/'+fn,site);
  const refs=htmlModules(fs.readFileSync(path.join(root,fn),'utf8'));
  const pending=refs.map(r=>[r,entry.href]),nodes=new Map(),edges=[],missing=[],external=[],linkErrors=[];
  const ctx=vm.createContext({}),instances=new Map();
  function resolve(ref,parent) {
   if(!/^([./]|https?:|\/\/)/.test(ref))return {external:ref};
   const u=new URL(ref,parent);
   if(u.origin!==site)return {external:u.href};
   return {id:u.href,path:decodeURIComponent(u.pathname).slice(1)};
  }
  for(let i=0;i<pending.length;i++){
   const [r,from]=pending[i],u=resolve(r,from);
   if(u.external){external.push({from:new URL(from).pathname,ref:u.external});continue;}
   edges.push([from,u.id]);allEdges.add(from+' -> '+u.id);
   if(!index.has(u.path)){missing.push({ref:r,from:new URL(from).pathname,file:u.path});continue;}
   if(nodes.has(u.id))continue;
   nodes.set(u.id,u.path);
   const raw=bodies.get(u.path);
   if(raw!==undefined)for(const dep of [...(parseMap.get(u.path)??[]),...dynamicImports(raw)])pending.push([dep,u.id]);
  }
  const link=(r,p)=>{const u=resolve(r,p.identifier);if(u.external||!bodies.has(u.path))throw Error('Unresolved local link: '+r+' from '+new URL(p.identifier).pathname);return get(u.id,u.path);};
  const get=(id,f)=>{if(!instances.has(id))instances.set(id,new vm.SourceTextModule(bodies.get(f),{identifier:id,context:ctx}));return instances.get(id);};
  for(const [id,f] of nodes)if(f.endsWith('.mjs')){
   try{const mod=get(id,f);if(mod.status==='unlinked')await mod.link(link);}
   catch(e){linkErrors.push({file:f,message:e.message});}
  }
  const byPath=new Map();
  for(const [id,f] of nodes){if(!byPath.has(f))byPath.set(f,[]);byPath.get(f).push(id.slice(site.length));}
  const aliases=[...byPath.entries()].filter(([,urls])=>urls.length>1).map(([f,urls])=>({file:f,urls,singleton:stateful.test('/'+f)}));
  const adj=new Map();for(const [a,b] of edges){if(!adj.has(a))adj.set(a,[]);adj.get(a).push(b);}
  const visiting=new Set(),visited=new Set(),cycles=[];
  const visit=(id,stack=[])=>{if(visiting.has(id)){cycles.push([...stack.slice(stack.indexOf(id)),id].map(s=>s.slice(site.length)));return;}if(visited.has(id))return;visiting.add(id);for(const dep of adj.get(id)??[])visit(dep,[...stack,id]);visiting.delete(id);visited.add(id);};
  visit(entry.href);
  records.push({entry:fn,roots:refs,nodes:[...nodes.keys()].map(s=>s.slice(site.length)),edges:edges.map(e=>e.map(x=>x.slice(site.length))),missing,external,linkErrors,aliases,cycles});
 }
 const publicRoutes=files.filter(f=>f.endsWith('/index.html')||f==='index.html').map(f=>'/'+f.replace(/index\.html$/,''));
 const assets=Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
 return {name,js:bodies.size,files:files.length,inventory:hash(JSON.stringify(assets)),assets,routes:records,edges:allEdges.size,badSyntax,publicRoutes};
}
(async()=>{
 for(const n of names)all.push(await audit(n));
 for(const r of all)console.log(JSON.stringify({name:r.name,files:r.files,js:r.js,entries:r.routes.length,edges:r.edges,syntax:r.badSyntax,missing:r.routes.flatMap(x=>x.missing),link:r.routes.flatMap(x=>x.linkErrors).map(x=>x.message).filter((v,i,a)=>a.indexOf(v)===i).slice(0,8),singletonAliases:r.routes.flatMap(x=>x.aliases.filter(a=>a.singleton).map(a=>[x.entry,a.file])),cycles:r.routes.reduce((n,x)=>n+x.cycles.length,0)}));
 fs.writeFileSync(path.join(process.argv[2],'graph-deepwatch.json'),JSON.stringify(all,null,2));
 const c=all.find(x=>x.name==='fixed');
 if(c&&(c.badSyntax.length||c.routes.some(r=>r.missing.length||r.linkErrors.length||r.aliases.some(a=>a.singleton))))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
