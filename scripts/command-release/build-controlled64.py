import copy,json,pathlib,posixpath,re,sys
sys.path.insert(0,'scripts/command-release')
from archive_core import Payload,sha,canonical
from frontend_release import prepare,plan_at,LEDGER64_ORDER,LEDGER64_BACKEND,LEDGER64_MIGRATION
source=sys.argv[1];root=pathlib.Path('.');base_dir=root/'private/baseline-tree'
base={p.relative_to(base_dir).as_posix():p.read_bytes() for p in base_dir.rglob('*') if p.is_file()}
files=dict(base);primary={'admin/orders/financial-order.mjs','admin/orders/finance-activation.mjs'}
for p in primary:files[p]=(root/'dist'/p).read_bytes()
changed=set(primary);replacements={}
pattern=re.compile(r'''(?P<q>['"])(?P<url>[^'"\s]+\.(?:mjs|js|css)\?[^'"\s]+)(?P=q)''')
for _ in range(8):
 progress=False
 for path,data in list(files.items()):
  if not path.startswith('admin/') or not path.endswith(('.html','.mjs','.js')):continue
  text=data.decode();pairs=[]
  def fix(m):
   old=m['url'];part=old.split('?',1)[0];target=posixpath.normpath(posixpath.join(posixpath.dirname(path),part))
   if target not in changed:return m[0]
   new=re.sub(r'([?&])build=[a-f0-9]{40}',lambda x:x[1]+'build='+source,old)
   if new!=old:pairs.append((old,new))
   return m['q']+new+m['q']
  after=pattern.sub(fix,text).encode()
  if after!=data:
   if path not in changed:progress=True
   changed.add(path);files[path]=after
 if not progress:break
else:raise AssertionError('Cache dependency closure did not converge')
assert all(p.startswith('admin/orders/') for p in changed)
entries=[];changes=[]
namespace='black-ledger63-CONTROLLED64'
for path in sorted(changed):
 c={'path':path,'beforeSHA256':sha(base[path]),'afterSHA256':sha(files[path]),'bytes':len(files[path])}
 if path in primary:
  entries.append(dict(c));dest='release-overlays/'+namespace+'/'+path
  p=root/dest;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(files[path]);c.update(operation='compiled-admin',source=dest)
 else:
  pairs=[]
  before=base[path].decode();after=files[path].decode()
  for m in pattern.finditer(before):
   old=m['url'];target=posixpath.normpath(posixpath.join(posixpath.dirname(path),old.split('?',1)[0]))
   if target in changed:
    new=re.sub(r'([?&])build=[a-f0-9]{40}',lambda x:x[1]+'build='+source,old)
    if old!=new and (old,new) not in pairs:pairs.append((old,new))
  check=before
  c.update(operation='replace',replacements=[])
  for old,new in pairs:
   n=check.count(old);assert n>0;check=check.replace(old,new);c['replacements'].append({'before':old,'after':new,'count':n})
  assert check==after,path
 changes.append(c)
manifest={'kind':'BLACK_LEDGER_V1','phase':'CONTROLLED64','sourceCommit':source,'entries':entries}
mp=root/'docs/operations/black-ledger64/source-manifest-CONTROLLED64.json';mp.write_bytes(canonical(manifest))
old=json.loads((root/'docs/releases/triple-strike/current.json').read_text())
p={k:v for k,v in old.items() if k not in ['changes','baselineVerification','rollbackVerification','releaseVerification','knownFailedPublications','ledgerManifestSHA256']}
p.update(authority='AUTHORISATION_64',phase='CONTROLLED64',applicationSource=source,baseSource='24e0bfbc959619ddad304d7b00e0e4816094bad1',baseRunId=40550780745,baseArtifactId=12754827108,baseTarSHA256='d929374625762ef5d12893f809ad70b7e35d3e8b5a1a91848fbe10741b83099a',basePayloadDigest=Payload(base).digest(),candidateDigest=Payload(files).digest(),rollbackDigest=Payload(base).digest(),financialPersistence=True,activePromotions=False,nightfallActivation=False,knownFailedPublications=[],changes=changes,ledgerManifestSHA256=sha(canonical(manifest)),migrationSHA256=LEDGER64_MIGRATION,backendEvidenceSHA256=LEDGER64_BACKEND,designatedOrderId=LEDGER64_ORDER,livePersistenceEvidenceSHA256=None,targetedAcceptanceSHA256=sha((root/'docs/operations/black-ledger64/targeted-acceptance.json').read_bytes()))
urls={'/admin/orders/':'admin/orders/index.html','/admin/orders/financial-order.mjs':'admin/orders/financial-order.mjs','/admin/orders/finance-activation.mjs':'admin/orders/finance-activation.mjs','/backend/image-delivery-config.mjs':'backend/image-delivery-config.mjs','/commercial/offer-activation.mjs':'commercial/offer-activation.mjs','/operations/snapshot.json':'operations/snapshot.json','/':'index.html','/components/treble-bleeds/':'components/treble-bleeds/index.html'}
p['baselineVerification']={u:sha(base[f]) for u,f in urls.items()};p['rollbackVerification']=dict(p['baselineVerification']);p['releaseVerification']={u:sha(files[f]) for u,f in urls.items()}
plan=root/'docs/releases/triple-strike/current.json';plan.write_text(json.dumps(p,indent=2)+'\n')
p=plan_at(plan);r=prepare(p,root/'private/baseline',root,root/'private/prepared-controlled')
(root/'private/controlled-prepared.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({k:r[k] for k in ['candidateDigest','rollbackDigest','candidateFiles','unchangedFiles','changedFiles']}))
