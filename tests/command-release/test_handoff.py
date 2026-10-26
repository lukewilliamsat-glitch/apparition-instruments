import copy,json,sys,tempfile,unittest,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/command-release'))
from archive_core import canonical,make_bundle,sha,Rejected
from compose import compose_overlay
from handoff import stage,uploaded_tar,ROUTE
from test_compose import fixture,NOW

def handoff(root,operation='release'):
    baseline,overlay,m,_,original,evidence=fixture()
    m['sourceProvenance']=[{'path':p,'rawSourceSHA256':sha(raw)} for p,raw in sorted(overlay.items())]
    digest=sha(canonical(m));release,_=compose_overlay(baseline,overlay,m,digest);raw,rr=make_bundle(release,m['sourceCommit'],'release')
    br={'version':1,'kind':'rollback','sourceCommit':m['baseSourceCommit'],'payloadDigest':baseline.digest(),'archiveSHA256':sha(original),'archiveBytes':len(original),'files':baseline.manifest(),'directories':list(baseline.directories)}
    prior=br if operation=='release' else rr
    expected={'deploymentId':'FICTIONAL-CURRENT-DEPLOYMENT','sourceCommit':prior['sourceCommit'],'payloadDigest':prior['payloadDigest']}
    a={'scope':'COMMAND_EXACT_PRODUCTION_RELEASE','repository':'lukewilliamsat-glitch/apparition-instruments','operation':operation,'operationId':'fictional-command55-op','toolingCommit':'3'*40,'candidateSourceCommit':m['sourceCommit'],'routeId':ROUTE,'environment':'github-pages','sharedConcurrencyGroup':'pages','visualApproved':True,'productionApproved':True,'restorationProcedureAccepted':True,'rollbackRetentionVerified':True,'productionWrites':False,'ownerVisualApprovalRef':'FICTIONAL-VISUAL-ONLY','ownerProductionApprovalRef':'FICTIONAL-DEPLOY-ONLY','archiveAccessApprovalRef':'FICTIONAL-ACCESS-ONLY','expiresAt':NOW+600,'releaseReceiptSHA256':sha(canonical(rr)),'rollbackReceiptSHA256':sha(canonical(br)),'sourceManifestSHA256':digest,'readbackPlanSHA256':'d'*64,'holidayEvidenceSHA256':'c'*64,'environmentProtectionEvidenceSHA256':'e'*64,'metadataEvidenceSHA256':'a'*64,'liveReadEvidenceSHA256':'b'*64,'expectedActive':expected,'currentEvidence':{**evidence['current'],**expected}}
    a['expectedActiveWorkflowCommit']='2'*40 if operation=='release' else '3'*40
    root=Path(root);folder=root/'handoff';folder.mkdir();checkout=root/'checkout'
    for p,data in overlay.items():target=checkout/'dist'/p;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    for name,data in {'release.zip':raw,'rollback.zip':original,'release-receipt.json':canonical(rr),'rollback-receipt.json':canonical(br),'source-manifest.json':canonical(m),'approval.json':canonical(a)}.items():(folder/name).write_bytes(data)
    return folder,checkout,a,rr,br

class HandoffTests(unittest.TestCase):
    def invoke(self,folder,checkout,a,out):return stage(directory=folder,approval_sha=sha(canonical(a)),operation=a['operation'],tooling_commit='3'*40,checkout=checkout,out=out,now=NOW)
    def test_release_and_restore_use_complete_exact_original_tar(self):
        for operation in ['release','restore']:
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);folder,checkout,a,rr,br=handoff(root,operation);result=self.invoke(folder,checkout,a,root/'staged');selected='release.zip' if operation=='release' else 'rollback.zip'
                with zipfile.ZipFile(folder/selected) as z:self.assertEqual(z.read('artifact.tar'),(root/'staged/artifact.tar').read_bytes())
                uploaded=root/'downloaded';uploaded.mkdir();(uploaded/'artifact.tar').write_bytes((root/'staged/artifact.tar').read_bytes());receipt=rr if operation=='release' else br
                self.assertTrue(uploaded_tar(uploaded,result,receipt,a['releaseReceiptSHA256' if operation=='release' else 'rollbackReceiptSHA256'])['uploadedOriginalTarVerified']);self.assertFalse(result['liveReleaseVerified'])
    def test_each_owner_gate_is_required(self):
        for key in ['visualApproved','productionApproved','restorationProcedureAccepted','rollbackRetentionVerified']:
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);folder,checkout,a,_,_=handoff(root);a[key]=False;(folder/'approval.json').write_bytes(canonical(a));self.assertRaises(Rejected,self.invoke,folder,checkout,a,root/'staged')
    def test_wrong_operation_or_tooling_commit_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder,checkout,a,_,_=handoff(root)
            for kwargs in [{'operation':'restore','tooling_commit':'3'*40},{'operation':'release','tooling_commit':'4'*40}]:self.assertRaises(Rejected,stage,directory=folder,approval_sha=sha(canonical(a)),checkout=checkout,out=root/'staged',now=NOW,**kwargs)
    def test_source_checkout_drift_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder,checkout,a,_,_=handoff(root);(checkout/'dist/admin/command/entry.mjs').write_bytes(b'not approved');self.assertRaises(Rejected,self.invoke,folder,checkout,a,root/'staged')
    def test_archive_integrity_drift_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder,checkout,a,_,_=handoff(root);p=folder/'release.zip';p.write_bytes(p.read_bytes()+b'extra');self.assertRaises(Rejected,self.invoke,folder,checkout,a,root/'staged')
    def test_upload_readback_rejects_changed_bytes_and_extra_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder,checkout,a,rr,_=handoff(root);r=self.invoke(folder,checkout,a,root/'staged');up=root/'uploaded';up.mkdir();(up/'artifact.tar').write_bytes((root/'staged/artifact.tar').read_bytes()+b'extra');self.assertRaises(Rejected,uploaded_tar,up,r,rr,a['releaseReceiptSHA256']);(up/'artifact.tar').write_bytes((root/'staged/artifact.tar').read_bytes());(up/'unapproved.txt').write_text('extra');self.assertRaises(Rejected,uploaded_tar,up,r,rr,a['releaseReceiptSHA256'])
    def test_expired_or_competing_publisher_is_rejected(self):
        for modify in [lambda a:a.update(expiresAt=NOW),lambda a:a['currentEvidence'].update(competingPublishers=1),lambda a:a['currentEvidence'].update(observedAt=NOW-301)]:
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);folder,checkout,a,_,_=handoff(root);modify(a);(folder/'approval.json').write_bytes(canonical(a));self.assertRaises(Rejected,self.invoke,folder,checkout,a,root/'staged')
    def test_extra_private_evidence_is_not_accepted(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder,checkout,a,_,_=handoff(root);(folder/'private-provider-output.json').write_text('{}');self.assertRaises(Rejected,self.invoke,folder,checkout,a,root/'staged')
    def test_no_source_or_archive_input_is_modified(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder,checkout,a,_,_=handoff(root);before={p:p.read_bytes() for p in root.rglob('*') if p.is_file()};self.invoke(folder,checkout,a,root/'staged')
            for p,data in before.items():self.assertEqual(p.read_bytes(),data)

if __name__=='__main__':unittest.main()
