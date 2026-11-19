import json,sys
from pathlib import Path
d=Path(sys.argv[1]); name=sys.argv[2]; failures=[]
def req(ok,detail):
 if not ok:failures.append(detail)
routes=json.loads((d/f'{name}-authorized-all.json').read_text())
for r in routes:
 p=r['pathname']; clean=p not in ('/admin/orders/?probe=backend-error','/admin/?view=maintenance')
 req(not r['catch'] and not r['pageErrors'] and not r['parseErrors'] and not r['bad'] and not r['blockedWrites'],(p,'unexpected errors',r['catch'],r['pageErrors'],r['bad'],r['blockedWrites']))
 req(not r['depthErrors'],(p,'functional checks',r['depthErrors']))
 req(not clean or not r['browserExceptions'],(p,'exceptions',r['browserExceptions']))
 req(bool(r['depth']) and all(x=='passed' for x in r['depth'].values()),(p,'functional outcomes',r['depth']))
 if p.startswith('/admin/'):
  req(r.get('authorized',False),(p,'admin gate',r.get('gate')))
  identities={mod.split('?')[0] for mod in r['modules']}
  req(len(identities)==len(set(r['modules'])),(p,'duplicate module URL identities'))
for role in ('anonymous','denied','expired','renewed'):
 for r in json.loads((d/f'{name}-{role}-smoke.json').read_text()):
  p=r['pathname']
  req(r.get('authorized')==(role=='renewed') and not r['depthErrors'] and not r['pageErrors'] and not r['blockedWrites'],(role,p,r.get('gate'),r['depthErrors'],r['pageErrors']))
  if role in ('expired','renewed'):
   req(sum(x['path']=='/auth/v1/token' for x in r['requests'])==1,(role,p,'expected one bounded renewal'))
checks=sum(len(x['depth']) for x in routes)
if failures:
 for f in failures:print(json.dumps(f))
 sys.exit(f'{len(failures)} candidate acceptance checks failed')
print(f'PASS: {len(routes)} candidate browser routes; {checks} functional assertions; permission and renewal journeys passed.')
