import copy,io,json,sys,tempfile,unittest,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/command-release'))
from archive_core import Rejected,canonical,pages_zip,sha
from frontend import compose_frontend,stage,verify_tar,prior_identity,verify_live,exclude_proven_nonpublications,SITE
from test_compose import fixture

def frontend_fixture(root):
    base,overlay,m,_,_,_=fixture()
    base.files['interactive-tools/index.html']=b'Existing fictional online tools'
    overlay['admin/command/read-activation.mjs']=b'export const productionReadActivation=Object.freeze({\n enabled:false,\n inventoryRead:false,\n metadataEvidenceSHA256:null,\n liveReadEvidenceSHA256:null\n});\n'
    for e in m['entries']:e.update(afterSHA256=sha(overlay[e['path']]),bytes=len(overlay[e['path']]));
    digest=sha(canonical(m))
    with zipfile.ZipFile(io.BytesIO(pages_zip(base))) as z:raw=z.read('artifact.tar')
    src=root/'src';src.mkdir()
    for p,data in overlay.items():
        f=src/'dist'/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data)
    mp=root/'manifest.json';mp.write_bytes(canonical(m))
    base_dir=root/'base';base_dir.mkdir();(base_dir/'artifact.tar').write_bytes(raw)
    _,result,changes,tar,_=compose_frontend(raw,src,m,digest)
    plan={'applicationSource':m['sourceCommit'],'baseSource':m['baseSourceCommit'],'baseTarSHA256':sha(raw),'basePayloadDigest':base.digest(),'compiledManifestSHA256':digest,'candidateTarSHA256':sha(tar),'candidatePayloadDigest':result.digest(),'protectedReferences':{p:sha(base.files[p]) for p in __import__('compose').PROTECTED},'baseRunId':77}
    return base,src,mp,base_dir,plan,result,raw

class FrontendTests(unittest.TestCase):
    def test_disabled_frontend_preserves_every_unrelated_file_and_original_rollback(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);base,src,mp,bd,p,result,raw=frontend_fixture(root)
            r=stage(p,bd,src,mp,root/'out')
            self.assertFalse(r['productionReads']);self.assertFalse(r['productionWrites']);self.assertEqual(len(r['changedFiles']),21)
            self.assertEqual((root/'out/rollback/artifact.tar').read_bytes(),raw)
            for f,data in base.files.items():
                if f not in __import__('compose').ALLOWED:self.assertEqual(result.files[f],data)
            for k in ['release','rollback']:self.assertEqual(verify_tar(p,root/'out'/k,k)['originalTarReadback'],'PASS')

    def test_enabled_read_adapter_is_rejected_even_with_matching_source_hashes(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);_,src,mp,bd,p,_,_=frontend_fixture(root)
            f=src/'dist/admin/command/read-activation.mjs';f.write_bytes(f.read_bytes().replace(b'enabled:false',b'enabled:true'))
            m=json.loads(mp.read_text())
            for e in m['entries']:
                if e['path']=='admin/command/read-activation.mjs':e.update(afterSHA256=sha(f.read_bytes()),bytes=f.stat().st_size)
            self.assertRaisesRegex(Rejected,'disabled',compose_frontend,(bd/'artifact.tar').read_bytes(),src,m,sha(canonical(m)))

    def test_baseline_candidate_or_uploaded_byte_drift_fails_closed(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);_,src,mp,bd,p,_,_=frontend_fixture(root)
            wrong=copy.deepcopy(p);wrong['candidateTarSHA256']='0'*64
            self.assertRaises(Rejected,stage,wrong,bd,src,mp,root/'wrong')
            stage(p,bd,src,mp,root/'out');f=root/'out/release/artifact.tar';f.write_bytes(f.read_bytes()+b'changed')
            self.assertRaises(Rejected,verify_tar,p,f.parent,'release')

    def test_original_rollback_can_be_selected_without_recreating_website_content(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);_,_,_,bd,p,_,raw=frontend_fixture(root)
            self.assertEqual(verify_tar(p,bd,'rollback')['tarSHA256'],sha(raw))

    def test_previous_run_must_match_and_only_this_current_job_is_ignored(self):
        p={'baseRunId':77,'baseSource':'2'*40}
        prefix='https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/'
        old={'id':10,'sha':'2'*40,'latestStatus':{'state':'success','log_url':prefix+'77/job/1'}}
        current={'id':11,'sha':'3'*40,'latestStatus':{'state':'in_progress','log_url':prefix+'88/job/1'}}
        self.assertEqual(prior_identity(p,[old,current],88,'3'*40,'release',None)['id'],10)
        drift=copy.deepcopy(old);drift['latestStatus']['log_url']=prefix+'78/job/1'
        self.assertRaises(Rejected,prior_identity,p,[drift,current],88,'3'*40,'release',None)
        self.assertRaises(Rejected,prior_identity,p,[old,current],89,'3'*40,'release',None)

    def test_live_verification_is_static_bounded_and_never_claims_authenticated_reads(self):
        bodies={'/':b'home','/operations/snapshot.json':b'paused','/interactive-tools/':b'tools'}
        plan={'verificationFiles':{p:sha(b) for p,b in bodies.items()}}
        calls=[]
        def get(url,limit):
            self.assertTrue(url.startswith(SITE+'/'));self.assertLessEqual(limit,262144)
            path=url[len(SITE):].split('?')[0];calls.append(path);return bodies[path]
        r=verify_live(plan,get=get);self.assertEqual(r['requests'],3);self.assertFalse(r['productionReads']);self.assertEqual(r['authenticatedCatalogueAcceptance'],'NOT_CLAIMED_DISABLED')
        self.assertEqual(calls,list(bodies));bad=copy.deepcopy(plan);bad['verificationFiles']['/']='0'*64
        self.assertRaises(Rejected,verify_live,bad,get=get)

    def test_only_proven_skipped_pinned_failed_run_is_excluded(self):
        prefix='https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/'
        p={'nonPublishingFailedRuns':[{'runId':77,'jobId':99,'sourceCommit':'2'*40}]}
        d={'id':12,'sha':'2'*40,'latestStatus':{'state':'failure','log_url':prefix+'77/job/99'}}
        run={'head_sha':'2'*40,'status':'completed','conclusion':'failure'}
        names=['Publish this exact verified Pages artifact once','Restore the verified complete rollback on confirmed live verification failure']
        job={'id':99,'run_id':77,'conclusion':'failure','steps':[{'name':n,'conclusion':'skipped'} for n in names]}
        def get(path):return run if path=='/actions/runs/77' else job
        self.assertEqual(exclude_proven_nonpublications(p,[d],get),([],[77]))
        for state in ['success','failure','in_progress']:
            job['steps'][0]['conclusion']=state
            self.assertRaises(Rejected,exclude_proven_nonpublications,p,[d],get)
        job['steps'][0]['conclusion']='skipped';run['status']='in_progress'
        self.assertRaises(Rejected,exclude_proven_nonpublications,p,[d],get)
        other=copy.deepcopy(d);other['latestStatus']['log_url']=prefix+'78/job/100'
        self.assertEqual(exclude_proven_nonpublications(p,[other],get),([other],[]))

if __name__=='__main__':unittest.main()
