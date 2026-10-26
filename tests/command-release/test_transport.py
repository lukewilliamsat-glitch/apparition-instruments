import copy,io,json,sys,tempfile,unittest,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/command-release'))
from archive_core import canonical,sha,Rejected
from transport import capsule,download_private,unpack,assess_github,github_preflight
from test_handoff import handoff

def cap(raw=b'fixture'):
    return {'scope':'COMMAND_APPROVED_PRIVATE_HANDOFF','toolingCommit':'3'*40,'operation':'release','handoffBytes':len(raw),'handoffSHA256':sha(raw),'approvalSHA256':'a'*64,'url':'https://oaisdmntprfixture.blob.core.windows.net/fixture-only'}
def metadata():
    a={'expectedActive':{'deploymentId':'10','sourceCommit':'2'*40},'expectedActiveWorkflowCommit':'2'*40,'siteURL':'https://fixture.invalid/'}
    kwargs={'ref':{'object':{'sha':'3'*40}},'pages':{'html_url':'https://fixture.invalid/','build_type':'workflow'},'runs':[[],[],[],[],[]],'deployments':[{'id':10,'sha':'2'*40,'environment':'github-pages','latestStatus':{'state':'success'}}],'current_run':54,'tooling_commit':'3'*40}
    return a,kwargs

class TransportTests(unittest.TestCase):
    def test_capsule_pins_commit_and_exact_download(self):
        c=cap();self.assertEqual(capsule(canonical(c).decode(),'3'*40),c);self.assertEqual(download_private(c,lambda url,limit:b'fixture'),b'fixture')
        self.assertRaises(Rejected,capsule,canonical(c).decode(),'4'*40);self.assertRaises(Rejected,download_private,c,lambda url,limit:b'wrong')
    def test_private_url_allowlist_rejects_redirect_targets_and_local_hosts(self):
        for url in ['http://oaisdmntprfixture.blob.core.windows.net/a','https://127.0.0.1/a','https://evil.example/a','https://oaisdmntprfixture.blob.core.windows.net.evil.example/a','https://user:password@oaisdmntprfixture.blob.core.windows.net/a']:
            c=cap();c['url']=url;self.assertRaises(Rejected,capsule,canonical(c).decode(),'3'*40)
    def test_only_six_approved_files_are_unpacked(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder,_,_,_,_=handoff(root);out=io.BytesIO()
            with zipfile.ZipFile(out,'w') as z:
                for path in folder.iterdir():z.writestr(path.name,path.read_bytes())
            unpack(out.getvalue(),root/'received');self.assertEqual({p.name for p in (root/'received').iterdir()},{p.name for p in folder.iterdir()})
            self.assertRaises(FileExistsError,unpack,out.getvalue(),root/'received')
    def test_extra_private_evidence_or_unsafe_archive_path_is_rejected(self):
        for name in ['../approval.json','private-policy-output.json']:
            out=io.BytesIO()
            with zipfile.ZipFile(out,'w') as z:z.writestr(name,b'{}')
            with tempfile.TemporaryDirectory() as tmp:self.assertRaises(Rejected,unpack,out.getvalue(),Path(tmp)/'received')
    def test_current_source_target_and_deployment_are_required(self):
        a,k=metadata();self.assertEqual(assess_github(a,**k)['githubPreflight'],'PASS')
        for mutate in [lambda k:k['ref']['object'].update(sha='4'*40),lambda k:k['pages'].update(html_url='https://wrong.invalid/'),lambda k:k['pages'].update(build_type='legacy'),lambda k:k['deployments'][0].update(id=11),lambda k:k['deployments'][0]['latestStatus'].update(state='in_progress')]:
            changed=copy.deepcopy(k);mutate(changed);self.assertRaises(Rejected,assess_github,a,**changed)
    def test_competing_or_truncated_pending_runs_are_rejected(self):
        a,k=metadata();k['runs'][0]=[{'id':99,'head_branch':'main'}];self.assertRaises(Rejected,assess_github,a,**k)
        k['runs'][0]=[{'id':i,'head_branch':'engineering'} for i in range(5)];self.assertRaises(Rejected,assess_github,a,**k)
    def test_current_environment_job_is_not_mistaken_for_an_earlier_live_deployment(self):
        a,k=metadata();k['deployments'].append({'id':11,'sha':'3'*40,'environment':'github-pages','latestStatus':{'state':'in_progress','log_url':'https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/54/job/1'}});self.assertEqual(assess_github(a,**k)['priorDeploymentId'],'10')
    def test_restored_payload_source_and_publishing_workflow_source_are_distinct(self):
        a,k=metadata();a['expectedActiveWorkflowCommit']='3'*40;k['deployments'][0]['sha']='3'*40;self.assertEqual(assess_github(a,**k)['githubPreflight'],'PASS');self.assertEqual(a['expectedActive']['sourceCommit'],'2'*40)
    def test_github_collection_is_fixed_bounded_and_does_not_call_a_provider(self):
        a,k=metadata();calls=[]
        def get(path):
            calls.append(path)
            if path=='/git/ref/heads/main':return k['ref']
            if path=='/pages':return k['pages']
            if path.startswith('/actions/runs?'):return {'workflow_runs':[]}
            if path.startswith('/deployments?'):return [{'id':10,'sha':'2'*40,'environment':'github-pages'}]
            if path=='/deployments/10/statuses?per_page=1':return [{'state':'success'}]
            raise AssertionError(path)
        r=github_preflight(a,'',54,'3'*40,get);self.assertEqual(r['requests'],9);self.assertEqual(len(calls),9);self.assertTrue(all(path.startswith(('/pages','/deployments','/actions','/git')) for path in calls))
        self.assertRaises(Rejected,github_preflight,a,'',54,'3'*40)
    def test_workflow_is_manual_or_exact_marker_only_without_generators(self):
        text=(Path(__file__).resolve().parents[2]/'docs/command/command05/templates/command-publication-only.yml.example').read_text()
        self.assertIn('[command-exact-release]',text);self.assertIn('group: pages',text);self.assertIn('cancel-in-progress: false',text);self.assertIn('name: github-pages',text);self.assertIn('deployments: read',text);self.assertNotIn('schedule:',text);self.assertNotIn('scripts/generate-',text);self.assertNotIn('npm ci',text)
        self.assertLess(text.index('Independently read back'),text.index('Publish this exact'));self.assertLess(text.index('Verify original uploaded bytes'),text.index('Publish this exact'))

if __name__=='__main__':unittest.main()
