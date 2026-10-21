"""Synthetic byte fixtures only; never assembles a deployable website."""
import unittest,json,pathlib,importlib.util,hashlib,os,subprocess
HERE=pathlib.Path(__file__).resolve().parent;ROOT=HERE.parent.parent
spec=importlib.util.spec_from_file_location('contract',HERE/'release_contract.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
old=(HERE/'baseline-customer-ui.txt').read_bytes();new=(ROOT/'dist/customer-ui.css').read_bytes();replacements=json.loads((HERE/'replacements.json').read_text())
manifest=json.loads((ROOT/'docs/releases/spectre35-homecoming/RELEASE_MANIFEST.json').read_text())
fixture={'index.html':b'<title>SYNTHETIC</title>','customer-ui.css':old,'products/fixture/index.html':b'fixture product','components/index.html':b'fixture catalogue','wiring-kits/index.html':b'fixture kit','interactive-tools/index.html':b'fixture tools','basket/index.html':b'fixture shell','luthier-hub/fixture/index.html':b'fixture CMS','assets/fixture.png':b'synthetic asset bytes','site.mjs':b'/* synthetic */','sitemap.xml':b'<urlset/>'}
class ReleaseTests(unittest.TestCase):
 def test_01_original_hash(self):self.assertEqual(c.digest(old),c.OLD)
 def test_02_exact_guarded_extraction(self):self.assertEqual(c.extract_css(old,replacements),new)
 def test_03_corrected_hash(self):self.assertEqual(c.digest(new),c.NEW)
 def test_04_unexpected_baseline(self):self.assertRaises(ValueError,c.extract_css,old+b'/* newer */',replacements)
 def test_05_already_applied_rejected(self):self.assertRaises(ValueError,c.extract_css,new,replacements)
 def test_06_selector_mismatch(self):self.assertRaises(ValueError,c.extract_css,old,[[replacements[0][0]+'drift',replacements[0][1]]])
 def test_07_only_css_diff(self):c.css_only({'dist/customer-ui.css':'old','dist/site.mjs':'same'},{'dist/customer-ui.css':'new','dist/site.mjs':'same'})
 def test_08_unrelated_source_rejected(self):self.assertRaises(ValueError,c.css_only,{'dist/customer-ui.css':'old','dist/site.mjs':'same'},{'dist/customer-ui.css':'new','dist/site.mjs':'changed'})
 def test_09_extra_source_path_rejected(self):self.assertRaises(ValueError,c.css_only,{'dist/customer-ui.css':'old'},{'dist/customer-ui.css':'new','other':'extra'})
 def test_10_complete_relative_fixture(self):c.verify(fixture,c.inventory(fixture))
 def test_11_missing_product(self):self.check_missing('products/fixture/index.html')
 def test_12_missing_CMS(self):self.check_missing('luthier-hub/fixture/index.html')
 def test_13_missing_asset(self):self.check_missing('assets/fixture.png')
 def check_missing(self,key):f=fixture.copy();del f[key];self.assertRaises(ValueError,c.assemble,f,c.inventory(fixture),new)
 def test_14_unexpected_file(self):self.assertRaises(ValueError,c.verify,{**fixture,'extra.txt':b'x'},c.inventory(fixture))
 def test_15_wrong_asset_digest(self):self.assertRaises(ValueError,c.verify,{**fixture,'assets/fixture.png':b'changed'},c.inventory(fixture))
 def test_16_duplicate_manifest(self):self.assertRaises(ValueError,c.verify,fixture,c.inventory(fixture)*2)
 def test_17_unsafe_paths(self):
  for p in ['../a','/a','a//b','a/./b','a\\b','a?b','https://x/a']:
   with self.subTest(p=p):self.assertRaises(ValueError,c.inventory,{p:b'x'})
 def test_18_deterministic_assembly(self):
  a,receipt=c.assemble(fixture,c.inventory(fixture),new);b,again=c.assemble(dict(reversed(list(fixture.items()))),c.inventory(fixture),new);self.assertEqual(a,b);self.assertEqual(receipt,again)
 def test_19_protected_bytes_unchanged(self):
  a,_=c.assemble(fixture,c.inventory(fixture),new)
  for p in fixture:
   if p!=c.CSS:self.assertEqual(a[p],fixture[p])
 def test_20_exact_fixture_rollback(self):
  a,_=c.assemble(fixture,c.inventory(fixture),new);self.assertEqual(c.restore(a,c.inventory(a),old),fixture)
 def test_21_incomplete_rollback_rejected(self):
  a,_=c.assemble(fixture,c.inventory(fixture),new);bad=a.copy();del bad['site.mjs'];self.assertRaises(ValueError,c.restore,bad,c.inventory(a),old)
 def test_22_production_remains_blocked(self):self.assertGreaterEqual(len(c.blockers(manifest)),7);self.assertEqual(manifest['status'],'BLOCKED — NOT DEPLOYED');self.assertFalse(manifest['CSSOnlyCandidate']['deployable'])
 def test_23_repository_inventory_not_live_attestation(self):
  inv=manifest['sourceInventory'];self.assertEqual(len(inv['entries']),416);self.assertEqual(sum(r['path'].endswith('.html') for r in inv['entries']),94);self.assertIsNone(manifest['authoritativePublicationInventory'])
 def test_24_workflow_identity(self):
  b=(ROOT/'.github/workflows/static.yml').read_bytes();self.assertEqual(hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),'a43d31b3d7371d02fe016a57a19a2690ceb0ea86')
 def test_25_static_only_does_not_skip_CMS(self):
  workflow=(ROOT/'.github/workflows/static.yml').read_text();block=workflow.split('- name: Generate CMS published articles\n')[1].split('- name:',1)[0];self.assertNotIn('if:',block);self.assertIn('node scripts/generate-hub-cms.mjs',block);self.assertIn("fetch(publicBackendConfig.url+'/rest/v1/rpc/public_hub_articles'",(ROOT/'scripts/generate-hub-cms.mjs').read_text())
 def test_26_no_secrets_in_process_environment(self):self.assertFalse(any(any(v in k.upper() for v in ['TOKEN','SECRET','PASSWORD','SUPABASE','STRIPE','PROXY']) for k in os.environ))
 def test_27_real_git_scope_when_in_CI(self):
  if not (ROOT/'.git').exists():self.skipTest('Local partial materialisation; full Git proof executed in CI')
  base=manifest['productionMain']['commit'];candidate=manifest['CSSOnlyCandidate']['commit'];tree=manifest['CSSOnlyCandidate']['tree']
  git=lambda *args:subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
  self.assertEqual(git('rev-parse',candidate+'^{tree}'),tree);self.assertEqual(git('diff','--name-only',base,candidate),'dist/customer-ui.css');self.assertEqual(git('diff','--name-only',base,'HEAD','--','dist/'),'dist/customer-ui.css')
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(ReleaseTests));output=os.environ.get('HC36_OUTPUT')
 record={'status':'PASS' if result.wasSuccessful() else 'FAIL','tests':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'skipped':len(result.skipped),'runtime':os.sys.version,'sourceCSSSHA256':c.digest(new),'fixtureFiles':len(fixture),'productionGateBlockers':c.blockers(manifest),'scope':'Synthetic manifest/assembly/rollback checks; not current production certification'}
 if output:pathlib.Path(output).write_text(json.dumps(record,indent=2)+'\n')
 print(json.dumps(record));raise SystemExit(0 if result.wasSuccessful() else 1)
