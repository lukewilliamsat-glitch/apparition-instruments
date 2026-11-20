"""Verify exact sealed Stage B input without rebuilding or requesting production access."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

outer, dest = map(Path, sys.argv[1:])
sha = lambda b: hashlib.sha256(b).hexdigest()
assert sha(outer.read_bytes()) == '7764bebe684efd8441bdf778bf51dced4497de0a5b8c2d7adf250072503b19ac'
expected = {
    'stageb81-static.zip': 'b5900c3e15b92db98a345f202bac9d56a1559809b82646d3b62c9c1c093809e7',
    'stageb81-manifest.json': 'f81df04b03fd01cb4da56e7d97e3a96c74ce00aec7369bd4165ad06fbffde23e',
    'rollback-release-c.zip': 'be062020a7f3362357cd9a5f6613fe75104d55bb38aeaedccd695b0c55ea0c30',
    'stageb81.read.review.sql': '73cf2dd78c475cab34c6b0e3d47b81b4a4e44dd4aedfeaeb7f8dd283caf4e124',
}
dest.mkdir(exist_ok=True)
with zipfile.ZipFile(outer) as source:
    for p, h in expected.items():
        body = source.read(p)
        assert sha(body) == h, p
        (dest / p).write_bytes(body)
m = json.loads((dest / 'stageb81-manifest.json').read_text())
after, before = (zipfile.ZipFile(dest / n) for n in ['stageb81-static.zip', 'rollback-release-c.zip'])
assert m['files'] == len(after.namelist()) == len(m['inventory']) == 488
assert len(before.namelist()) == 485
assert set(m['inventory']) == set(after.namelist()) and set(before.namelist()) <= set(after.namelist())
changes = {}
for p in after.namelist():
    assert p and not p.startswith('/') and not p.endswith('/') and '..' not in p.split('/') and '\\' not in p
    b = after.read(p)
    h = sha(b)
    assert h == m['inventory'][p]
    if p not in before.namelist() or b != before.read(p):
        assert p.startswith('admin/') or p == 'commercial/admin.mjs'
        changes[p] = h
    target = dest / 'unified-c' / p
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b)
assert changes == m['modifiedOrAdded'] and len(changes) == 33
print('PASS exact 488-file Stage B and 485-file rollback; all customer-facing bytes unchanged')
