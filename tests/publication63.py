"""Targeted AUTHORISATION 62 release boundary checks, using the real complete baseline."""
import copy,json,sys,tempfile,shutil
from pathlib import Path
sys.path.insert(0,'scripts/command-release')
from frontend_release import plan_at,prepare,unified_native_evidence
from archive_core import canonical,sha
p=json.loads(Path('docs/releases/triple-strike/current.json').read_text())
count=0
def rejected(fn,part):
    global count
    try:fn()
    except Exception as e:
        assert part in str(e),(part,str(e));count+=1;return
    raise AssertionError('Unsafe release accepted: '+part)
with tempfile.TemporaryDirectory() as t:
    folder=Path(t)
    for key,value,reason in [('authority','AUTHORISATION_61','scope'),('phase','UNBOUNDED','phase/source'),('commandReads',True,'activation'),('commandWrites',True,'activation'),('financialPersistence',True,'commercial activation'),('activePromotions',True,'commercial activation')]:
        bad=copy.deepcopy(p);bad[key]=value;f=folder/'plan.json';f.write_text(json.dumps(bad))
        rejected(lambda:plan_at(f),reason)
    bad=copy.deepcopy(p);bad['changes'].append({'path':'index.html','operation':'source','source':'dist/index.html'})
    rejected(lambda:prepare(bad,sys.argv[1],'.',folder/'unrelated'),'unrelated delta refused')
    bad=copy.deepcopy(p);bad['ledgerManifestSHA256']='0'*64
    rejected(lambda:prepare(bad,sys.argv[1],'.',folder/'tamper'),'manifest changed')
    bad=copy.deepcopy(p);bad['baseTarSHA256']='0'*64
    rejected(lambda:prepare(bad,sys.argv[1],'.',folder/'baseline'),'baseline TAR changed')
    expected={'head_sha':p['nativeAcceptance'].get('executionSource',p['applicationSource']),'status':'completed','conclusion':'success','path':'.github/workflows/command63-black-ledger.yml'}
    comparison={'merge_base_commit':{'sha':p['applicationSource']},'status':'ahead','files':[{'filename':'tests/command63/browser.mjs','status':'modified'}]}
    assert unified_native_evidence(p,lambda path:comparison if path.startswith('/compare/') else expected)['applicationUnchanged'];count+=1
    if expected['head_sha']!=p['applicationSource']:
        rejected(lambda:unified_native_evidence(p,lambda path:{**comparison,'files':[{'filename':'dist/admin/application.mjs','status':'modified'}]} if path.startswith('/compare/') else expected),'Application changed')
    rejected(lambda:unified_native_evidence(p,lambda _:{**expected,'path':'.github/workflows/static.yml'}),'Wrong Black Ledger')
    rejected(lambda:unified_native_evidence(p,lambda _:{**expected,'conclusion':'failure'}),'not successful')
    rejected(lambda:unified_native_evidence(p,lambda _:{**expected,'head_sha':'0'*40}),'not successful')
    if p['phase']=='C':
        for old,new,reason in [('enabled:false','enabled:true','promotion activation'),('liveCheckoutEvidenceSHA256:null','liveCheckoutEvidenceSHA256:"'+'0'*64+'"','checkout evidence')]:
            # Even an internally consistent forged manifest cannot activate checkout.
            sandbox=folder/str(count);sandbox.mkdir();shutil.copytree('release-overlays/commerce62-C',sandbox/'release-overlays/commerce62-C')
            target='commercial/offer-activation.mjs';overlay=sandbox/'release-overlays/commerce62-C'/target
            data=overlay.read_bytes().replace(old.encode(),new.encode());overlay.write_bytes(data)
            bad=copy.deepcopy(p);manifest=json.loads(Path('docs/operations/commerce62/source-manifest-C.json').read_text())
            for entry in manifest['entries']:
                if entry['path']==target:entry.update(afterSHA256=sha(data),bytes=len(data))
            for change in bad['changes']:
                if change['path']==target:change.update(afterSHA256=sha(data),bytes=len(data))
            (sandbox/'docs/operations/commerce62').mkdir(parents=True);(sandbox/'docs/operations/commerce62/source-manifest-C.json').write_text(json.dumps(manifest))
            bad['ledgerManifestSHA256']=sha(canonical(manifest))
            rejected(lambda:prepare(bad,sys.argv[1],sandbox,folder/('rejected-'+str(count))),reason)
print(json.dumps({'newPublicationGuards':count,'result':'PASS'}))
