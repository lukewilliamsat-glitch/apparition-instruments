from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile,ZipInfo,ZIP_STORED
import json,sys
root=Path(__file__).parent
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
files={}
for path in root.rglob('*'):
 if path.is_file() and not any(part.startswith('.') for part in path.relative_to(root).parts):
  files['convergence93/'+str(path.relative_to(root))]=path.read_bytes()
for path in (root.parent/'convergence92').iterdir():
 if path.is_file() and path.name!='verify.yml':files['convergence92/'+path.name]=path.read_bytes()
manifest={'version':1,'authorisation':93,'environment':'production-review-only','files':{n:sha256(b).hexdigest() for n,b in sorted(files.items())}}
with ZipFile(out/'nexus93-activation-review.zip','w') as archive:
 for name,data in sorted(files.items()):
  info=ZipInfo(name,(1980,1,1,0,0,0));info.external_attr=0o100644<<16;archive.writestr(info,data,compress_type=ZIP_STORED)
(out/'nexus93-manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
for p in sorted(out.iterdir()):print(sha256(p.read_bytes()).hexdigest(),p.name)
