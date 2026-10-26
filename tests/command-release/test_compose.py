import copy,json,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/command-release'))
from archive_core import Payload,Rejected,canonical,pages_zip,sha,verify_bundle
from compose import ALLOWED,SHARED,PROTECTED,compose_overlay,prepare,acceptance_before_archive
NOW=1792969200

def fixture():
    files={'index.html':b'Fictional closure message; tools available.','news/current.html':b'Keep newer fictional news byte for byte.','assets/graphic.bin':b'\x00\x01not-decoded'}
    files.update({p:b'fictional protected runtime' for p in PROTECTED})
    files['operations/snapshot.json']=canonical({'store':{'state':'ORDERS_PAUSED','desired_state':'ORDERS_PAUSED'},'news':[]})
    files.update({p:('old '+p).encode() for p in SHARED})
    base=Payload(files);overlay={p:('new fictional '+p).encode() for p in ALLOWED}
    overlay['admin/command/read-activation.mjs']=b"export const productionReadActivation=Object.freeze({\n enabled:true,\n metadataEvidenceSHA256:'"+b'a'*64+b"',\n liveReadEvidenceSHA256:'"+b'b'*64+b"'\n});\n"
    manifest={'kind':'COMMAND_READONLY_SOURCE_OVERLAY_V1','sourceCommit':'1'*40,'baseSourceCommit':'2'*40,'entries':[{'path':p,'beforeSHA256':sha(files[p]) if p in files else None,'afterSHA256':sha(overlay[p]),'bytes':len(overlay[p])} for p in sorted(ALLOWED)]}
    digest=sha(canonical(manifest));raw=pages_zip(base)
    expected={'deploymentId':'FICTIONAL-DEPLOYMENT','payloadDigest':base.digest(),'sourceCommit':'2'*40}
    current={**expected,'holidayEvidenceSHA256':'c'*64,'holidayMode':True,'physicalOrdersPaused':True,'onlineToolsAvailable':True,'closureWindow':['2026-10-17','2026-11-15'],'observedAt':NOW,'competingPublishers':0}
    evidence={'version':1,'expectedActive':expected,'current':current,'metadataEvidenceSHA256':'a'*64,'liveReadEvidenceSHA256':'b'*64,'holidayEvidenceSHA256':'c'*64,'archiveAccess':{'scope':'COMMAND_CURRENT_BASELINE_READ_ONLY','approvalRef':'SYNTHETIC-FIXTURE-ONLY','maxReads':1,'expiresAt':NOW+600,'bytes':len(raw),'sha256':sha(raw)},'protectedReferences':{p:sha(files[p]) for p in PROTECTED}}
    return base,overlay,manifest,digest,raw,evidence

class ComposeTests(unittest.TestCase):
    def test_exact_overlay_preserves_every_unrelated_file(self):
        base,overlay,m,d,_,_=fixture();result,changes=compose_overlay(base,overlay,m,d)
        self.assertEqual(len(changes),21)
        for path,raw in base.files.items():
            if path not in ALLOWED:self.assertEqual(result.files[path],raw)
    def test_preimage_drift_is_rejected(self):
        base,o,m,d,_,_=fixture();base.files['admin/admin-auth.mjs']=b'newer installed Auth';self.assertRaises(Rejected,compose_overlay,base,o,m,d)
    def test_unreviewed_path_is_rejected(self):
        base,o,m,d,_,_=fixture();o['index.html']=b'change storefront';self.assertRaises(Rejected,compose_overlay,base,o,m,d)
    def test_missing_path_is_rejected(self):
        base,o,m,d,_,_=fixture();del o['admin/command/entry.mjs'];self.assertRaises(Rejected,compose_overlay,base,o,m,d)
    def test_source_hash_drift_is_rejected(self):
        base,o,m,d,_,_=fixture();o['admin/command/entry.mjs']=b'changed after acceptance';self.assertRaises(Rejected,compose_overlay,base,o,m,d)
    def test_manifest_identity_is_required(self):
        base,o,m,_,_,_=fixture();self.assertRaises(Rejected,compose_overlay,base,o,m,'0'*64)
    def test_new_file_collision_is_rejected(self):
        base,o,m,d,_,_=fixture();base.files['admin/command/index.html']=b'existing different work';self.assertRaises(Rejected,compose_overlay,base,o,m,d)
    def test_disabled_adapter_rejected_before_archive_open(self):
        _,o,m,_,_,e=fixture();o['admin/command/read-activation.mjs']=o['admin/command/read-activation.mjs'].replace(b'enabled:true',b'enabled:false')
        for entry in m['entries']:
            if entry['path']=='admin/command/read-activation.mjs':entry.update(afterSHA256=sha(o[entry['path']]),bytes=len(o[entry['path']]))
        self.assertRaisesRegex(Rejected,'disabled',prepare,baseline_path='/never-open-this',overlay=o,manifest=m,manifest_sha=sha(canonical(m)),evidence=e,out='/never-create-this',now=NOW)
    def test_fresh_current_identity_and_holiday_are_required(self):
        for change in [lambda e:e['current'].update(observedAt=NOW-301),lambda e:e['current'].update(competingPublishers=1),lambda e:e['current'].update(holidayMode=False),lambda e:e['current'].update(payloadDigest='0'*64),lambda e:e.update(liveReadEvidenceSHA256=None)]:
            _,o,m,d,_,e=fixture();change(e);self.assertRaises(Rejected,acceptance_before_archive,e,m,o,d,NOW)
    def test_exact_archive_authority_is_required(self):
        _,o,m,d,_,e=fixture();e['archiveAccess']['maxReads']=2;self.assertRaises(Rejected,acceptance_before_archive,e,m,o,d,NOW)
    def test_complete_release_and_original_rollback_are_verified(self):
        base,o,m,d,raw,e=fixture()
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);(p/'baseline.zip').write_bytes(raw);r=prepare(baseline_path=p/'baseline.zip',overlay=o,manifest=m,manifest_sha=d,evidence=e,out=p/'out',now=NOW)
            self.assertFalse(r['productionReady']);self.assertEqual((p/'out/rollback-original.zip').read_bytes(),raw)
            self.assertEqual(r['productionAuthorityRef'],'AUTHORISATION_55_AMENDMENT')
            self.assertFalse(r['requiresAdditionalOwnerDeploymentApproval']);self.assertTrue(r['requiresAllProductionGatesVerified'])
            for kind in ['release','rollback']:
                receipt=json.loads((p/'out'/f'{kind}-receipt.json').read_bytes());zipname='release.zip' if kind=='release' else 'rollback-original.zip';payload=verify_bundle((p/'out'/zipname).read_bytes(),receipt,sha(canonical(receipt)))
                self.assertEqual(payload.files['operations/snapshot.json'],base.files['operations/snapshot.json'])
    def test_open_static_snapshot_is_never_substituted_for_holiday(self):
        base,o,m,d,_,e=fixture();base.files['operations/snapshot.json']=canonical({'store':{'state':'OPEN'}});raw=pages_zip(base);e['archiveAccess'].update(bytes=len(raw),sha256=sha(raw));e['expectedActive']['payloadDigest']=base.digest();e['current']['payloadDigest']=base.digest();e['protectedReferences']['operations/snapshot.json']=sha(base.files['operations/snapshot.json'])
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);(p/'baseline.zip').write_bytes(raw);self.assertRaisesRegex(Rejected,'OPEN',prepare,baseline_path=p/'baseline.zip',overlay=o,manifest=m,manifest_sha=d,evidence=e,out=p/'out',now=NOW);self.assertFalse((p/'out').exists())
    def test_protected_runtime_reference_drift_is_rejected(self):
        _,o,m,d,raw,e=fixture();e['protectedReferences']['operations/public.mjs']='0'*64
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);(p/'baseline.zip').write_bytes(raw);self.assertRaisesRegex(Rejected,'Protected',prepare,baseline_path=p/'baseline.zip',overlay=o,manifest=m,manifest_sha=d,evidence=e,out=p/'out',now=NOW)
    def test_input_archive_is_unchanged(self):
        _,o,m,d,raw,e=fixture()
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);source=p/'baseline.zip';source.write_bytes(raw);prepare(baseline_path=source,overlay=o,manifest=m,manifest_sha=d,evidence=e,out=p/'out',now=NOW);self.assertEqual(source.read_bytes(),raw)

if __name__=='__main__':unittest.main()
