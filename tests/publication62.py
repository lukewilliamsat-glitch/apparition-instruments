"""Targeted AUTHORISATION 62 release boundary checks, using the real complete baseline."""
import copy,json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'scripts/command-release')
from frontend_release import plan_at,prepare,unified_native_evidence
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
    bad=copy.deepcopy(p);bad['forgeManifestSHA256']='0'*64
    rejected(lambda:prepare(bad,sys.argv[1],'.',folder/'tamper'),'manifest changed')
    bad=copy.deepcopy(p);bad['baseTarSHA256']='0'*64
    rejected(lambda:prepare(bad,sys.argv[1],'.',folder/'baseline'),'baseline TAR changed')
    expected={'head_sha':p['applicationSource'],'status':'completed','conclusion':'success','path':'.github/workflows/command62-commerce-forge.yml'}
    assert unified_native_evidence(p,lambda _:expected)['applicationUnchanged'];count+=1
    rejected(lambda:unified_native_evidence(p,lambda _:{**expected,'path':'.github/workflows/static.yml'}),'Wrong Commerce')
    rejected(lambda:unified_native_evidence(p,lambda _:{**expected,'conclusion':'failure'}),'not successful')
    rejected(lambda:unified_native_evidence(p,lambda _:{**expected,'head_sha':'0'*40}),'not successful')
print(json.dumps({'newPublicationGuards':count,'result':'PASS'}))
