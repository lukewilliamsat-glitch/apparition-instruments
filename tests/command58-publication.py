"""Only AUTHORISATION 58's added publisher scope and complete release boundaries."""
import copy,json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts/command-release'))
import frontend_release as f
from archive_core import _read_tar,Rejected,sha,canonical
PLAN=ROOT/'docs/releases/triple-strike/current.json'
BASE=ROOT.parent/'command58-private/baseline'
class CommandPublication(unittest.TestCase):
 def setUp(self):self.p=f.plan_at(PLAN)
 def test_01_exact_overlay_and_every_unrelated_byte(self):
  with tempfile.TemporaryDirectory() as d:
   r=f.prepare(self.p,BASE,ROOT,Path(d)/'out')
   self.assertEqual(r['candidateFiles'],445);self.assertEqual(r['unchangedFiles'],411)
   before=_read_tar((BASE/'artifact.tar').read_bytes());after=f.tree_payload(Path(d)/'out/candidate')
   for k,v in before.files.items():
    if not k.startswith('admin/'):self.assertEqual(after.files[k],v,k)
   self.assertEqual(f.tree_payload(Path(d)/'out/rollback').digest(),before.digest())
 def test_02_wrong_authority_rejected(self):
  p=dict(self.p,authority='AUTHORISATION_57')
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'plan.json';path.write_bytes(canonical(p))
   with self.assertRaisesRegex(Rejected,'authority'):f.plan_at(path)
 def test_03_no_overlay_path_substitution(self):
  p=copy.deepcopy(self.p);p['changes'][0]['source']='dist/admin/admin.mjs'
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(Rejected,'source delta'):f.prepare(p,BASE,ROOT,Path(d)/'out')
 def test_04_no_write_activation_substitution(self):
  p=copy.deepcopy(self.p);c=next(c for c in p['changes'] if c['path']=='admin/command/read-activation.mjs');c['afterSHA256']='0'*64
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(Rejected,'source delta'):f.prepare(p,BASE,ROOT,Path(d)/'out')
 def test_05_no_unrelated_public_file(self):
  p=copy.deepcopy(self.p);p['changes'].append({'path':'index.html','operation':'replace'})
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(Rejected,'unrelated delta'):f.prepare(p,BASE,ROOT,Path(d)/'out')
 def test_06_activation_manifest_source_pinned(self):
  p=dict(self.p,visualAcceptedSource='0'*40)
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'plan.json';path.write_bytes(canonical(p))
   with self.assertRaisesRegex(Rejected,'accepted source'):f.plan_at(path)
if __name__=='__main__':unittest.main()
