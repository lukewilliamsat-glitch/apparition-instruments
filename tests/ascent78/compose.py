from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_STORED
from io import BytesIO
import hashlib,json,sys
w=Path(sys.argv[1]); csrc=Path(sys.argv[2]); verify=lambda b,h: hashlib.sha256(b).hexdigest()==h
sha=lambda b:hashlib.sha256(b).hexdigest()
def compact(o):return json.dumps(o,sort_keys=True,separators=(',',':')).encode()
raw=(w/'a.zip').read_bytes(); assert verify(raw,'2471ba75da48ee4084932f3ab7963dd9e851ada73e65803d6199377cf8db5e11')
with ZipFile(BytesIO(raw)) as z: raw=z.read('release-a77a-candidate.zip')
assert verify(raw,'4c092c6e51d30e180c244c245cc25878fa5d29ae006e589bdcb3456890ea3810')
with ZipFile(BytesIO(raw)) as z: a={k:z.read(k) for k in z.namelist()}
assert len(a)==476 and verify(compact({k:sha(v) for k,v in a.items()}),'2856d9ab919d1c0ed0a10981d4d3a237abfc297e7eb09c03b98046b5fa3b8eb8')
raw=(w/'old69b.zip').read_bytes();assert verify(raw,'ac7b361723c2eea4b75fb4b9c6827ae542ae36c7a8f6bcdf2b84c0365f6ea023')
with ZipFile(BytesIO(raw)) as z:
 m=z.read('composition.json');assert sha(m)=='9974858e8b6e62fb34450d47b3872ecb55a53e18b0c15f1b7d87e4e585548998'
 approved=json.loads(m)['releaseB']
 overlay={f:z.read('release-b-after-a-site/'+f) for f in approved['changed']}
 assert all(sha(x)==approved['files'][f] for f,x in overlay.items())
 assert set(overlay)=={'admin/index.html','admin/ironclad/app.mjs','admin/ironclad/entry.mjs','admin/ironclad/index.html','admin/ironclad/repository.mjs','admin/orders/eclipse-ui.mjs','admin/orders/financial-order.mjs'}
b=a|{f:x for f,x in overlay.items() if f!='admin/index.html'}
def rep(d,p,x,y):
 assert d[p].count(x.encode())==1,(p,x)
 d[p]=d[p].replace(x.encode(),y.encode())
def stamp(d,p,x,version='ascent78b-v1'):
 rep(d,p,x,x+'?build='+version)
def use78(d,p,x):
 import re
 src=d[p].decode();pat=r"(['\"])"+re.escape(x)+r"(?:\?[^'\"]*)?(['\"])"
 dst,n=re.subn(pat,lambda match:match[1]+x+'?build=ascent78b-v1'+match[2],src)
 assert n==1,(p,x,n)
 d[p]=dst.encode()
# The historical fixture-line filter left a dangling else in the production overlay.
rep(b,'admin/ironclad/app.mjs'," else{const a=el('a','Return to Inventory');a.href='/admin/';head.append(a);}"," {const a=el('a','Return to Inventory');a.href='/admin/';head.append(a);const calc=el('a','Landed cost calculator');calc.href='/admin/ironclad/calculator/';head.append(calc);}")
rep(b,'admin/ironclad/index.html','/admin/admin-gate.mjs"','/admin/admin-gate.mjs?build=sentinel77a-c1"')
rep(b,'admin/ironclad/index.html','./entry.mjs"','./entry.mjs?build=ascent78b-v1"')
for f,targets in {'entry.mjs':['./app.mjs','./repository.mjs'],'app.mjs':['./model.mjs']}.items():
 for t in targets:stamp(b,'admin/ironclad/'+f,t)
for x in ['../admin-auth.mjs','../../backend/public-config.mjs','../command/bounded-json.mjs']:
 stamp(b,'admin/ironclad/repository.mjs',x,'sentinel77a-c1')
stamp(b,'admin/orders/eclipse-ui.mjs','../ironclad/model.mjs')
stamp(b,'admin/orders/financial-order.mjs','../ironclad/repository.mjs')
stamp(b,'admin/orders/financial-order.mjs','./eclipse-ui.mjs')
for f,targets in {'eclipse-ui.mjs':['./economics.mjs','./commercial-date.mjs','./eclipse-model.mjs'],'financial-order.mjs':['./finance-activation.mjs','./finance-ui.mjs','./financial-record.mjs','./eclipse-model.mjs','./eclipse-repository.mjs']}.items():
 import re
 for x in targets:
  p='admin/orders/'+f; pat=r"(['\"])"+re.escape(x)+r"(?:\?[^'\"]*)?(['\"])"; d,n=re.subn(pat,lambda m:m[1]+x+'?build=sentinel77a-c1'+m[2],b[p].decode());assert n==1;b[p]=d.encode()
use78(b,'admin/orders/app.mjs','./financial-order.mjs')
use78(b,'admin/orders/index.html','./app.mjs')
b['admin/ironclad/calculator/index.html']=a['admin/ironclad/index.html'].replace(b'data-admin-entry="./estimator.mjs?',b'data-admin-entry="../estimator.mjs?')
rep(b,'admin/index.html','</a> · Landed cost calculator</p>','</a> · Procurement and inventory · <a href="/admin/ironclad/calculator/">Landed cost calculator</a></p>')
c=dict(b)
for n in ('entry.mjs','index.html','model.mjs','repository.mjs','workspace.css'):
 c['admin/omniscience/'+n]=(csrc/'admin'/'omniscience'/n).read_bytes()
for x in ('/admin/admin-gate.mjs','../orders/commercial-date.mjs','../admin-auth.mjs','../../backend/public-config.mjs'):
 p='admin/omniscience/'+('index.html' if x.startswith('/') else 'entry.mjs' if 'commercial-date' in x else 'repository.mjs')
 stamp(c,p,x,'sentinel77a-c1')
for x in ['../orders/commercial-date.mjs','../orders/economics.mjs','../orders/economics-v2.mjs']:
 stamp(c,'admin/omniscience/model.mjs',x,'sentinel77a-c1')
stamp(c,'admin/omniscience/repository.mjs','../command/bounded-json.mjs','sentinel77a-c1')
rep(c,'admin/index.html','<main id="main" class="admin-main">','<main id="main" class="admin-main"><p class="storage-note"><a href="/admin/omniscience/">BLACK LEDGER: Business financials</a> · OMNISCIENCE</p>')
def write(n,previous,current):
 out=w/n;out.mkdir()
 assert all(k.startswith('admin/') for k in set(current)|set(previous) if current.get(k)!=previous.get(k))
 assert all(current[k]==a[k] for k in ('admin/admin-gate.mjs','admin/admin-auth.mjs','admin/orders/customer-aftercare.mjs','checkout/index.html','operations/snapshot.json'))
 inv={k:sha(v) for k,v in sorted(current.items())}
 with ZipFile(w/(n+'.zip'),'w',compression=ZIP_STORED) as z:
  for k in inv:
   (out/k).parent.mkdir(parents=True,exist_ok=True);(out/k).write_bytes(current[k])
   i=ZipInfo(k,(2000,1,1,0,0,0));i.external_attr=0o100644<<16;z.writestr(i,current[k])
 receipt={'zip_sha256':sha((w/(n+'.zip')).read_bytes()),'inventory_sha256':sha(compact(inv)),'files':inv,'delta':[k for k in inv if current[k]!=previous.get(k)]}
 (w/(n+'-manifest.json')).write_text(json.dumps(receipt,sort_keys=True,indent=2)+'\n')
 print(n,{**{k:v for k,v in receipt.items() if k!='files'},'count':len(inv)})
write('release-b',a,b)
write('release-c',b,c)
