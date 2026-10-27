import copy,json,pathlib,sys,tempfile
root=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(root/'scripts/command-release'))
from frontend_release import plan_at,wording65_evidence,unified_native_evidence
from archive_core import Rejected
p=plan_at(root/'docs/releases/triple-strike/current.json');wording65_evidence(p,root);groups=1
for field,value in [('authority','AUTHORISATION_63'),('financialPersistence',False),('activePromotions',True),('nightfallActivation',True)]:
 q=copy.deepcopy(p);q[field]=value
 with tempfile.TemporaryDirectory() as t:
  path=pathlib.Path(t)/'plan.json';path.write_text(json.dumps(q))
  try:plan_at(path)
  except Rejected:groups+=1
  else:raise AssertionError(field+' was accepted')
q=copy.deepcopy(p);q['releaseVerification']['/ninth-url']='0'*64
with tempfile.TemporaryDirectory() as t:
 path=pathlib.Path(t)/'plan.json';path.write_text(json.dumps(q))
 try:plan_at(path)
 except Rejected:groups+=1
 else:raise AssertionError('Unbounded verification accepted')
q=copy.deepcopy(p);q['wordingEvidenceSHA256']='0'*64
try:wording65_evidence(q,root)
except Rejected:groups+=1
else:raise AssertionError('Changed acceptance evidence accepted')
try:unified_native_evidence(p,lambda path:{'head_sha':'0'*40,'status':'completed','conclusion':'success','path':'.github/workflows/frontend-publication.yml'})
except Rejected:groups+=1
else:raise AssertionError('Different production ancestry accepted')
print(json.dumps({'groups':groups,'result':'PASS','networkRequests':0,'productionMutations':0}))
