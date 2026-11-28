import sys,json
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_STORED
from hashlib import sha256
base,src,out=map(Path,sys.argv[1:]);out.mkdir(exist_ok=True,parents=True)
assert sha256(base.read_bytes()).hexdigest()=='1ff0b9beb6e5ef8258e3ee5ae22ce3a2b5073158c85d8006342144f7f0cab9ea'
with ZipFile(base) as z:before={n:z.read(n) for n in z.namelist()}
f=before.copy()
for file in (src/'phantasm').rglob('*'):
 if file.is_file() and file.name not in ['components.mjs','scene.mjs','assembly.mjs','tin-grain.mjs','specimen.mjs','orange-drop.mjs','materials104.mjs','metallurgy105.mjs','silversmith106.mjs']:f['phantasm/'+str(file.relative_to(src/'phantasm'))]=file.read_bytes()
assert all(f[n]==b for n,b in before.items() if not n.startswith('phantasm/'))
assert f['index.html']==before['index.html']
assert f['phantasm/assets/sv-001.glb']==before['phantasm/assets/sv-001.glb']
assert f['phantasm/assets/sv-002.glb']==before['phantasm/assets/sv-002.glb']
with ZipFile(out/'phantasm107-static.zip','w') as z:
 for n,b in sorted(f.items()):
  i=ZipInfo(n,(1980,1,1,0,0,0));i.external_attr=0o100644<<16;z.writestr(i,b,compress_type=ZIP_STORED)
(out/'phantasm107-inventory.json').write_text(json.dumps({'files':len(f),'changed':[n for n in sorted(before) if f[n]!=before[n]],'added':sorted(set(f)-set(before)),'homepage_unchanged':True,'inventory':{n:sha256(b).hexdigest() for n,b in sorted(f.items())}},separators=(',',':'))+'\n')
for n in ['phantasm107-static.zip','phantasm107-inventory.json']:print(sha256((out/n).read_bytes()).hexdigest(),n)
