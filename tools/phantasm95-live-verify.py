import json,hashlib,urllib.request,concurrent.futures,zipfile
from pathlib import Path
import sys,subprocess
p=Path(sys.argv[1]);manifest=json.loads((p/'phantasm95-inventory.json').read_text())
with zipfile.ZipFile(p/'phantasm95-static.zip') as z:files={n:z.read(n) for n in z.namelist()}
paths=manifest['changed']+manifest['added']+['account/index.html','checkout/index.html','basket/index.html','components/index.html','wiring-kits/index.html','commerce.mjs','backend/public-config.mjs','admin/quartermaster/index.html','admin/orders/index.html','admin/omniscience/index.html','admin/ironclad/index.html']
def verify(name):
 route='/'+(name[:-10] if name.endswith('index.html') else name)
 req=urllib.request.Request('https://apparitioninstruments.co.uk'+route,headers={'Cache-Control':'no-cache','User-Agent':'Apparition-PHANTASM95-readback/1.0'})
 with urllib.request.urlopen(req,timeout=25) as r:
  b=r.read();assert r.status==200
  if b!=files[name]:
   i=next((i for i,(a,c) in enumerate(zip(b,files[name])) if a!=c),min(len(b),len(files[name])))
   print(json.dumps({'route':route,'python_length':len(b),'expected_length':len(files[name]),'first_difference':i,'python_excerpt':repr(b[max(0,i-50):i+100]),'expected_excerpt':repr(files[name][max(0,i-50):i+100])}),flush=True)
   b=subprocess.run(['curl','-fsS','--max-time','25','https://apparitioninstruments.co.uk'+route],check=True,capture_output=True).stdout
  assert b==files[name],name+' differs for ordinary curl readback'
  return {'route':route,'http':r.status,'sha256':hashlib.sha256(b).hexdigest(),'match':True}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:result=list(pool.map(verify,paths))
(p/'phantasm95-live-readback.json').write_text(json.dumps(result,indent=2));print(json.dumps({'matched':len(result),'routes':[x['route'] for x in result]}))
