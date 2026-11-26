"""Seal the ECLIPSE workspace increment over the accepted Orders artifact."""
import json
import sys
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile, ZipInfo

BASE = 'f2d2788baeba42aab4986dbd69ad46187461f2e447d8cc7a9ea5e69dce53b065'


def digest(data):
    return sha256(data).hexdigest()


def build(base, source, out):
    if digest(base.read_bytes()) != BASE:
        raise ValueError('Requires the NOCTURNE 91 ECLIPSE archive')
    with ZipFile(base) as archive:
        names = archive.namelist()
        if len(names) != 505 or len(set(names)) != len(names):
            raise ValueError('Unexpected baseline archive')
        baseline = {name: archive.read(name) for name in names}
    files = baseline.copy()
    orders = 'admin/omniscience/'

    def replace(path, old, new):
        old, new = old.encode(), new.encode()
        if files[path].count(old) != 1:
            raise ValueError(f'Unexpected baseline {path}: {old!r}')
        files[path] = files[path].replace(old, new)

    replace(orders+'index.html','./entry.mjs?build=nocturne90-dashboard','./entry.mjs?build=convergence92-report')
    for name in ('entry.mjs','repository.mjs','dashboard.mjs'):
        files[orders+name]=(source/name).read_bytes()

    changed=sorted(name for name,data in files.items() if baseline.get(name)!=data)
    if len(changed)!=4 or any(not name.startswith(orders) for name in changed):
        raise ValueError('Unexpected release scope')
    out.mkdir(parents=True,exist_ok=True)
    with ZipFile(out/'omniscience92-static.zip','w') as archive:
        for name,data in sorted(files.items()):
            info=ZipInfo(name,(1980,1,1,0,0,0))
            info.external_attr=0o100644<<16
            archive.writestr(info,data,compress_type=ZIP_STORED)
    manifest={'files':len(files),'changed':changed,'inventory':{name:digest(data) for name,data in sorted(files.items())}}
    (out/'omniscience92-inventory.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    print(f'{len(files)} files, {len(changed)} changed Orders files')


if __name__=='__main__':
    build(*(Path(a) for a in sys.argv[1:]))
