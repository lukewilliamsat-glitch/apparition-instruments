import sys,json
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_STORED
from hashlib import sha256
base,media,src,out=map(Path,sys.argv[1:]);out.mkdir(exist_ok=True,parents=True)
assert sha256(base.read_bytes()).hexdigest()=='80cf3bfbeaba475b8d08c773a3fc2c20bf0db5644d5bbd71a023bd7d439a9b71'
assert sha256(media.read_bytes()).hexdigest()=='ac62d077efcb80e7b36fdef29b8d4d7a42adae57d38b1a3cc7a7dca83cf3c9c9'
with ZipFile(base) as z:before={n:z.read(n) for n in z.namelist()}
f=before.copy();cta=b'<aside aria-label="PHANTASM experience" style="padding:48px 6%;text-align:center;border-top:1px solid #514731"><p style="color:#c5bea0;margin-bottom:20px">Follow the signal. Discover another side of Apparition.</p><a class="button" href="/phantasm/">Enter PHANTASM <span aria-hidden="true">&#8599;</span></a></aside>'
f['index.html']=f['index.html'].replace(b'</main>',cta+b'</main>');assert f['index.html'].replace(cta,b'')==before['index.html']
with ZipFile(media) as z:
 for n in z.namelist():
  if n.startswith('assets/phantasm95/'):f[n]=z.read(n)
for p in src.rglob('*'):
 if p.is_file():f[p.relative_to(src).as_posix()]=p.read_bytes()
assert all(f[n]==b for n,b in before.items() if n!='index.html')
with ZipFile(out/'phantasm96-static.zip','w') as z:
 for n,b in sorted(f.items()):
  i=ZipInfo(n,(1980,1,1,0,0,0));i.external_attr=0o100644<<16;z.writestr(i,b,compress_type=ZIP_STORED)
(out/'phantasm96-inventory.json').write_text(json.dumps({'files':len(f),'changed':['index.html'],'added':sorted(set(f)-set(before)),'inventory':{n:sha256(b).hexdigest() for n,b in sorted(f.items())}},separators=(',',':'))+'\n')
for n in ['phantasm96-static.zip','phantasm96-inventory.json']:print(sha256((out/n).read_bytes()).hexdigest(),n)
