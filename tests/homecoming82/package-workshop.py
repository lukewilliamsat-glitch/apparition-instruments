"""Build an isolated Orders-linked workshop candidate, never a production deployment."""
import hashlib
import json
from pathlib import Path
import sys
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(sys.argv[1])
stageb = root / 'stageb81-static.zip'
digest = lambda b: hashlib.sha256(b).hexdigest()
assert digest(stageb.read_bytes()) == 'b5900c3e15b92db98a345f202bac9d56a1559809b82646d3b62c9c1c093809e7'
with ZipFile(stageb) as z:
    base = {p: z.read(p) for p in z.namelist()}
out = base.copy()
source = Path(__file__).parent / 'workshop'
for p, b in base.items():
    if (p.startswith('admin/') or p == 'commercial/admin.mjs') and p.endswith(('.html','.mjs')):
        out[p] = b.replace(b'unification78b-81b1', b'homecoming82-workshop1')
needle = b"if(p.startsWith('/admin/orders/'))"
p = 'admin/application.mjs'
assert out[p].count(needle) == 1
out[p] = out[p].replace(needle,b"if(p.startsWith('/admin/quartermaster/'))return 'orders';"+needle)
needle = b"showOrder(order,$('#detail-content'));"
p = 'admin/orders/app.mjs'
assert out[p].count(needle) == 1
out[p] = out[p].replace(needle,needle + b"""
  if(isPaidOrder(order)){
   const packing=el('a','Review workshop packing','button');
   packing.href=deploymentPath('/admin/quartermaster/?order='+encodeURIComponent(order.id));
   $('#detail-content').prepend(packing);
  }
 """)
for f in ['index.html','entry.mjs','workspace.css']:
    out['admin/quartermaster/'+f] = (source/f).read_bytes().replace(b'unification78b-81b1', b'homecoming82-workshop1')
changed = [p for p in out if out[p] != base.get(p)]
assert all(p.startswith('admin/') or p == 'commercial/admin.mjs' for p in changed)
sealed = root/'workshop82-preview-only.zip'
with ZipFile(sealed,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
    for p,b in sorted(out.items()):
        info = ZipInfo(p)
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        z.writestr(info,b,compress_type=ZIP_DEFLATED,compresslevel=9)
with ZipFile(sealed) as z:
    z.extractall(root/'workshop82')
(root/'workshop82-manifest.json').write_text(json.dumps({
    'stageBStaticSha256': digest(stageb.read_bytes()),
    'workshopPreviewStaticSha256': digest(sealed.read_bytes()),
    'workshopReadRpcSha256': digest((source.parent/'workshop82.read.review.sql').read_bytes()),
    'files': len(out),
    'modifiedOrAdded': {p:digest(out[p]) for p in sorted(changed)}
},indent=2)+'\n')
print('Workshop preview only:',len(out),'files; candidate static SHA-256',digest(sealed.read_bytes()))
