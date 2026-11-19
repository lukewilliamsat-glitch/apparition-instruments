"""Mechanically distinguish the original incident, control, and corrected results."""
import json, sys
from pathlib import Path
d=Path(sys.argv[1])
def suite(n): return {r['pathname']:r for r in json.loads((d/(n+'.json')).read_text())}
def errors(r):return ' '.join((e.get('description') or '') for e in r['browserExceptions'])
new=suite('new-authorized-smoke'); old=suite('old-authorized-smoke')
assert not new['/admin/orders/']['authorized'] and any('customer-aftercare.mjs' in e for e in new['/admin/orders/']['parseErrors']),new['/admin/orders/']['parseErrors']
assert 'Admin operations repository is unavailable' in errors(new['/admin/site-operations/']),errors(new['/admin/site-operations/'])
for p in ['/admin/orders/','/admin/','/admin/catalogue-settings/','/admin/email-templates/']:
 assert old[p]['authorized'],(p,old[p]['gate'],old[p]['pageErrors'])
assert not old['/admin/site-operations/']['authorized'] and 'Admin operations repository is unavailable' in errors(old['/admin/site-operations/'])
fixed=suite('fixed-authorized-all')
for p,r in fixed.items():
 assert not r['blockedWrites'],(p,r['blockedWrites'])
 assert not r['catch'] and not r['pageErrors'] and not r['bad'] and not r['parseErrors'],(p,r['catch'],r['pageErrors'],r['bad'])
 assert not any('Admin startup failed' in e for e in r['consoleErrors']),(p,r['consoleErrors'])
 if p.startswith('/admin/'):
  assert r['authorized'] and 'Sign Out' in r['text'],(p,r['gate'],r['headings'])
  assert not r['browserExceptions'],(p,r['browserExceptions'])
  mods={}
  for mod in set(r['modules']):
   unit=mod.split('?')[0]
   assert unit not in mods,(p,mod,mods.get(unit))
   mods[unit]=mod
def exists(p,resource):
 return any(x['path']==resource and x['authenticated'] for x in fixed[p]['requests'])
assert exists('/admin/orders/','/rest/v1/orders') and fixed['/admin/orders/']['features'].get('library')
assert exists('/admin/orders/','/rest/v1/rpc/eclipse_fulfilment_library')
assert exists('/admin/site-operations/','/rest/v1/site_operations') and exists('/admin/site-operations/','/rest/v1/commercial_destinations')
assert 'Open for business' in fixed['/admin/site-operations/'].get('text','')
assert exists('/admin/email-templates/','/rest/v1/rpc/get_admin_email_templates')
assert exists('/admin/catalogue-settings/','/rest/v1/catalogue_options')
assert exists('/admin/delivery/','/rest/v1/rpc/overseer_delivery_admin_read')
detail=next(r for p,r in fixed.items() if p.startswith('/admin/orders/?id='))
assert detail['features']=={'dateHistory':True,'aftercareOff':True,'eclipse':True},detail['features']
assert any(x['path']=='/rest/v1/rpc/overseer_order_date_history' and x['authenticated'] for x in detail['requests'])
assert any(x['path']=='/rest/v1/rpc/command63_financial_read' and x['authenticated'] for x in detail['requests'])
for role in ('denied','anonymous'):
 for p,r in suite(f'fixed-{role}-smoke').items():
  assert not r['authorized'] and not r['pageErrors'] and not r['blockedWrites'],(role,p,r)
  assert not any(n['path'] not in ['/auth/v1/user','/rest/v1/admin_members'] and n['authenticated'] for n in r['requests']),(role,p,r['requests'])
  assert ('not authorised' if role=='denied' else 'Sign in with') in r['gate'],(role,p,r['gate'])
print(f'Exact Release A reproduced both blockers. {len(fixed)} corrected browser journeys and 12 access denials passed.')
