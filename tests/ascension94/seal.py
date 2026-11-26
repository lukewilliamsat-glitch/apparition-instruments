import json,sys
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile,ZipInfo,ZIP_STORED
base,src,out=map(Path,sys.argv[1:]);out.mkdir(exist_ok=True,parents=True)
assert sha256(base.read_bytes()).hexdigest()=='61a0221ddb615565b0260fffb89fcf2174a3c7f0508bf50748f616da2e592ccc'
with ZipFile(base) as z: files={n:z.read(n) for n in z.namelist()}
assert len(files)==505
before=files.copy()
files['admin/ironclad/app.mjs']=(src/'app.mjs').read_bytes()
files['admin/ironclad/entry.mjs']=files['admin/ironclad/entry.mjs'].replace(b'app.mjs?build=nocturne90-dashboard',b'app.mjs?build=ascension94-costs')
files['admin/ironclad/index.html']=files['admin/ironclad/index.html'].replace(b'entry.mjs?build=nocturne90-dashboard',b'entry.mjs?build=ascension94-costs')
changed=[n for n in sorted(files) if files[n]!=before[n]]
assert changed==['admin/ironclad/app.mjs','admin/ironclad/entry.mjs','admin/ironclad/index.html']
with ZipFile(out/'ascension94-static.zip','w') as z:
 for n,b in sorted(files.items()):
  i=ZipInfo(n,(1980,1,1,0,0,0));i.external_attr=0o100644<<16;z.writestr(i,b,compress_type=ZIP_STORED)
(out/'ascension94-inventory.json').write_text(json.dumps({'files':505,'changed':changed,'inventory':{n:sha256(b).hexdigest() for n,b in sorted(files.items())}},separators=(',',':'))+'\n')
print('505 files; only three IRONCLAD resources changed; ECLIPSE reuses the existing attributable-cost and guarded finance-save contracts')
