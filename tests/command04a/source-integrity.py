"""NOCTURNE read-only source gate. Every inherited blob remains frozen."""
from pathlib import Path
import sys, subprocess, hashlib, json
out=Path(sys.argv[1]); commit=sys.argv[2]
def git(*args): return subprocess.check_output(['git',*args])
base='20002c45933a7f24b08f6d5f0199a7fc8fa1a282'
assert git('rev-parse','HEAD').decode().strip()==commit
assert git('rev-parse',base+'^{tree}').decode().strip()=='e7025f7ee95eb4389910848dc66122e53ce37dfb'
assert not git('status','--porcelain'), 'Source changed during acceptance'
for line in git('diff','--name-status',base,commit).decode().splitlines():
    status,path=line.split('\t',1)
    assert status=='A' and (path.startswith(('prototypes/command04a/','tests/command04a/','docs/command/command04a/')) or path=='.github/workflows/command04a-nocturne.yml'), line
inherited={}; c03={}
for entry in git('ls-tree','-r','-z',base).split(b'\0'):
    if not entry: continue
    meta,path=entry.split(b'\t',1); mode,kind,expected=meta.decode().split(); path=path.decode()
    assert kind=='blob'; data=Path(path).read_bytes()
    blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    assert blob==expected,path
    inherited[path]={'gitBlob':blob,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
    if path.startswith('prototypes/command03/'): c03[path]=inherited[path]
assert len(inherited)==993 and len(c03)==8
manifest={}
for path in git('diff','--name-only',base,commit).decode().splitlines():
    data=Path(path).read_bytes(); manifest[path]={'gitBlob':git('rev-parse',commit+':'+path).decode().strip(),'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
proof={'status':'PASS','executionCommit':commit,'tree':git('rev-parse',commit+'^{tree}').decode().strip(),'base':base,'inheritedBlobsVerified':len(inherited),'newFiles':manifest,'inherited':inherited}
identity={'status':'PASS','executionCommit':commit,'testedApplication':{'commit':'53c4063cccc6be097bc53a0c04f1c9ef2c75bf7c','tree':'c3124dac437bb9e72e7a2d7632b1cc6f2f452b1e','files':c03}}
out.mkdir(parents=True,exist_ok=True)
if '--after' in sys.argv:
    assert json.loads((out/'NOCTURNE_SOURCE.json').read_text())==proof
    (out/'SOURCE_AFTER.json').write_text(json.dumps(proof,indent=2)+'\n')
else:
    (out/'NOCTURNE_SOURCE.json').write_text(json.dumps(proof,indent=2)+'\n')
    (out/'IRONCLAD_SOURCE.json').write_text(json.dumps(proof,indent=2)+'\n')
    (out/'SOURCE_IDENTITY.json').write_text(json.dumps(identity,indent=2)+'\n')
print(json.dumps({'status':'PASS','inheritedBlobs':len(inherited),'newFiles':len(manifest),'after':'--after' in sys.argv}))
