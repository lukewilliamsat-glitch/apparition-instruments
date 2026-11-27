import sys,json
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile,ZipInfo,ZIP_STORED
base,src,out=map(Path,sys.argv[1:]);out.mkdir(parents=True,exist_ok=True)
assert sha256(base.read_bytes()).hexdigest()=='80cf3bfbeaba475b8d08c773a3fc2c20bf0db5644d5bbd71a023bd7d439a9b71'
with ZipFile(base) as z:before={n:z.read(n) for n in z.namelist()}
assert len(before)==505
files=before.copy()
for f in src.rglob('*'):
 if f.is_file():files[f.relative_to(src).as_posix()]=f.read_bytes()
changed=[n for n in sorted(before) if files[n]!=before[n]]
assert changed==['index.html'],changed
new=sorted(set(files)-set(before));assert all(n in ['phantasm95.css','phantasm95.mjs'] or n.startswith('assets/phantasm95/') for n in new)
assert len(new)==8
# Homepage-only recovery restores exact original HTML without changing current non-homepage files.
restored=files.copy();restored['index.html']=before['index.html']
assert all(restored[n]==b for n,b in before.items())
assert all(restored[n]==files[n] for n in files if n!='index.html')
with ZipFile(out/'phantasm95-static.zip','w') as z:
 for n,b in sorted(files.items()):
  i=ZipInfo(n,(1980,1,1,0,0,0));i.external_attr=0o100644<<16;z.writestr(i,b,compress_type=ZIP_STORED)
receipt={'files':len(files),'changed':changed,'added':new,'unchanged_baseline_files':504,'rollback':'14a0af2b-9ddf-4b64-9690-dc490ddbf476','legacy_source':'3dda2084bb2c1c2e8b9267d34644738114aa0c69','legacy_package_sha256':'07326c2b63e862752f6eac27b92b2c3113d3e82cde464e16544456d8504cb4db','homepage_restore_test':'exact original HTML and dependency closure retained; non-homepage bytes preserved','inventory':{n:sha256(b).hexdigest() for n,b in sorted(files.items())}}
(out/'phantasm95-inventory.json').write_text(json.dumps(receipt,separators=(',',':'))+'\n')
print(json.dumps({k:v for k,v in receipt.items() if k!='inventory'}))
for name in ['phantasm95-static.zip','phantasm95-inventory.json']:print(sha256((out/name).read_bytes()).hexdigest(),name)
