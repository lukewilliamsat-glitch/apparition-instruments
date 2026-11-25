"""Build the exact ECLIPSE-only Admin release from the verified NOCTURNE 89 archive."""
import argparse
import json
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile, ZipInfo

BASE = '8308c7fe278f1edd3dd90582dbaebee019336c47c12eacfc8e1a49f1db807800'


def digest(value):
    return sha256(value).hexdigest()


def build(base, source, out):
    if digest(base.read_bytes()) != BASE:
        raise ValueError('Requires the exact NOCTURNE 89 production archive')
    with ZipFile(base) as zipped:
        names = zipped.namelist()
        if len(names) != 495 or len(set(names)) != len(names):
            raise ValueError('Unexpected baseline inventory')
        files = {name: zipped.read(name) for name in names}
    original = files.copy()

    def replace(file, old, new):
        if files[file].count(old) != 1:
            raise ValueError(f'Unexpected baseline in {file}')
        files[file] = files[file].replace(old,new)

    orders = 'admin/orders/'
    replace(orders+'index.html', b'./app.mjs?build=quartermaster84-observe1', b'./app.mjs?build=nocturne90')
    replace(orders+'index.html', b'<link rel="stylesheet" href="./eclipse.css?build=sentinel77a-c1">',
            b'<link rel="stylesheet" href="./eclipse.css?build=sentinel77a-c1"><link rel="stylesheet" href="/admin/nocturne.css?build=nocturne90">')
    replace(orders+'app.mjs', b'./financial-order.mjs?build=ascent78b-v1',b'./financial-order.mjs?build=nocturne90')
    for file in ('financial-order.mjs','profitability.mjs'):
        files[orders+file]=(source/file).read_bytes()
    for file in ('nocturne-ui.mjs','nocturne.css'):
        files['admin/'+file]=(source/file).read_bytes()

    changed = sorted(name for name in files if original.get(name) != files[name])
    if changed != [
      'admin/nocturne-ui.mjs','admin/nocturne.css',
      'admin/orders/app.mjs','admin/orders/financial-order.mjs','admin/orders/index.html','admin/orders/profitability.mjs'
    ]:
        raise ValueError('Unexpected release scope')
    out.mkdir(parents=True,exist_ok=True)
    with ZipFile(out/'nocturne90-eclipse-static.zip','w') as zipped:
        for name,data in sorted(files.items()):
            item = ZipInfo(name,(1980,1,1,0,0,0))
            item.external_attr = 0o100644<<16
            zipped.writestr(item,data,compress_type=ZIP_STORED)
    manifest = {'files':len(files),'changed':changed,'inventory':{name:digest(data) for name,data in sorted(files.items())}}
    (out/'nocturne90-eclipse-inventory.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    print(f'{len(files)} files, {len(changed)} Admin-only changes')


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('base',type=Path)
    parser.add_argument('sources',type=Path)
    parser.add_argument('out',type=Path)
    args=parser.parse_args()
    build(args.base,args.sources,args.out)
