"""SENTINEL exact scope and immutable LIGHTHOUSE/backend/workflow checks."""
from pathlib import Path
import subprocess,json,sys,hashlib
root=Path(__file__).resolve().parents[2];output=Path(sys.argv[1]);commit=sys.argv[2]
base='932f714b263775215ac091fbef362ad8b5bbc8b5'
allowed={'dist/commerce.mjs','dist/basket-ui.mjs','dist/basket/basket.mjs','dist/checkout/checkout.mjs','dist/contact/contact.mjs'}
def git(*args):return subprocess.check_output(['git',*args],cwd=root,text=True).strip()
assert git('rev-parse','HEAD')==commit
paths=git('ls-tree','-r','--name-only',base).splitlines();changed=[p for p in paths if git('hash-object','--',p)!=git('rev-parse',base+':'+p)]
assert set(changed)<=allowed,changed
before_contact=git('show',base+':dist/contact/contact.mjs')+'\n'
expected_contact=before_contact.replace("sending=true;button.disabled=true;button.textContent=", "sending=true;button.disabled=true;form.setAttribute('aria-busy','true');button.textContent=")
expected_contact=expected_contact.replace("finally{sending=false;if(!settled){button.disabled=false;button.textContent='Send enquiry';}}", "finally{sending=false;form.setAttribute('aria-busy','false');if(!settled){button.disabled=false;button.textContent='Send enquiry';}else if(notice.dataset.state==='uncertain'){button.textContent='Delivery not confirmed';}}")
if 'dist/contact/contact.mjs' in changed:assert (root/'dist/contact/contact.mjs').read_text()==expected_contact
before_commerce=git('show',base+':dist/commerce.mjs')+'\n';after_commerce=(root/'dist/commerce.mjs').read_text()
assert before_commerce.split('function checkStock',1)[1]==after_commerce.split('function checkStock',1)[1]
assert before_commerce.split('export function addKit',1)[1].split('function checkStock',1)[0]==after_commerce.split('export function addKit',1)[1].split('function checkStock',1)[0]
before_checkout=git('show',base+':dist/checkout/checkout.mjs')
amount=next(line.strip() for line in before_checkout.splitlines() if line.strip().startswith('const subtotal=items.reduce'))
assert amount in (root/'dist/checkout/checkout.mjs').read_text()
added=git('diff','--name-only','--diff-filter=A',base,commit).splitlines()
assert all(p.startswith(('tests/sentinel/','docs/storefront/sentinel/')) or p=='.github/workflows/raven-sentinel.yml' for p in added),added
record={'status':'PASS','baseCommit':base,'sourceCommit':commit,'sourceTree':git('rev-parse','HEAD^{tree}'),'inheritedFiles':len(paths),'unchanged':len(paths)-len(changed),'changes':changed,'added':added,'protectedBackendAndExistingWorkflowsUnchanged':True,'files':{p:{'baseBlob':git('rev-parse',base+':'+p),'candidateBlob':git('hash-object','--',p),'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest()} for p in sorted(allowed)}}
(output/('SOURCE_AFTER.json' if '--after' in sys.argv else 'SOURCE_IDENTITY.json')).write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'status':'PASS','sourceCommit':commit,'sourceTree':record['sourceTree'],'changed':changed,'unchanged':record['unchanged']}))
