"""Synthetic-only tests. Never open ANCHOR/private archive or any live service."""
import copy,io,json,os,socket,stat,subprocess,sys,tarfile,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/nightwatch'))
from payload import *
from delivery import deliver
from handoff import stage_handoff
from verify_uploaded_tar import verify_tar
from prepare import bounded_file,export_payload,prepare_archive,receipt
BASE='2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f'
SOURCE='4f09bd5b4d5109df6028a8dc0d00468512d9af1c'
NOW=1792938600
OLD=(ROOT/'dist/customer-ui.css').read_bytes()
NEW=(ROOT/'scripts/nightwatch/spectre.css').read_bytes()

def fixture():
    return Payload({'index.html':b'<html><head><link rel="stylesheet" href="/customer-ui.css?build=old"></head><body><h1>Fixture workshop</h1><p>Closed 17 October to 15 November 2026. Online tools remain available.</p><button disabled>Physical orders paused</button></body></html>',
        'customer-ui.css':OLD,'tools/index.html':b'<h1>Fictional online tool</h1><link rel="stylesheet" href="../customer-ui.css">',
        'operations/snapshot.json':b'{"fictional":true,"state":"ORDERS_PAUSED"}',
        'news/closure/index.html':b'<p>Fixture holiday notice</p>','assets/fictional.png':b'fictional binary fixture, never decoded','module.mjs':b'export const fictional=true;'},('.', 'assets','news','news/closure','operations','tools'))

def envelope(tar):
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as z:z.writestr('artifact.tar',tar)
    return out.getvalue()

def custom_tar(members):
    out=io.BytesIO()
    with tarfile.open(fileobj=out,mode='w',format=tarfile.USTAR_FORMAT) as tar:
        for info,body in members:tar.addfile(info,io.BytesIO(body) if body else None)
    return out.getvalue()

def entry(name,data=b'fixture',kind=tarfile.REGTYPE,mode=0o644):
    i=tarfile.TarInfo(name);i.type=kind;i.mode=mode;i.size=len(data) if kind in (tarfile.REGTYPE,tarfile.AREGTYPE) else 0
    return i,data

def load(raw):return read_pages_zip(raw,sha(raw),len(raw))

class PayloadTests(unittest.TestCase):
    def test_fixture_round_trip_and_exact_file_manifest(self):
        f=fixture();r=load(pages_zip(f));self.assertEqual(r.manifest(),f.manifest());self.assertEqual(r.directories,f.directories)
    def test_deterministic_packaging(self):self.assertEqual(pages_zip(fixture()),pages_zip(fixture()))
    def test_original_digest_and_size_both_required(self):
        raw=pages_zip(fixture())
        for digest,size in [('0'*64,len(raw)),(sha(raw),len(raw)+1)]:
            with self.subTest(size=size),self.assertRaises(Rejected):read_pages_zip(raw,digest,size)
    def test_unsupported_zip_structure(self):
        out=io.BytesIO()
        with zipfile.ZipFile(out,'w') as z:z.writestr('index.html','not a Pages envelope')
        with self.assertRaises(Rejected):load(out.getvalue())
    def test_multiple_outer_members(self):
        out=io.BytesIO()
        with zipfile.ZipFile(out,'w') as z:z.writestr('artifact.tar',b'');z.writestr('extra',b'')
        with self.assertRaises(Rejected):load(out.getvalue())
    def test_zip_symlink(self):
        out=io.BytesIO();i=zipfile.ZipInfo('artifact.tar');i.external_attr=(stat.S_IFLNK|0o777)<<16
        with zipfile.ZipFile(out,'w') as z:z.writestr(i,b'target')
        with self.assertRaises(Rejected):load(out.getvalue())
    def test_zip_unsupported_compression(self):
        out=io.BytesIO()
        with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_BZIP2) as z:z.writestr('artifact.tar',b'')
        with self.assertRaises(Rejected):load(out.getvalue())
    def test_crc_corruption(self):
        out=io.BytesIO()
        with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_STORED) as z:z.writestr('artifact.tar',custom_tar([entry('index.html')]))
        data=bytearray(out.getvalue());data[data.find(b'fixture')]=ord('X')
        with self.assertRaises(Rejected):load(bytes(data))
    def test_expansion_ratio(self):
        with self.assertRaises(Rejected):load(envelope(b'0'*(2*1024*1024)))
    def test_tar_checksum(self):
        tar=bytearray(custom_tar([entry('index.html')]));tar[0]=ord('x')
        with self.assertRaises(Rejected):load(envelope(bytes(tar)))
    def test_tar_truncation(self):
        tar=custom_tar([entry('index.html')])
        with self.assertRaises(Rejected):load(envelope(tar[:700]))
    def test_tar_end_markers(self):
        tar=bytearray(custom_tar([entry('index.html')]));tar[1536]=1
        with self.assertRaises(Rejected):load(envelope(bytes(tar)))
    def test_tar_trailing_content(self):
        tar=custom_tar([entry('index.html')])+b'X'*512
        with self.assertRaises(Rejected):load(envelope(tar))
    def test_nonzero_file_padding(self):
        tar=bytearray(custom_tar([entry('index.html')]));tar[520]=1
        with self.assertRaises(Rejected):load(envelope(bytes(tar)))
    def test_file_directory_collision(self):
        with self.assertRaises(Rejected):load(envelope(custom_tar([entry('a/b'),entry('a')])))
    def test_duplicate_path(self):
        with self.assertRaises(Rejected):load(envelope(custom_tar([entry('a'),entry('a')])))
    def test_case_collision(self):
        with self.assertRaises(Rejected):load(envelope(custom_tar([entry('A'),entry('a')])))
    def test_file_bound(self):
        with patch('payload.MAX_FILE',4),self.assertRaises(Rejected):inventory({'index.html':b'12345'})
    def test_count_bound(self):
        with patch('payload.MAX_ENTRIES',1),self.assertRaises(Rejected):inventory({'a':b'','b':b''})
    def test_global_bound(self):
        with patch('payload.MAX_TAR',4),self.assertRaises(Rejected):inventory({'a':b'123','b':b'456'})
    def test_manifest_digest_binds_all_paths_and_bytes(self):
        f=fixture();b=dict(f.files);b['module.mjs']+=b'changed';self.assertNotEqual(f.digest(),payload_digest(b))
    def test_bundle_receipt_and_inner_hash(self):
        raw,r=make_bundle(fixture(),BASE,'rollback');self.assertEqual(verify_bundle(raw,r,sha(canonical(r))).digest(),fixture().digest())
        changed=copy.deepcopy(r);changed['files'][0]['sha256']='0'*64
        with self.assertRaises(Rejected):verify_bundle(raw,changed,sha(canonical(changed)))
        with self.assertRaises(Rejected):verify_bundle(raw,r,'0'*64)
    def test_boolean_receipt_version_is_not_integer_version(self):
        raw,r=make_bundle(fixture(),BASE,'rollback');r['version']=True
        with self.assertRaises(Rejected):verify_bundle(raw,r,sha(canonical(r)))
    def test_duplicate_json_key(self):
        with self.assertRaises(Rejected):strict_json(b'{"a":1,"a":2}')
    def test_nonfinite_json(self):
        with self.assertRaises(Rejected):strict_json(b'{"a":NaN}')
    def test_source_and_bundle_role(self):
        for source,kind in [('main','release'),(BASE,'other')]:
            with self.subTest(source=source),self.assertRaises(Rejected):make_bundle(fixture(),source,kind)

for name in ['../a','/a','a/../b','a//b','a/./b','C:/a','a\\b','a?x','a#x','a\x00b','e\u0301.html','a/'*33+'x','.git/config','.github/workflows/x']:
    def test_path(self,value=name):
        with self.assertRaises(Rejected):safe_path(value)
    setattr(PayloadTests,'test_unsafe_path_'+str(len(PayloadTests.__dict__)),test_path)
for kind in [tarfile.SYMTYPE,tarfile.LNKTYPE,tarfile.CHRTYPE,tarfile.BLKTYPE,tarfile.FIFOTYPE,tarfile.GNUTYPE_SPARSE,tarfile.XHDTYPE]:
    def test_type(self,value=kind):
        # USTAR fixture writes the raw header type without following a link.
        i=tarfile.TarInfo('unsafe');i.type=value
        with self.assertRaises(Rejected):load(envelope(i.tobuf(format=tarfile.USTAR_FORMAT)+b'\0'*1024))
    setattr(PayloadTests,'test_unsafe_tar_type_'+str(len(PayloadTests.__dict__)),test_type)

class OverlayTests(unittest.TestCase):
    def test_only_exact_css_and_cache_links_change(self):
        f=fixture();a,d=assemble_spectre(f,NEW)
        self.assertEqual({x['path'] for x in d},{'customer-ui.css','index.html','tools/index.html'})
        for p in ['operations/snapshot.json','news/closure/index.html','assets/fictional.png','module.mjs']:self.assertEqual(a.files[p],f.files[p])
        self.assertIn(b'Closed 17 October to 15 November',a.files['index.html'])
    def test_wrong_css_rejected(self):
        with self.assertRaises(Rejected):assemble_spectre(fixture(),NEW+b'/* changed */')
    def test_baseline_css_drift(self):
        f=fixture();f.files['customer-ui.css']+=b' '
        with self.assertRaises(Rejected):assemble_spectre(f,NEW)
    def test_no_added_or_missing_files(self):
        f=fixture();a,_=assemble_spectre(f,NEW);a.files['unexpected']=b'new'
        with self.assertRaises(Rejected):verify_overlay(f,a,NEW)
    def test_unapproved_holiday_edit_rejected(self):
        f=fixture();a,_=assemble_spectre(f,NEW);a.files['operations/snapshot.json']=b'{"state":"OPEN"}'
        with self.assertRaises(Rejected):verify_overlay(f,a,NEW)
    def test_no_arbitrary_html_change(self):
        f=fixture();a,_=assemble_spectre(f,NEW);a.files['index.html']+=b'new copy'
        with self.assertRaises(Rejected):verify_overlay(f,a,NEW)
    def test_no_duplicate_cache_marker(self):
        p=b'<link rel="stylesheet" href="/customer-ui.css?nw=old&amp;build=prior">';q=stamp_css(p,'index.html');self.assertEqual(q.count(b'nw='),1);self.assertIn(b'&amp;nw=',q);self.assertEqual(stamp_css(q,'index.html'),q)
    def test_existing_query_escapes_remain_byte_exact(self):
        p=b'<link rel="stylesheet" href="/customer-ui.css?v=a%20b&amp;literal=%2f#styles">'
        q=stamp_css(p,'index.html');self.assertIn(b'v=a%20b&amp;literal=%2f&amp;nw=',q);self.assertTrue(q.endswith(b'#styles">'))
    def test_script_and_comment_literals_unchanged(self):
        p=b'<script>const a=\'<link rel="stylesheet" href="/customer-ui.css">\';</script><!-- <link rel="stylesheet" href="/customer-ui.css"> -->'
        self.assertEqual(stamp_css(p,'index.html'),p)
    def test_external_css_reference_requires_review(self):
        with self.assertRaises(Rejected):stamp_css(b'<link rel="stylesheet" href="https://example.invalid/customer-ui.css">','index.html')
    def test_unquoted_css_link_requires_review(self):
        with self.assertRaises(Rejected):stamp_css(b'<link rel=stylesheet href=/customer-ui.css>','index.html')
    def test_uppercase_and_self_closing_link(self):
        self.assertIn(NEW_CSS.encode(),stamp_css(b'<LINK REL="stylesheet" HREF="/customer-ui.css" />','index.html'))

class FakePages:
    backend_independent=True;route_id='synthetic-pages-v1';simulated=True
    def __init__(self,state):self.state=copy.deepcopy(state);self.calls=[];self.fail=None;self.change_on_second=None;self.readback_drift=False;self.observations=0
    def snapshot(self):
        self.observations+=1
        if self.observations==2 and self.change_on_second:self.state.update(self.change_on_second)
        return copy.deepcopy(self.state)
    def deploy(self,raw,receipt,op):
        self.calls.append((sha(raw),op))
        if self.fail:raise TimeoutError('synthetic lost reply')
        self.state.update(deploymentId='synthetic-deployment-next',payloadDigest=receipt['payloadDigest'],sourceCommit=receipt['sourceCommit'])
        return self.state['deploymentId']
    def readback(self,identity):
        result=copy.deepcopy(self.state)
        if self.readback_drift:result['holidayMode']=False
        return result

class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.base=fixture();self.candidate,_=assemble_spectre(self.base,NEW)
        self.release,self.rr=make_bundle(self.candidate,SOURCE,'release');self.rollback,self.br=make_bundle(self.base,BASE,'rollback')
        self.state={'deploymentId':'synthetic-deployment-old','sourceCommit':BASE,'payloadDigest':self.base.digest(),'holidayEvidenceSHA256':'a'*64,'holidayMode':True,'physicalOrdersPaused':True,'onlineToolsAvailable':True,'closureWindow':['2026-10-17','2026-11-15'],'observedAt':NOW,'competingPublishers':0}
        self.port=FakePages(self.state)
        self.approval={'visualApproved':True,'productionApproved':True,'approvalRef':'SYNTHETIC-ONLY-NO-AUTHORITY','operationId':'fictional-release-1','operation':'release','expiresAt':NOW+60,'releaseReceiptSHA256':sha(canonical(self.rr)),'rollbackReceiptSHA256':sha(canonical(self.br)),'holidayEvidenceSHA256':'a'*64,'routeId':self.port.route_id,'expectedActive':{k:self.state[k] for k in ['deploymentId','sourceCommit','payloadDigest']}}
    def run_delivery(self):return deliver(release_raw=self.release,release_receipt=self.rr,rollback_raw=self.rollback,rollback_receipt=self.br,approval=self.approval,port=self.port,journal_dir=self.temp.name,now=NOW)
    def test_release_and_complete_payload_restore(self):
        result=self.run_delivery();self.assertEqual(result['state'],'CONFIRMED');self.assertTrue(result['simulated'])
        self.approval.update(operation='restore',operationId='fictional-restore-2',expectedActive={k:self.port.state[k] for k in ['deploymentId','sourceCommit','payloadDigest']})
        result=self.run_delivery();self.assertEqual(result['payloadDigest'],self.base.digest());self.assertEqual(len(self.port.calls),2)
    def test_missing_visual_approval_blocks(self):
        self.approval['visualApproved']=False
        with self.assertRaises(Rejected):self.run_delivery()
        self.assertEqual(self.port.calls,[])
    def test_missing_production_approval_blocks(self):
        self.approval['productionApproved']=False
        with self.assertRaises(Rejected):self.run_delivery()
        self.assertEqual(self.port.calls,[])
    def test_expired_approval_blocks(self):
        self.approval['expiresAt']=NOW
        with self.assertRaises(Rejected):self.run_delivery()
    def test_stale_current_state_blocks(self):
        self.port.state['observedAt']=NOW-301
        with self.assertRaises(Rejected):self.run_delivery()
    def test_future_observation_blocks(self):
        self.port.state['observedAt']=NOW+1
        with self.assertRaises(Rejected):self.run_delivery()
    def test_wrong_active_payload_blocks(self):
        self.port.state['payloadDigest']='0'*64
        with self.assertRaises(Rejected):self.run_delivery()
    def test_wrong_active_source_blocks(self):
        self.port.state['sourceCommit']='0'*40
        with self.assertRaises(Rejected):self.run_delivery()
    def test_unknown_active_deployment_identity_never_authorises_publish(self):
        for value in [None,'',0]:
            with self.subTest(value=value):
                self.approval['expectedActive']['deploymentId']=value;self.port.state['deploymentId']=value
                with self.assertRaises(Rejected):self.run_delivery()
        self.assertEqual(self.port.calls,[])
    def test_wrong_active_deployment_blocks(self):
        self.port.state['deploymentId']='other'
        with self.assertRaises(Rejected):self.run_delivery()
    def test_unknown_holiday_blocks(self):
        self.port.state['holidayMode']=None
        with self.assertRaises(Rejected):self.run_delivery()
    def test_orders_unpaused_blocks(self):
        self.port.state['physicalOrdersPaused']=False
        with self.assertRaises(Rejected):self.run_delivery()
    def test_tools_unavailable_blocks(self):
        self.port.state['onlineToolsAvailable']=False
        with self.assertRaises(Rejected):self.run_delivery()
    def test_closure_window_drift_blocks(self):
        self.port.state['closureWindow']=['2026-10-17','2026-11-14']
        with self.assertRaises(Rejected):self.run_delivery()
    def test_holiday_digest_drift_blocks(self):
        self.port.state['holidayEvidenceSHA256']='b'*64
        with self.assertRaises(Rejected):self.run_delivery()
    def test_competing_publisher_blocks(self):
        self.port.state['competingPublishers']=1
        with self.assertRaises(Rejected):self.run_delivery()
    def test_second_observation_drift_blocks(self):
        self.port.change_on_second={'payloadDigest':'f'*64}
        with self.assertRaises(Rejected):self.run_delivery()
        self.assertEqual(self.port.calls,[])
    def test_local_lock_blocks(self):
        (Path(self.temp.name)/'pages.lock').mkdir()
        with self.assertRaises(Rejected):self.run_delivery()
        self.assertEqual(self.port.calls,[])
    def test_route_mismatch_blocks(self):
        self.approval['routeId']='unreviewed'
        with self.assertRaises(Rejected):self.run_delivery()
    def test_receipt_tampering_blocks(self):
        self.rr['archiveBytes']+=1
        with self.assertRaises(Rejected):self.run_delivery()
    def test_unrelated_candidate_scope_blocks(self):
        self.candidate.files['module.mjs']+=b'changed';self.release,self.rr=make_bundle(self.candidate,SOURCE,'release');self.approval['releaseReceiptSHA256']=sha(canonical(self.rr))
        with self.assertRaises(Rejected):self.run_delivery()
        self.assertEqual(self.port.calls,[])
    def test_uncertain_attempt_not_retried(self):
        self.port.fail=True
        with self.assertRaises(Rejected):self.run_delivery()
        with self.assertRaises(Rejected):self.run_delivery()
        self.assertEqual(len(self.port.calls),1);self.assertEqual(json.loads((Path(self.temp.name)/'fictional-release-1.json').read_text())['state'],'UNCERTAIN')
    def test_postpublication_holiday_drift_is_uncertain(self):
        self.port.readback_drift=True
        with self.assertRaises(Rejected):self.run_delivery()
        self.assertEqual(len(self.port.calls),1)
        self.assertEqual(json.loads((Path(self.temp.name)/'fictional-release-1.json').read_text())['state'],'UNCERTAIN')
    def test_no_default_port(self):
        self.port=None
        with self.assertRaises(Rejected):self.run_delivery()

class FileToolsTests(unittest.TestCase):
    def test_refuse_input_symlink(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'real').write_bytes(b'a');(p/'link').symlink_to(p/'real')
            with self.assertRaises(OSError):bounded_file(p/'link',10)
    def test_export_roundtrip_and_no_overwrite(self):
        f=fixture();raw,r=make_bundle(f,BASE,'rollback')
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'payload.zip').write_bytes(raw);(p/'receipt.json').write_bytes(canonical(r));export_payload(p/'payload.zip',p/'receipt.json',sha(canonical(r)),p/'export')
            self.assertEqual({n:(p/'export'/n).read_bytes() for n in f.files},f.files)
            with self.assertRaises(FileExistsError):export_payload(p/'payload.zip',p/'receipt.json',sha(canonical(r)),p/'export')
    def test_export_preserves_empty_directories(self):
        f=fixture();f=Payload(f.files,tuple(sorted(f.directories+('empty',))))
        raw,r=make_bundle(f,BASE,'rollback')
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'payload.zip').write_bytes(raw);(p/'receipt.json').write_bytes(canonical(r));export_payload(p/'payload.zip',p/'receipt.json',sha(canonical(r)),p/'export');self.assertTrue((p/'export/empty').is_dir())
    def test_wrong_receipt_cannot_export(self):
        f=fixture();raw,r=make_bundle(f,BASE,'rollback')
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'payload.zip').write_bytes(raw);(p/'receipt.json').write_bytes(canonical(r))
            with self.assertRaises(Rejected):export_payload(p/'payload.zip',p/'receipt.json','0'*64,p/'export')
            self.assertFalse((p/'export').exists())
    def test_prepare_missing_approval_does_not_open_baseline(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'approval.json').write_bytes(b'{}')
            with self.assertRaises(Rejected):prepare_archive(p/'MUST-NOT-OPEN',p/'approval.json',ROOT/'scripts/nightwatch/spectre.css',SOURCE,p/'out',now=NOW)
    def test_oversized_approval(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'approval.json').write_bytes(b' '*16385)
            with self.assertRaises(Rejected):prepare_archive(p/'MUST-NOT-OPEN',p/'approval.json',ROOT/'scripts/nightwatch/spectre.css',SOURCE,p/'out',now=NOW)

class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.p=Path(self.temp.name)
        self.raw=pages_zip(fixture());(self.p/'fixture.zip').write_bytes(self.raw)
        self.approval={'scope':'NIGHTWATCH_ARCHIVE_READ_AND_LOCAL_VISUAL_REVIEW','ownerConfirmed':True,'approvalRef':'SYNTHETIC-FIXTURE-ONLY','archiveSHA256':sha(self.raw),'archiveBytes':len(self.raw),'expiresAt':NOW+3600,'artifactId':12590914632,'maxOriginalReadBytes':MAX_ZIP,'allowImageDecoding':False}
    def prepare(self):
        (self.p/'approval.json').write_bytes(canonical(self.approval))
        with patch('prepare.ANCHOR_SHA',sha(self.raw)),patch('prepare.ANCHOR_BYTES',len(self.raw)):
            return prepare_archive(self.p/'fixture.zip',self.p/'approval.json',ROOT/'scripts/nightwatch/spectre.css',SOURCE,self.p/'candidate',now=NOW)
    def test_complete_synthetic_handoff_and_full_rollback_bytes(self):
        result=self.prepare();self.assertFalse(result['productionReady']);self.assertFalse(result['ownerVisualApproved']);self.assertEqual(result['imagesDecoded'],0)
        self.assertEqual((self.p/'candidate/rollback-original.zip').read_bytes(),self.raw)
        self.assertEqual((self.p/'fixture.zip').read_bytes(),self.raw)
        r=strict_json((self.p/'candidate/release-receipt.json').read_bytes());b=verify_bundle((self.p/'candidate/candidate.zip').read_bytes(),r,result['releaseReceiptSHA256']);self.assertEqual(set(b.files),set(fixture().files))
    def test_expired_archive_approval_cannot_read_payload(self):
        self.approval['expiresAt']=NOW
        with self.assertRaises(Rejected):self.prepare()
        self.assertFalse((self.p/'candidate').exists())
    def test_changed_artifact_identity_rejected(self):
        self.approval['artifactId']=123
        with self.assertRaises(Rejected):self.prepare()
    def test_changed_archive_read_budget_rejected(self):
        self.approval['maxOriginalReadBytes']=MAX_ZIP*2
        with self.assertRaises(Rejected):self.prepare()
    def test_image_decoding_not_part_of_package_preparation(self):
        self.approval['allowImageDecoding']=True
        with self.assertRaises(Rejected):self.prepare()
    def test_archive_approval_does_not_authorise_publication(self):
        result=self.prepare();self.assertEqual(result['productionRoute'],'UNINSTALLED TEMPLATE ONLY');self.assertIn('BLOCK PRODUCTION',result['holidayCurrentState'])
    def test_owner_confirmation_required(self):
        self.approval['ownerConfirmed']=False
        with self.assertRaises(Rejected):self.prepare()
    def test_read_budget_is_checked_on_file_open(self):
        with self.assertRaises(Rejected):bounded_file(self.p/'fixture.zip',1)
    def test_package_output_no_overwrite(self):
        self.prepare()
        with self.assertRaises(FileExistsError):self.prepare()

class HandoffTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.p=Path(self.temp.name);self.h=self.p/'handoff';self.h.mkdir()
        base=fixture();candidate,_=assemble_spectre(base,NEW);release,rr=make_bundle(candidate,SOURCE,'release');rollback,br=make_bundle(base,BASE,'rollback')
        for name,data in {'release.zip':release,'rollback.zip':rollback,'release-receipt.json':canonical(rr),'rollback-receipt.json':canonical(br)}.items():(self.h/name).write_bytes(data)
        state={'deploymentId':'fixture-old','sourceCommit':BASE,'payloadDigest':base.digest(),'holidayEvidenceSHA256':'a'*64,'holidayMode':True,'physicalOrdersPaused':True,'onlineToolsAvailable':True,'closureWindow':['2026-10-17','2026-11-15'],'observedAt':NOW,'competingPublishers':0}
        self.approval={'scope':'NIGHTWATCH_EXACT_PRODUCTION_RELEASE','visualApproved':True,'productionApproved':True,'restorationProcedureAccepted':True,'rollbackRetentionVerified':True,'operation':'release','sharedConcurrencyGroup':'pages','toolingCommit':SOURCE,'expiresAt':NOW+60,'approvalRef':'SYNTHETIC-ONLY','releaseReceiptSHA256':sha(canonical(rr)),'rollbackReceiptSHA256':sha(canonical(br)),'readbackPlanSHA256':'b'*64,'holidayEvidenceSHA256':'a'*64,'expectedActive':{k:state[k] for k in ['deploymentId','sourceCommit','payloadDigest']},'currentEvidence':state}
    def stage(self,approved_digest=None):
        (self.h/'approval.json').write_bytes(canonical(self.approval))
        return stage_handoff(self.h,approved_digest or sha(canonical(self.approval)),'release',self.p/'site',SOURCE,now=NOW)
    def test_valid_handoff_exports_exact_candidate(self):
        result=self.stage();self.assertFalse(result['liveReleaseVerified']);self.assertIn('EXTERNAL ATTESTATION',result['currentStateEvidence']);self.assertEqual((self.p/'site/customer-ui.css').read_bytes(),NEW)
    def test_owner_pinned_digest_required(self):
        with self.assertRaises(Rejected):self.stage('0'*64)
    def test_reject_extra_handoff_file(self):
        (self.h/'surprise').write_bytes(b'new')
        with self.assertRaises(Rejected):self.stage()
    def test_unknown_current_deployment_identity_blocks_handoff(self):
        self.approval['expectedActive']['deploymentId']=None;self.approval['currentEvidence']['deploymentId']=None
        with self.assertRaises(Rejected):self.stage()
        self.assertFalse((self.p/'site').exists())
    def test_reject_missing_restore_acceptance(self):
        self.approval['restorationProcedureAccepted']=False
        with self.assertRaises(Rejected):self.stage()
    def test_reject_missing_durable_rollback(self):
        self.approval['rollbackRetentionVerified']=False
        with self.assertRaises(Rejected):self.stage()
    def test_reject_unshared_concurrency(self):
        self.approval['sharedConcurrencyGroup']='other'
        with self.assertRaises(Rejected):self.stage()
    def test_reject_wrong_tooling_commit(self):
        self.approval['toolingCommit']='0'*40
        with self.assertRaises(Rejected):self.stage()
    def test_reject_unverified_holiday(self):
        self.approval['currentEvidence']['holidayMode']=None
        with self.assertRaises(Rejected):self.stage()
    def test_reject_stale_holiday(self):
        self.approval['currentEvidence']['observedAt']=NOW-301
        with self.assertRaises(Rejected):self.stage()
    def test_reject_missing_postdeploy_plan(self):
        del self.approval['readbackPlanSHA256']
        with self.assertRaises(Rejected):self.stage()
    def test_staging_not_equated_to_publication(self):
        result=self.stage();self.assertFalse(result['productionAuthority']);self.assertFalse(result['liveReleaseVerified'])

class UploadTarTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.p=Path(self.temp.name)
        self.f=fixture();self.raw,self.receipt=make_bundle(self.f,BASE,'rollback');self.digest=sha(canonical(self.receipt));(self.p/'receipt.json').write_bytes(canonical(self.receipt))
        with zipfile.ZipFile(io.BytesIO(self.raw)) as z:(self.p/'artifact.tar').write_bytes(z.read('artifact.tar'))
    def test_original_upload_tar_verified(self):
        result=verify_tar(self.p/'artifact.tar',self.p/'receipt.json',self.digest);self.assertEqual(result['files'],len(self.f.files));self.assertIn('NOT LIVE',result['verification'])
    def test_repacked_changed_file_rejected(self):
        changed=dict(self.f.files);changed['module.mjs']+=b'changed';raw=pages_zip(Payload(changed,self.f.directories))
        with zipfile.ZipFile(io.BytesIO(raw)) as z:(self.p/'artifact.tar').write_bytes(z.read('artifact.tar'))
        with self.assertRaises(Rejected):verify_tar(self.p/'artifact.tar',self.p/'receipt.json',self.digest)
    def test_repacked_missing_empty_directory_rejected(self):
        self.receipt['directories'].append('empty');(self.p/'receipt.json').write_bytes(canonical(self.receipt))
        with self.assertRaises(Rejected):verify_tar(self.p/'artifact.tar',self.p/'receipt.json',sha(canonical(self.receipt)))
    def test_unpinned_tar_receipt_rejected(self):
        with self.assertRaises(Rejected):verify_tar(self.p/'artifact.tar',self.p/'receipt.json','0'*64)
    def test_pages_upload_gnu_tar_repack_preserves_complete_payload(self):
        (self.p/'payload.zip').write_bytes(self.raw);export_payload(self.p/'payload.zip',self.p/'receipt.json',self.digest,self.p/'site')
        subprocess.run(['/usr/bin/tar','--dereference','--hard-dereference','--directory',str(self.p/'site'),'-cf',str(self.p/'gnu.tar'),'--exclude=.git','--exclude=.github','.'],check=True,env={'PATH':'/usr/bin:/bin','LC_ALL':'C'})
        result=verify_tar(self.p/'gnu.tar',self.p/'receipt.json',self.digest);self.assertEqual(result['payloadDigest'],self.f.digest())
    def test_pages_root_required(self):
        with self.assertRaises(Rejected):load(envelope(custom_tar([entry('other.html')])))

if __name__=='__main__':
    # All cases are offline; any accidental connect fails instead of reaching a service.
    def denied(*args,**kwargs):raise AssertionError('Network prohibited in synthetic acceptance')
    with patch('socket.socket.connect',denied),patch('socket.socket.connect_ex',denied),patch('socket.create_connection',denied):unittest.main(verbosity=2)
