# Check the exact fixture module graph before a native browser fixture opens.
from pathlib import Path
import re,posixpath,json
seen=set();blocked=[]
extra={'dist/wiring-kits/kit-seed.mjs','dist/components/catalogue-seed.mjs','dist/wiring-kits/builder-options.mjs','dist/wiring-kits/kit-requirements.mjs','dist/wiring-kits/kit-component-discovery.mjs'}
def walk(p):
 if p in seen:return
 seen.add(p)
 assert Path(p).is_file(),p
 if not re.match(r'^(dist/(admin|backend|commercial|circuit-forge)/|tests/command05/)',p) and p not in extra:blocked.append(p)
 for imp in re.findall(r'(?:from\s*|import\s*)[\'\"]([^\'\"]+)[\'\"]',Path(p).read_text()):
  if imp.startswith('.'):walk(posixpath.normpath(posixpath.join(posixpath.dirname(p),imp.split('?')[0])))
  elif imp.startswith('/'):walk('dist'+imp.split('?')[0])
for root in ['tests/command05/browser-entry.mjs','tests/command05/production-browser-entry.mjs','dist/admin/admin.mjs']:walk(root)
assert not blocked,blocked
print(json.dumps({'fixtureModuleClosure':'PASS','modules':len(seen),'additionalReviewedSeedDependencies':sorted(extra)}))
