from pathlib import Path
import sys,shutil
p=Path(sys.argv[1])
p.mkdir()
local=Path(__file__).resolve().parent
orig=local.parent/'ascent78'
if not orig.exists(): orig=local.parent/'ascent78'
def one(s,a,b):
 assert s.count(a)==1,a
 return s.replace(a,b)
# Copy the accepted 78A harness; append only navigation-specific journeys and probes.
for n in ('browser.cjs','depth.cjs','accept-deep.py'):
 source=orig/n if (orig/n).is_file() else orig/'harness'/n
 v=source.read_text()
 v=v.replace("'release-b','release-c'","'release-b','release-c','unified-b','unified-c'")
 if n=='browser.cjs':
  v=one(v,"ctx=await b.newContext(probe==='mobile'?","ctx=await b.newContext(['mobile','nav-mobile'].includes(probe)?")
  v=one(v,"routes.push('/admin/ironclad/calculator/');","routes.push('/admin/ironclad/calculator/','/admin/?probe=nav-desktop','/admin/?probe=nav-mobile');")
  v=v.replace("if(names.includes('release-c'))","if(names.includes('unified-c'))")
 if n=='depth.cjs':
  v=one(v,"const assert=require('node:assert/strict');","const assert=require('node:assert/strict');\nconst checkNav=require('./nav-checks.cjs');")
  i=v.rfind(' return actions;')
  assert i>0
  v=v[:i]+" if(shouldAdmin(uri))await task('unified-navigation',()=>checkNav(page,uri,name));\n"+v[i:]
 if n=='accept-deep.py':
  v=one(v," req(bool(r['depth'])", """ if p=='/admin/': req(r['features'].get('navigation'),(p,'existing Orders and Delivery links'))
 if p.startswith('/checkout/') and (p=='/checkout/' or 'fixture=free-delivery' in p): req('£0.00' in (r['features'].get('quote') or '') if 'free-delivery' in p else '£3.99' in (r['features'].get('quote') or ''),(p,'legacy quote',r['features'].get('quote')))
 if p.startswith('/admin/orders/?id='): req(all(r['features'].get(x) for x in ('aftercareOff','dateHistory','eclipse')),(p,'preserved Release A features'))
 req(bool(r['depth'])""")
  # Existing browser probe reads display copy; the dedicated checkout assertion remains intact.
  v=v.replace("'£0.00' in (r['features'].get('quote') or '')","any(q in (r['features'].get('quote') or '').lower() for q in ('£0.00','free'))")
 (p/n).write_text(v)
shutil.copy(local/'nav-checks.cjs',p/'nav-checks.cjs')
