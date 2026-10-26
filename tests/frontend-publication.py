"""Targeted new publisher boundary checks; no live requests or application reruns."""
import copy,io,json,os,re,subprocess,sys,tempfile,unittest
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts/command-release'))
import frontend_release as f
from archive_core import Payload,Rejected,canonical,pages_zip,sha,_read_tar
import zipfile

SHA='1'*40
BASE='2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f'

class Publisher(unittest.TestCase):
    def setUp(self):
        self.env=dict(os.environ)
        os.environ.update(GITHUB_REPOSITORY='lukewilliamsat-glitch/apparition-instruments',GITHUB_REF='refs/heads/main',GITHUB_SHA=SHA,GITHUB_RUN_ID='999')
        self.p=f.plan_at(ROOT/'docs/releases/triple-strike/release1-plan.json')
        self.payload={path:b'fictional '+path.encode() for path in self.p['baselineVerification']}
        self.p['baselineVerification']={path:sha(data) for path,data in self.payload.items()}
        self.events=[(7,SHA,999,None),(6,'c598a7fcea1ad4fc741969e3a3ab9ff7c33b5039',40321193513,121566246932),(5,'0c102c72e63ebd5d6232803c5b9019942fd55853',40311358554,123),(4,'0c102c72e63ebd5d6232803c5b9019942fd55853',40311358554,121533058543),(3,'ee620b5277e009d450800735f0fe4543182896aa',40310242181,121529304330),(2,BASE,40292065655,None)]
        self.wrongMain=False;self.competing=False;self.badLog=False;self.badPublic=False;self.noBase=False;self.wrongPages=False
    def tearDown(self):os.environ.clear();os.environ.update(self.env)
    def read(self,path):
        prefix='https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/'
        if path=='/git/ref/heads/main':return {'object':{'sha':'9'*40 if self.wrongMain else SHA}}
        if path=='/pages':return {'build_type':'legacy' if self.wrongPages else 'workflow','html_url':f.SITE+'/','https_enforced':True}
        if path.startswith('/actions/runs?'):return {'workflow_runs':[{'id':888,'head_branch':'main'}] if self.competing and 'in_progress' in path else []}
        if path.startswith('/deployments?'):return [{'id':i,'sha':s,'environment':'github-pages'} for i,s,r,j in self.events if not (self.noBase and r==40292065655)]
        m=re.fullmatch(r'/deployments/(\d+)/statuses\?per_page=1',path)
        if m:
            i,s,r,j=next(v for v in self.events if v[0]==int(m[1]));return [{'state':'success' if r==40292065655 else 'in_progress' if r==999 else 'failure','log_url':prefix+str(r)+(('/job/'+str(j)) if j else '')}]
        m=re.fullmatch(r'/actions/runs/(\d+)',path)
        if m:
            i,s,r,j=next(v for v in self.events if v[2]==int(m[1]));return {'head_sha':s,'status':'completed','conclusion':'failure'}
        m=re.fullmatch(r'/actions/jobs/(\d+)',path)
        if m:
            job=int(m[1]);k=next(v for v in self.p['knownFailedPublications'] if v['jobId']==job or (job==123 and v['runId']==40311358554))
            return {'run_id':k['runId'],'conclusion':'failure','steps':[{'name':k['deployStep'],'conclusion':'skipped' if job==123 or k['kind']=='preflight' else 'failure'},{'name':k['restoreStep'],'conclusion':'skipped'}]}
        if path.startswith('/__test_log/'):
            k=next(v for v in self.p['knownFailedPublications'] if str(v['jobId'])==path.split('/')[-1]);return 'Created deployment for '+k['source']+', ID: '+k['source']+'\n##[error]Deployment failed, try again later.'+('Reported success!' if self.badLog else '')
        raise AssertionError('Unexpected metadata request '+path)
    def public(self,url,limit):
        path=url.removeprefix(f.SITE).split('release57=')[0].rstrip('?&');return b'changed' if self.badPublic else self.payload[path]
    def check(self):return f.preflight(self.p,get=self.read,public_get=self.public)
    def test_01_exact_baseline_after_proven_failed_records(self):
        value=self.check();self.assertEqual(value['base']['runId'],40292065655);self.assertEqual(len(value['reconciledTerminalOrSkippedRuns']),3)
    def test_02_main_guard(self):
        self.wrongMain=True
        with self.assertRaisesRegex(Rejected,'Current main changed'):self.check()
    def test_03_pages_target_guard(self):
        self.wrongPages=True
        with self.assertRaisesRegex(Rejected,'Pages target'):self.check()
    def test_04_competing_main_guard(self):
        self.competing=True
        with self.assertRaisesRegex(Rejected,'Competing main'):self.check()
    def test_05_unknown_failure_guard(self):
        self.events.insert(1,(8,'8'*40,888,124))
        with self.assertRaisesRegex(Rejected,'Unknown or uncertain'):self.check()
    def test_06_contradictory_failure_log_guard(self):
        self.badLog=True
        with self.assertRaisesRegex(Rejected,'Terminal deployment'):self.check()
    def test_07_baseline_must_be_found(self):
        self.noBase=True
        with self.assertRaisesRegex(Rejected,'baseline not found'):self.check()
    def test_08_served_bytes_guard(self):
        self.badPublic=True
        with self.assertRaisesRegex(Rejected,'Served payload differs'):self.check()
    def test_09_authoritative_open_and_fresh_time(self):
        value={'store':{'state':'OPEN','desired_state':'OPEN','pause_from':None,'resume_at':None,'updated_at':self.p['operationsEvidence']['updated_at']},'server_time':datetime.now(timezone.utc).isoformat()}
        self.assertEqual(f.operations(self.p,get=lambda:canonical(value))['requests'],1)
        value['store']['state']='ORDERS_PAUSED'
        with self.assertRaisesRegex(Rejected,'not OPEN'):f.operations(self.p,get=lambda:canonical(value))
    def test_10_stale_operations_guard(self):
        value={'store':{'state':'OPEN','desired_state':'OPEN','pause_from':None,'resume_at':None,'updated_at':self.p['operationsEvidence']['updated_at']},'server_time':'2026-10-01T00:00:00+00:00'}
        with self.assertRaisesRegex(Rejected,'stale'):f.operations(self.p,get=lambda:canonical(value))
    def test_11_official_gnu_tar_and_full_readback(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);files={'index.html':b'fictional homepage','nested/app.mjs':b'// inert','operations/snapshot.json':b'{}'};payload=Payload(files)
            f.write_tree(payload,root/'site')
            subprocess.run(['tar','--dereference','--hard-dereference','--directory',str(root/'site'),'-cf',str(root/'artifact.tar'),'--exclude=.git','--exclude=.github','.'],check=True)
            p=dict(self.p,candidateDigest=payload.digest())
            target=root/'uploaded';target.mkdir();(target/'artifact.tar').write_bytes((root/'artifact.tar').read_bytes())
            self.assertEqual(f.verify(p,target,'candidate')['payloadDigest'],payload.digest())
            p['candidateDigest']='f'*64
            with self.assertRaisesRegex(Rejected,'inventory mismatch'):f.verify(p,target,'candidate')
    def test_12_privileged_overlay_refused(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);base=root/'base';base.mkdir();payload=Payload({'index.html':b'fictional'})
            with zipfile.ZipFile(io.BytesIO(pages_zip(payload))) as z:raw=z.read('artifact.tar')
            (base/'artifact.tar').write_bytes(raw);p=dict(self.p,baseTarSHA256=sha(raw),basePayloadDigest=payload.digest(),changes=[{'path':'admin/command/read-activation.mjs','beforeSHA256':None}])
            with self.assertRaisesRegex(Rejected,'privileged workspace'):f.prepare(p,base,ROOT,root/'out')
    def test_13_shared_cache_identity_changes_no_workspace_logic(self):
        value={'operation':'replace','replacements':[{'before':'../site.mjs?build='+BASE,'after':'../site.mjs?build='+SHA,'count':1}]}
        self.assertTrue(f.cache_reference_only(value))
        value['replacements'][0]['after']='../different.mjs?build='+SHA
        self.assertFalse(f.cache_reference_only(value))
        value['replacements'][0]['after']='https://other.invalid/site.mjs?build='+SHA
        self.assertFalse(f.cache_reference_only(value))
    def test_14_workspace_patch_with_noncache_changes_refused(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);folder=root/'base';folder.mkdir();payload=Payload({'index.html':b'fictional','admin/index.html':b'old'})
            with zipfile.ZipFile(io.BytesIO(pages_zip(payload))) as z:raw=z.read('artifact.tar')
            (folder/'artifact.tar').write_bytes(raw)
            p=dict(self.p,feature='SENTINEL',baseTarSHA256=sha(raw),basePayloadDigest=payload.digest(),changes=[{'path':'admin/index.html','beforeSHA256':sha(b'old'),'operation':'replace','replacements':[{'before':'old','after':'new','count':1}]}])
            with self.assertRaisesRegex(Rejected,'privileged workspace'):f.prepare(p,folder,ROOT,root/'out')
    def test_15_missing_interaction_choice_stops_before_requests(self):
        p=dict(self.p,feature='SENTINEL',evidenceReuse={'interactionDecision':'PENDING_OWNER_CHOICE'})
        def denied(path):raise AssertionError('No request permitted before the choice')
        with self.assertRaisesRegex(Rejected,'interaction choice'):f.preflight(p,get=denied)

if __name__=='__main__':unittest.main()
