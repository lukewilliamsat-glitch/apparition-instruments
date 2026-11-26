"""Seal the ECLIPSE workspace increment over the accepted Orders artifact."""
import json
import sys
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile, ZipInfo

BASE = 'acdf006e98f8654f892c243c4afd3fe26a69d2b9fea65f7ec4315ad6721cc672'


def digest(data):
    return sha256(data).hexdigest()


def build(base, source, out):
    if digest(base.read_bytes()) != BASE:
        raise ValueError('Requires the NOCTURNE 91 Orders archive')
    with ZipFile(base) as archive:
        names = archive.namelist()
        if len(names) != 502 or len(set(names)) != len(names):
            raise ValueError('Unexpected baseline archive')
        baseline = {name: archive.read(name) for name in names}
    files = baseline.copy()
    orders = 'admin/orders/'

    def replace(path, old, new):
        old, new = old.encode(), new.encode()
        if files[path].count(old) != 1:
            raise ValueError(f'Unexpected baseline {path}: {old!r}')
        files[path] = files[path].replace(old, new)

    replace(orders+'index.html','./app.mjs?build=nocturne91-orders','./app.mjs?build=nocturne91-eclipse')
    replace(orders+'index.html','</head>',
        '<link rel="stylesheet" href="./finance-workspace.css?build=nocturne91-eclipse"></head>')
    replace(orders+'app.mjs','./financial-order.mjs?build=nocturne90','./financial-order.mjs?build=nocturne91-eclipse')
    for name in ('financial-order.mjs','profitability.mjs','acquisition.mjs','financial-inputs.mjs','finance-workspace.css'):
        files[orders+name]=(source/name).read_bytes()

    changed=sorted(name for name,data in files.items() if baseline.get(name)!=data)
    if len(changed)!=7 or any(not name.startswith(orders) for name in changed):
        raise ValueError('Unexpected release scope')
    out.mkdir(parents=True,exist_ok=True)
    with ZipFile(out/'nocturne91-eclipse-static.zip','w') as archive:
        for name,data in sorted(files.items()):
            info=ZipInfo(name,(1980,1,1,0,0,0))
            info.external_attr=0o100644<<16
            archive.writestr(info,data,compress_type=ZIP_STORED)
    manifest={'files':len(files),'changed':changed,'inventory':{name:digest(data) for name,data in sorted(files.items())}}
    (out/'nocturne91-eclipse-inventory.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    print(f'{len(files)} files, {len(changed)} changed Orders files')


if __name__=='__main__':
    build(*(Path(a) for a in sys.argv[1:]))
