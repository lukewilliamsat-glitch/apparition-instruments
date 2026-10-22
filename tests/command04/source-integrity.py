"""Read-only Git/filesystem identity checks. No backend access; run before/after CI tests."""
from pathlib import Path
import sys,subprocess,hashlib,json
out=Path(sys.argv[1]);commit=sys.argv[2]
def git(*args):return subprocess.check_output(['git',*args])
base='2c2d629a6194506d34c2fbbcce4742fceee94488';frozen='53c4063cccc6be097bc53a0c04f1c9ef2c75bf7c'
assert git('rev-parse','HEAD').decode().strip()==commit
assert git('rev-parse',base+'^{tree}').decode().strip()=='e85d7e8c181f1f8cfd576cedbe53c64a8958f7cf'
assert not git('status','--porcelain'), 'Source changed during tests'
changes=git('diff','--name-status',base,commit).decode().splitlines()
for line in changes:
 status,path=line.split('\t',1)
 assert status=='A' and (path.startswith(('prototypes/command04/','tests/command04/','docs/command/command04/')) or path in ['.github/workflows/command04-acceptance.yml','docs/engineering/ASTRA_CHAT_MIGRATION_20261022.md']),line
app={};verified=0
for entry in git('ls-tree','-r','-z',base).split(b'\0'):
 if not entry:continue
 meta,path=entry.split(b'\t',1);mode,kind,expected=meta.decode().split();path=path.decode();assert kind=='blob';data=Path(path).read_bytes()
 actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();assert actual==expected,path;verified+=1
 if path.startswith('prototypes/command03/'):
  assert git('rev-parse',frozen+':'+path).decode().strip()==actual
  app[path]={'gitBlob':actual,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
assert verified==977 and len(app)==8
source={'status':'PASS','executionCommit':commit,'testedApplication':{'commit':frozen,'tree':'c3124dac437bb9e72e7a2d7632b1cc6f2f452b1e','files':app},'preservedHandover':base,'unchangedOriginalBlobs':verified}
manifest={}
for line in changes:
 path=line.split('\t',1)[1];data=Path(path).read_bytes();manifest[path]={'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'gitBlob':git('rev-parse',commit+':'+path).decode().strip()}
proof={'status':'PASS','executionCommit':commit,'tree':git('rev-parse',commit+'^{tree}').decode().strip(),'base':base,'unchangedOriginalBlobs':verified,'newFiles':manifest}
out.mkdir(parents=True,exist_ok=True)
if '--after' in sys.argv:
 assert json.loads((out/'IRONCLAD_SOURCE.json').read_text())==proof
 (out/'SOURCE_AFTER.json').write_text(json.dumps(proof,indent=2)+'\n')
else:
 (out/'SOURCE_IDENTITY.json').write_text(json.dumps(source,indent=2)+'\n');(out/'IRONCLAD_SOURCE.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps({'status':'PASS','unchangedOriginalBlobs':verified,'newFiles':len(manifest),'after':'--after' in sys.argv}))
