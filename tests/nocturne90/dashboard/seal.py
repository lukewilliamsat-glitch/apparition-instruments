"""Seal the business dashboard increment over the exact ECLIPSE archive."""
import json
import sys
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile, ZipInfo

BASE = '6a71564b30bbc2b3944debc9854a766bd8f454504a0006f7bfc8fad9877de2c8'


def digest(data):
    return sha256(data).hexdigest()


def build(base, source, out):
    if digest(base.read_bytes()) != BASE:
        raise ValueError('Requires the exact ECLIPSE production archive')
    with ZipFile(base) as archive:
        names = archive.namelist()
        if len(names) != 498 or len(set(names)) != len(names):
            raise ValueError('Unexpected baseline archive')
        baseline = {name: archive.read(name) for name in names}
    files = baseline.copy()

    def replace(path, old, new):
        if files[path].count(old) != 1:
            raise ValueError(f'Unexpected baseline {path}')
        files[path] = files[path].replace(old, new)

    omniscience='admin/omniscience/'
    overview='admin/overview/'
    styles=b'<link rel="stylesheet" href="/admin/nocturne.css?build=nocturne90"><link rel="stylesheet" href="/admin/business-dashboard.css?build=nocturne90-dashboard">'
    for page in (omniscience+'index.html',overview+'index.html'):
        replace(page,b'</head>',styles+b'</head>')
    replace(omniscience+'index.html',b'./entry.mjs?build=unification78b-c1',b'./entry.mjs?build=nocturne90-dashboard')
    replace(overview+'index.html',b'../overview.mjs?build=unification78b-81b1',b'../overview.mjs?build=nocturne90-dashboard')
    files[omniscience+'entry.mjs']=(source/'entry.mjs').read_bytes()
    files[omniscience+'dashboard.mjs']=(source/'dashboard.mjs').read_bytes()
    files['admin/overview.mjs']=(source/'overview.mjs').read_bytes()
    files['admin/business-dashboard.css']=(source/'dashboard.css').read_bytes()

    ironclad='admin/ironclad/'
    previous=b""" let view=root.ownerDocument.location.hash==='#suppliers'?'suppliers':'inventory',offset=0,filter={},request,epoch=0,ended=false,pendingId=null,mutation=false;"""
    updated=b""" const location=root.ownerDocument.location;
 const params=new URLSearchParams(location.search);
 let view=location.hash==='#suppliers'?'suppliers':params.get('view')==='purchases'?'purchases':'inventory';
 let offset=0,filter=view==='inventory'&&params.get('status')==='low'?{status:'low'}:{},request,epoch=0,ended=false,pendingId=null,mutation=false;"""
    replace(ironclad+'app.mjs',previous,updated)
    replace(ironclad+'entry.mjs',b'./app.mjs?build=nocturne89-nexus',b'./app.mjs?build=nocturne90-dashboard')
    replace(ironclad+'index.html',b'./entry.mjs?build=nocturne89-nexus',b'./entry.mjs?build=nocturne90-dashboard')

    changed=sorted(name for name in files if baseline.get(name)!=files[name])
    if len(changed)!=9 or any(not n.startswith('admin/') for n in changed):
        raise ValueError('Unexpected scope')
    out.mkdir(parents=True,exist_ok=True)
    with ZipFile(out/'nocturne90-dashboard-static.zip','w') as archive:
        for name,data in sorted(files.items()):
            info=ZipInfo(name,(1980,1,1,0,0,0))
            info.external_attr=0o100644<<16
            archive.writestr(info,data,compress_type=ZIP_STORED)
    manifest={'files':len(files),'changed':changed,'inventory':{n:digest(d) for n,d in sorted(files.items())}}
    (out/'nocturne90-dashboard-inventory.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    print(f'{len(files)} files, {len(changed)} Admin-only changes')


if __name__=='__main__':
    build(*(Path(a) for a in sys.argv[1:]))
