"""Only inventoried static fixtures; never copy application keys or a build tree."""
from pathlib import Path
from hashlib import sha256
from shutil import copyfile
import json, sys

out=Path(sys.argv[1]); out.mkdir(exist_ok=False, parents=True)
assets = ['commercial/'+n+'.mjs' for n in ('commerce67-admin','commerce67-client','commerce67-activation','offers')]
# Import-only production graph exits after the static category label map. This
# fixture supplies that one data module and deliberately no live provider config.
for path in assets:
    target=out/path; target.parent.mkdir(exist_ok=True,parents=True); copyfile(Path('dist')/path,target)
for path in ('index.html','preview.css','preview.mjs'):
    copyfile(Path('tests/commerce67/preview')/path,out/path)
for path,content in {
 'admin/data.mjs':"export const categories={potentiometers:'Potentiometers',capacitors:'Capacitors','treble-bleeds':'Treble Bleeds',switches:'Switches',jacks:'Output Jacks',other:'Other'};\n",
 'backend/public-config.mjs':"export const publicBackendConfig=Object.freeze({});\n",
 '_headers':"/*\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: default-src 'self'; connect-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'\n",
}.items():
    f=out/path;f.parent.mkdir(exist_ok=True,parents=True);f.write_text(content)
rows=[]
for p in sorted(f for f in out.rglob('*') if f.is_file()):
    body=p.read_bytes(); assert b'.supabase.co' not in body and b'api.stripe.com' not in body
    rows.append({'path':p.relative_to(out).as_posix(),'bytes':len(body),'sha256':sha256(body).hexdigest()})
print(json.dumps(rows,separators=(',',':')))
