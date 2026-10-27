"""Only new phase guards; existing complete-payload and transport tests are reused."""
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
    raise AssertionError('Unsafe phase accepted: '+part)
with tempfile.TemporaryDirectory() as t:
    folder=Path(t)
    for key,value in [('authority','AUTHORISATION_60'),('phase','UNBOUNDED'),('commandReads',True),('commandWrites',True)]:
        bad=copy.deepcopy(p);bad[key]=value;f=folder/'plan.json';f.write_text(json.dumps(bad))
        rejected(lambda:plan_at(f),'scope' if key=='authority' else 'phase/source' if key=='phase' else 'activation')
    bad=copy.deepcopy(p);bad['changes'].append({'path':'index.html','operation':'source','source':'dist/index.html'})
    rejected(lambda:prepare(bad,sys.argv[1],'.',folder/'unrelated'),'unrelated delta refused')
    bad=copy.deepcopy(p);bad['ascendanceManifestSHA256']='0'*64
    rejected(lambda:prepare(bad,sys.argv[1],'.',folder/'tamper'),'manifest changed')
    expected={'head_sha':p['applicationSource'],'status':'completed','conclusion':'success','path':'.github/workflows/command61-ascendance.yml'}
    assert unified_native_evidence(p,lambda _:expected)['applicationUnchanged'];count+=1
    rejected(lambda:unified_native_evidence(p,lambda _:{**expected,'path':'.github/workflows/static.yml'}),'Wrong Ascendance')
    rejected(lambda:unified_native_evidence(p,lambda _:{**expected,'conclusion':'failure'}),'not successful')
print(json.dumps({'newPublicationGuards':count,'result':'PASS'}))
