import copy,json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts/command-release'))
import frontend_release as f
from archive_core import _read_tar,Rejected,canonical
BASE=ROOT.parent/'command60-private/baseline';PLAN=ROOT/'docs/releases/triple-strike/current.json'
class UnifiedPublication(unittest.TestCase):
 def setUp(self):self.p=f.plan_at(PLAN)
 def test_01_complete_current_rollback_and_public_preservation(self):
  with tempfile.TemporaryDirectory() as d:
   r=f.prepare(self.p,BASE,ROOT,Path(d)/'out');before=_read_tar((BASE/'artifact.tar').read_bytes());after=f.tree_payload(Path(d)/'out/candidate');self.assertEqual(r['candidateFiles'],446);self.assertEqual(f.tree_payload(Path(d)/'out/rollback').digest(),before.digest())
   for k,v in before.files.items():
    if not k.startswith('admin/') and k!='commercial/admin.mjs':self.assertEqual(after.files[k],v,k)
 def test_02_unrelated_controller_cannot_be_replaced(self):
  p=copy.deepcopy(self.p);p['changes'][0]['source']='dist/admin/admin.mjs'
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(Rejected,'approved source'):f.prepare(p,BASE,ROOT,Path(d)/'out')
 def test_03_activation_change_cannot_be_added(self):
  p=copy.deepcopy(self.p);p['changes'].append({'path':'admin/command/read-activation.mjs','operation':'replace','beforeSHA256':'x','replacements':[{'before':'enabled:false','after':'enabled:true','count':1}]})
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(Rejected,'unrelated delta'):f.prepare(p,BASE,ROOT,Path(d)/'out')
 def test_04_wrong_authority_or_reads_refused(self):
  for k,v in [('authority','AUTHORISATION_57'),('commandReads',True)]:
   p=dict(self.p,**{k:v})
   with tempfile.TemporaryDirectory() as d:
    path=Path(d)/'p.json';path.write_bytes(canonical(p))
    with self.assertRaises(Rejected):f.plan_at(path)
 def test_05_source_manifest_tampering_refused(self):
  p=dict(self.p,unifiedManifestSHA256='0'*64)
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(Rejected,'manifest changed'):f.prepare(p,BASE,ROOT,Path(d)/'out')
 def test_06_storefront_source_cannot_be_replaced(self):
  p=copy.deepcopy(self.p);p['changes'].append({'path':'index.html','operation':'replace'})
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(Rejected,'unrelated delta'):f.prepare(p,BASE,ROOT,Path(d)/'out')
 def native_response(self,path,changed=False):
  if path.startswith('/actions/runs/'):return {'head_sha':self.p['nativeAcceptance']['executionSource'],'status':'completed','conclusion':'success'}
  return {'merge_base_commit':{'sha':self.p['applicationSource']},'status':'ahead','files':[{'filename':'dist/admin/admin-auth.mjs' if changed else 'tests/command60/browser-entry.mjs','status':'modified'}]}
 def test_07_test_only_native_reuse_is_exact(self):
  self.assertTrue(f.unified_native_evidence(self.p,self.native_response)['applicationUnchanged'])
 def test_08_application_change_invalidates_reuse(self):
  with self.assertRaisesRegex(Rejected,'Application changed'):f.unified_native_evidence(self.p,lambda path:self.native_response(path,True))
 def test_09_wrong_native_execution_refused(self):
  with self.assertRaisesRegex(Rejected,'not successful'):f.unified_native_evidence(self.p,lambda path:{'head_sha':'0'*40,'status':'completed','conclusion':'success'})

if __name__=='__main__':unittest.main()
