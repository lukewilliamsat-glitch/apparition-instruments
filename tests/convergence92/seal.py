from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile, ZipInfo, ZIP_STORED
import json
import sys
source=Path(__file__).parent
out=Path(sys.argv[1])
out.mkdir(parents=True,exist_ok=True)
files={p.name:p.read_bytes() for p in source.iterdir() if p.is_file() and p.name!='verify.yml'}
manifest={'version':1,'authorisation':92,'environment':'review-only','files':{n:sha256(b).hexdigest() for n,b in sorted(files.items())}}
with ZipFile(out/'convergence92-candidate.zip','w') as archive:
 for name,data in sorted(files.items()):
  info=ZipInfo(name,(1980,1,1,0,0,0))
  info.external_attr=0o100644<<16
  archive.writestr(info,data,compress_type=ZIP_STORED)
(out/'convergence92-manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
for p in sorted(out.iterdir()):
 print(sha256(p.read_bytes()).hexdigest(),p.name)
