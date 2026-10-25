import sys,json,subprocess,hashlib
from pathlib import Path
out=Path(sys.argv[1]);commit=sys.argv[2];after='--after' in sys.argv
base='2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==commit
allowed={'dist/admin/admin-gate.mjs','dist/admin/application.mjs'}
original=subprocess.check_output(['git','ls-tree','-r','--name-only',base],text=True).splitlines()
for p in original:
 if p in allowed:continue
 assert Path(p).read_bytes()==subprocess.check_output(['git','show',base+':'+p]),p
paths=[p for p in subprocess.check_output(['git','ls-files'],text=True).splitlines() if p.startswith(('dist/admin/command/','tests/command05/')) or p in allowed or p=='.github/workflows/command05-ascension.yml']
hashes={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in sorted(paths)}
data={'executionCommit':commit,'base':base,'unchangedInheritedBlobs':len(original)-len(allowed),'allowedInheritedChanges':sorted(allowed),'sha256':hashes,'sourceDigest':hashlib.sha256(json.dumps(hashes,sort_keys=True,separators=(',',':')).encode()).hexdigest()}
out.mkdir(parents=True,exist_ok=True)
if after:assert json.loads((out/'SOURCE_IDENTITY.json').read_text())==data
(out/('SOURCE_AFTER.json' if after else 'SOURCE_IDENTITY.json')).write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps({'source':commit,'protectedBlobs':data['unchangedInheritedBlobs'],'hashes':len(hashes),'after':after}))
