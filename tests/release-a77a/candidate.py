"""Produce one deterministic audit correction from the verified 77 candidate."""
import hashlib,json,re,shutil,sys,zipfile
from pathlib import Path
root=Path(sys.argv[1])
digest='27181e8e32c5014b356af88174a7c347d7f85a414bc80011699e098670b30c2f'
token='sentinel77a-c1'
oldtoken='sentinel77-b2'
def h(b):return hashlib.sha256(b).hexdigest()
def inv(d):return {str(p.relative_to(d)):h(p.read_bytes()) for p in sorted(d.rglob('*')) if p.is_file()}
approved=root/'release-a77-candidate.zip'
assert h(approved.read_bytes())==digest
src=root/'fixed';dst=root/'deep'
with zipfile.ZipFile(approved) as z:
 assert inv(src)=={n:h(z.read(n)) for n in z.namelist()}
assert not dst.exists()
shutil.copytree(src,dst)
for p in sorted(dst.rglob('*')):
 if p.suffix in {'.js','.mjs','.html'}:
  before=p.read_bytes()
  after=before.replace(('build='+oldtoken).encode(),('build='+token).encode())
  if before!=after:p.write_bytes(after)
gate=dst/'admin/admin-gate.mjs'
g=gate.read_text()
pairs=[
 (" let workspace=null;"," let workspace=null,workspaceStarted=false;"),
 ("if(result.status==='authorized')await reveal();else if(result.status==='denied')render('denied');","if(result.status==='authorized'){if(workspaceStarted)document.defaultView.location.reload();else await reveal();}else if(result.status==='denied')render('denied');"),
 (" const reveal=async()=>{"," const reveal=async()=>{\n  workspaceStarted=true;"),
 ("   phase='workspace';\n   for(const entry of entryModules(document)){","   for(const entry of entryModules(document)){\n    phase='workspace-import';"),
 ("     workspace?.destroy?.();\n     workspace=await module.mountAdminWorkspace","     phase='workspace-mount';\n     workspace?.destroy?.();\n     workspace=await module.mountAdminWorkspace")
]
for before,after in pairs:
 assert g.count(before)==1,before
 g=g.replace(before,after)
gate.write_text(g)
family='wiring-kits/family-repository.mjs'
def update(p,fn):
 f=dst/p;s=f.read_text();result=fn(s);assert s!=result,p;f.write_text(result)
def stamp(s,names):
 count=0
 def rep(m):
  nonlocal count
  fn,query=m.groups()
  name=fn.rsplit('/',1)[-1]
  if name not in names:return m.group(0)
  count+=1
  return fn+'?'+re.sub(r'(?<=build=)[a-f0-9]{40}',token,query,count=1)
 out=re.sub(r"""([^"'\s<>]+\.(?:mjs|js))\?([^"'\s<>]+)""",rep,s)
 assert count and out!=s,names
 return out
update(family,lambda s: stamp(s,{'assembly-repository.mjs'}))
update('wiring-kits/builder-shell.mjs',lambda s: stamp(s,{'family-repository.mjs'}))
update('wiring-kits/builder-entry.mjs',lambda s: stamp(s,{'family-repository.mjs','builder-shell.mjs'}))
update('wiring-kits/landing.mjs',lambda s: stamp(s,{'family-repository.mjs'}))
for f in ('les-paul-kits/index.html','wiring-kits/build/index.html','wiring-kits/index.html'):
 update(f,lambda s: stamp(s,{'builder-entry.mjs','landing.mjs'}))

a,b=inv(src),inv(dst)
assert len(b)==476 and a.keys()==b.keys()
changed={p:dict(before=a[p],after=b[p]) for p in a if a[p]!=b[p]}
why={p:('recreate workspace state after an authorised re-sign-in and distinguish failure phases' if p=='admin/admin-gate.mjs' else 'invalidate the affected wiring kit module imports' if any(k in p for k in ('wiring-kits/','les-paul-kits/')) and oldtoken not in (src/p).read_text() else 'version the candidate Admin module graph') for p in changed}
assert len(changed)==len(why)
assert all(a[p]==b[p] for p in ('checkout/checkout.mjs','checkout/index.html','basket-ui.mjs','storefront/entry.mjs','operations/snapshot.json','index.html','components/index.html'))
out=root/'release-a77a-candidate.zip'
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_STORED) as z:
 for p in sorted(b):
  f=zipfile.ZipInfo(p,(2000,1,1,0,0,0));f.external_attr=0o100644<<16;z.writestr(f,(dst/p).read_bytes())
manifest={'scheme':token,'sentinel77_input_zip_sha256':digest,'release_a_input_zip_sha256':'ac7b361723c2eea4b75fb4b9c6827ae542ae36c7a8f6bcdf2b84c0365f6ea023','rollback_zip_sha256':'52f876edfba409ef1442eceae9a283b0024b53f2a195711f43113b0d6dd43cfe','candidate_zip_sha256':h(out.read_bytes()),'files':b,'changes_from_sentinel':{p:{**c,'reason':why[p]} for p,c in changed.items()},'changes_from_release_a':{p:{'before':x,'after':b[p]} for p,x in inv(root/'new').items() if x!=b[p]}}
raw=(json.dumps(manifest,indent=2,sort_keys=True)+'\n').encode()
(root/'deep-inventory.json').write_bytes(raw)
print(json.dumps({'files':len(b),'changed_from_sentinel':len(changed),'changed_from_release_a':len(manifest['changes_from_release_a']),'zip_sha256':manifest['candidate_zip_sha256'],'composition_sha256':h(raw),'inventory_sha256':h(json.dumps(b,sort_keys=True,separators=(',',':')).encode())}))
