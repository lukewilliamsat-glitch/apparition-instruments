"""Pure fixture checks. No deployment, network transport or provenance authority."""
import hashlib,json
from pathlib import PurePosixPath

OLD='f72258fb8d455513d2cb38e3672f914207f81ee37664c7e6b32edc7d9c320f26'
NEW='16d6ebbd2372d54e32565a7999edfd1bc9152c785b77f1bcbf79ee47bba1794a'
CSS='customer-ui.css'
def digest(data):return hashlib.sha256(data).hexdigest()
def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':')).encode()
def extract_css(original,replacements):
 if digest(original)!=OLD:raise ValueError('Baseline changed; reconcile first')
 text=original.decode()
 for old,new in replacements:
  if text.count(old)!=1:raise ValueError('Selector drift')
  text=text.replace(old,new)
 result=text.encode()
 if digest(result)!=NEW:raise ValueError('Unreviewed CSS')
 return result
def css_only(before,after):
 if set(before)!=set(after):raise ValueError('Unexpected source paths')
 if [p for p in before if before[p]!=after[p]]!=['dist/customer-ui.css']:raise ValueError('Unexpected source scope')
def safe_path(path):
 if not isinstance(path,str) or not path or '\\' in path or ':' in path or '?' in path or '#' in path or path.startswith('/') or any(s in ('','.','..') for s in path.split('/')):raise ValueError('Unsafe asset path')
 if str(PurePosixPath(path))!=path:raise ValueError('Noncanonical path')
def inventory(files):
 result=[]
 for path,data in sorted(files.items()):
  safe_path(path)
  if not isinstance(data,bytes):raise ValueError('Bytes required')
  result.append({'path':path,'bytes':len(data),'sha256':digest(data)})
 return result
def verify(files,expected):
 paths=[r['path'] for r in expected]
 if len(paths)!=len(set(paths)):raise ValueError('Duplicate manifest path')
 if inventory(files)!=sorted(expected,key=lambda r:r['path']):raise ValueError('Incomplete or changed payload')
def assemble(files,expected,css):
 verify(files,expected)
 if digest(files[CSS])!=OLD or digest(css)!=NEW:raise ValueError('CSS source mismatch')
 result={**files,CSS:css}
 return result,canonical(inventory(result))
def restore(files,expected_current,original):
 verify(files,expected_current)
 if digest(files[CSS])!=NEW or digest(original)!=OLD:raise ValueError('Rollback CSS mismatch')
 return {**files,CSS:original}
def blockers(manifest):
 # Reporting only. Even complete fixture bytes do not attest a live release.
 result=[]
 for name in ['productionWorkflowBackendFree','completeAuthoritativePublicationInput','completeRollbackInput','currentActiveDeploymentAssociation']:
  if manifest['gates'].get(name)!='PASS':result.append(name)
 if manifest.get('authoritativePublicationInventory') is None:result.append('authoritativePublicationInventory')
 if not manifest.get('publicationPayloadSHA256'):result.append('publicationPayloadSHA256')
 if not manifest.get('rollbackPayloadSHA256'):result.append('rollbackPayloadSHA256')
 return result
