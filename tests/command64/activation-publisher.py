import copy,json,pathlib,sys,tempfile
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[2]/'scripts/command-release'))
from frontend_release import ledger64_evidence,plan_at,sha,LEDGER64_BACKEND,LEDGER64_MIGRATION,LEDGER64_ORDER
from archive_core import Rejected
root=pathlib.Path(__file__).resolve().parents[2]
p=json.loads((root/'docs/releases/triple-strike/current.json').read_text())
assert plan_at(root/'docs/releases/triple-strike/current.json')['authority']=='AUTHORISATION_63'
p.update(authority='AUTHORISATION_64',phase='CONTROLLED64',financialPersistence=True,backendEvidenceSHA256=LEDGER64_BACKEND,migrationSHA256=LEDGER64_MIGRATION,designatedOrderId=LEDGER64_ORDER,livePersistenceEvidenceSHA256=None,targetedAcceptanceSHA256=sha((root/'docs/operations/black-ledger64/targeted-acceptance.json').read_bytes()))
ledger64_evidence(p,root)
count=2
for key,value in [('backendEvidenceSHA256','0'*64),('migrationSHA256','0'*64),('designatedOrderId','10000000-0000-4000-8000-000000000003'),('targetedAcceptanceSHA256','0'*64),('livePersistenceEvidenceSHA256','0'*64)]:
 q=copy.deepcopy(p);q[key]=value
 try:ledger64_evidence(q,root)
 except Rejected:count+=1
 else:raise AssertionError(key+' was not rejected')
q=copy.deepcopy(p);q['phase']='ACTIVE64'
try:ledger64_evidence(q,root)
except (Rejected,FileNotFoundError):count+=1
else:raise AssertionError('General activation accepted without authenticated evidence')
print(json.dumps({'groups':count,'result':'PASS','networkRequests':0,'productionWrites':0}))
