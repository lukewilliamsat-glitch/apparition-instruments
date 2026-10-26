import os,sys,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/command-release'))
from archive_core import canonical,sha,Rejected
from frontend import preflight,SITE
class ReceiptTests(unittest.TestCase):
 def fixture(self):
  raw=canonical({'store':{'state':'OPEN'}});old=canonical({'store':{'state':'ORDERS_PAUSED'}})
  plan={'operationalCorrection':{'afterSHA256':sha(raw)},'protectedReferences':{'operations/snapshot.json':sha(old)},'baseTarSHA256':'a'*64,'baseRunId':77,'baseSource':'2'*40}
  values={'/git/ref/heads/main':{'object':{'sha':'3'*40}},'/pages':{'html_url':SITE+'/','build_type':'workflow'},'/deployments?environment=github-pages&per_page=5':[{'id':10,'environment':'github-pages','sha':'3'*40}],'/deployments/10/statuses?per_page=1':[{'state':'success','log_url':'https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/77/job/1'}]}
  for s in ['in_progress','queued','waiting','pending','requested']:values['/actions/runs?status='+s+'&per_page=5']={'workflow_runs':[]}
  return plan,values,raw
 def test_open_static_restoration_receipt_is_truthful_without_claiming_backend_acceptance(self):
  p,v,raw=self.fixture()
  with patch.dict(os.environ,{'GITHUB_REPOSITORY':'lukewilliamsat-glitch/apparition-instruments','GITHUB_REF':'refs/heads/main','GITHUB_SHA':'3'*40,'GITHUB_RUN_ID':'88','GH_TOKEN':''}):r=preflight(p,'restore',77,get=v.__getitem__,public_get=lambda *_:raw)
  self.assertEqual(r['servedHoliday'],'OPEN');self.assertEqual(r['servedStaticStoreState'],'OPEN');self.assertEqual(r['snapshotAuthority'],'STATIC_PRESENTATION_ONLY');self.assertEqual(r['backendRequests'],0)
 def test_main_identity_guard_still_rejects_drift(self):
  p,v,raw=self.fixture();v['/git/ref/heads/main']['object']['sha']='4'*40
  with patch.dict(os.environ,{'GITHUB_REPOSITORY':'lukewilliamsat-glitch/apparition-instruments','GITHUB_REF':'refs/heads/main','GITHUB_SHA':'3'*40,'GITHUB_RUN_ID':'88','GH_TOKEN':''}):
   with self.assertRaisesRegex(Rejected,'Current main changed'):preflight(p,'restore',77,get=v.__getitem__,public_get=lambda *_:raw)
if __name__=='__main__':unittest.main()
