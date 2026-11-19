#!/usr/bin/env python3
"""Compose and seal an isolated Release A correction; no publishing capability."""
import hashlib,json,os,re,shutil,stat,sys,zipfile
from pathlib import Path,PurePosixPath
from urllib.parse import urlsplit,urljoin,parse_qsl
ROOT=Path(sys.argv[1])
HASH={
 'release':('ac7b361723c2eea4b75fb4b9c6827ae542ae36c7a8f6bcdf2b84c0365f6ea023','release-a-site/','new'),
 'prior':('52f876edfba409ef1442eceae9a283b0024b53f2a195711f43113b0d6dd43cfe','candidate/','old')
}
TAG='?build=sentinel77-b2'
def h(b):return hashlib.sha256(b).hexdigest()
def inv(path):return {str(p.relative_to(path)):h(p.read_bytes()) for p in sorted(path.rglob('*')) if p.is_file()}
for name,(digest,prefix,dest) in HASH.items():
 archive=ROOT/(name+'.zip')
 assert h(archive.read_bytes())==digest,name
 target=ROOT/dest
 with zipfile.ZipFile(archive) as z:
  expected=json.loads(z.read('composition.json' if name=='release' else 'ironclad69a-receipt.json'))
  expected=expected['releaseA']['files'] if name=='release' else expected['release']
  if not target.exists():
   for member in z.infolist():
    if member.is_dir() or not member.filename.startswith(prefix):continue
    raw=member.filename[len(prefix):]
    p=PurePosixPath(raw)
    assert not p.is_absolute() and '..' not in p.parts and '\\' not in raw
    assert not stat.S_ISLNK(member.external_attr>>16)
    out=target/p
    assert not out.exists(),raw
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_bytes(z.read(member))
  assert inv(target)==expected
source=ROOT/'new'; out=ROOT/'fixed'
assert not out.exists()
shutil.copytree(source,out)
dc='admin/orders/customer-aftercare.mjs'
target=out/dc
body=target.read_text()
notice="  const directStatus=document.createElement('p');directStatus.className='storage-note';directStatus.textContent='Aftercare Direct sending is off. Use the eBay order conversation or the existing manual-copy draft.';section.append(directStatus);"
assert body.count(notice)==1 and 'openAftercareDirect' not in body
# One guarded expression; its previous line remains unchanged so the message is still eBay-only.
target.write_text(body.replace(notice,"  section.append(el('p','Aftercare Direct sending is off. Use the eBay order conversation or the existing manual-copy draft.','storage-note'));"))
gate=out/'admin/admin-gate.mjs'
before=gate.read_text()
assert before.count("catch{setComponentRepository(null);")==1
gate.write_text(before.replace(" const reveal=async()=>{"," const reveal=async()=>{\n  let phase='repositories';").replace("   addConjureNavigation(document);","   phase='navigation';\n   addConjureNavigation(document);").replace("   mountAdminShell(document,signOutControl);","   phase='shell';\n   mountAdminShell(document,signOutControl);\n   phase='workspace';").replace("catch{setComponentRepository(null);","catch{console.error('Admin startup failed ('+phase+').');setComponentRepository(null);"))
# Measuring can skip nodes hidden at one breakpoint. Their validated fallback
# placements still participate in the grid and must fit the measured extent.
native=out/'admin/conjure/native-surface.mjs'
source_native=native.read_text()
old="for(const id of s.order)l.placements[id].source='manual';"
new="for(const id of s.order){const placement=l.placements[id];placement.source='manual';const p=placement.value;if(p.visible)l.rows=Math.max(l.rows,p.row+p.rows+l.grid.trailingRows);}"
assert source_native.count(old)==1
native.write_text(source_native.replace(old,new))
# Release composition is based on stamped files plus a source overlay. Resolve cache-only
# variants to one URL per affected Admin asset, across documents and all of their imports.
origin='https://sentinel.invalid'
html_ref=re.compile(r"""((?:src|href|data-admin-entry)=["'])([^"']+)(["'])""")
js_ref=re.compile(r"""(\b(?:from|import)\s*\(?\s*["']|\bnew\s+URL\(\s*["'])([^"']+)(["'])""")
def local(owner,ref):
 if not ref.startswith(('./','../','/')) or ref.startswith('//'):return None
 parsed=urlsplit(urljoin(origin+'/'+owner,ref))
 if parsed.netloc!='sentinel.invalid' or not parsed.path.endswith(('.mjs','.js','.css')):return None
 assert not parsed.fragment and {k for k,_ in parse_qsl(parsed.query)}<={'v','build'},(owner,ref)
 dest=parsed.path.removeprefix('/')
 assert (source/dest).is_file(),(owner,ref,dest)
 return dest
docs=set(str(p.relative_to(source)) for p in (source/'admin').rglob('*.html'))
queue=sorted(docs)
graph=set()
documents={}; references=set()
while queue:
 f=queue.pop()
 if f in graph:continue
 graph.add(f)
 if f.endswith('.css'):continue
 raw=(out/f).read_text()
 tree=html_ref if f in docs else js_ref
 def rewrite(m):
  left,items,right=m.groups()
  refs=items.split(',') if f in docs and left.startswith('data-admin-entry') else [items]
  new=[]
  for ref in refs:
   name=local(f,ref.strip())
   if name:
    queue.append(name);references.add((f,name))
    new.append(re.split('[?]',ref.strip(),1)[0]+TAG)
   else:new.append(ref)
  return left+','.join(new)+right
 text=tree.sub(rewrite,raw)
 if text!=raw:(out/f).write_text(text)
 if f in docs:documents[f]=sorted(n for owner,n in references if owner==f)
a,b=inv(source),inv(out)
assert a.keys()==b.keys() and len(b)==476
changed={p:{'before':a[p],'after':b[p]} for p in a if a[p]!=b[p]}
assert set(changed)<=graph
assert all(a[p]==b[p] for p in a if p.endswith('index.html') and not p.startswith('admin/'))
assert all(a[p]==b[p] for p in ('checkout/checkout.mjs','basket-ui.mjs','storefront/entry.mjs','operations/snapshot.json'))
manifest={'base_zip_sha256':HASH['release'][0],'rollback_zip_sha256':HASH['prior'][0],'scheme':TAG,'graph':sorted(graph),'revisions':len(changed),'changed':changed,'files':b}
(ROOT/'fixed-inventory.json').write_text(json.dumps(manifest,indent=2,sort_keys=True)+'\n')
# Deterministic exact review package with no executable CI or provider credentials.
with zipfile.ZipFile(ROOT/'release-a77-candidate.zip','w',compression=zipfile.ZIP_STORED) as z:
 for n in sorted(b):
  info=zipfile.ZipInfo(n,(2000,1,1,0,0,0));info.external_attr=0o100644<<16
  z.writestr(info,(out/n).read_bytes())
print(json.dumps({'files':len(b),'changed':len(changed),'admin_graph':len(graph),'zip_sha256':h((ROOT/'release-a77-candidate.zip').read_bytes()),'inventory_sha256':h(json.dumps(b,sort_keys=True,separators=(',',':')).encode())}))
