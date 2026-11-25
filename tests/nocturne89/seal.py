"""Produce a deterministic Admin-only release over the exact 86A archive."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile, ZipInfo

BASE_HASH = '99ce4f0600d1cdcbb803c6eadee6478785603c06b241ba26c58ba78fd68debdc'
BUILD = 'nocturne89-nexus'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def substitution(data, old, new):
    if data.count(old) != 1:
        raise ValueError(f'Unexpected baseline for {old}')
    return data.replace(old, new)


def build(base, sources, out):
    if sha(base.read_bytes()) != BASE_HASH:
        raise ValueError('Expected sealed QUARTERMASTER 86A archive')
    with ZipFile(base) as archive:
        original = {name: archive.read(name) for name in archive.namelist()}
        if len(original) != 495 or len(archive.namelist()) != len(original):
            raise ValueError('Unexpected base archive inventory')
    files = original.copy()

    def replace(path, old, new):
        files[path] = substitution(files[path].decode(), old, new).encode()

    ironclad = 'admin/ironclad/'
    app = (sources / 'ir').read_text()
    live = original[ironclad+'app.mjs'].decode()
    app = substitution(app, "'./model.mjs'", f"'./model.mjs?build={BUILD}'")
    app = substitution(app, "let view='inventory',offset=0", "let view=root.ownerDocument.location.hash==='#suppliers'?'suppliers':'inventory',offset=0")
    prod_links = next(line.strip() for line in live.splitlines() if "calc.href='/admin/ironclad/calculator/'" in line)
    app = substitution(app, """if(fixture){note.textContent='Protected preview · fictional records · browser-local changes only';head.append(note);}
 else{const a=el('a','Return to Inventory');a.href='/admin/';head.append(a);}""", prod_links)
    app = substitution(app, "  if(fixture)box.append(el('p','Example: enter fixture-order-001 above and load the fictional 2-unit batch cost. Real finance documents are not accessed.'));\n", '')
    files[ironclad+'app.mjs'] = app.encode()
    files[ironclad+'model.mjs'] = (sources/'model').read_bytes()
    replace(ironclad+'entry.mjs', './app.mjs?build=quartermaster86a', f'./app.mjs?build={BUILD}')
    replace(ironclad+'index.html', './entry.mjs?build=quartermaster86a', f'./entry.mjs?build={BUILD}')

    qm = 'admin/quartermaster/'
    files[qm+'workshop.mjs'] = (sources/'qm').read_bytes()
    replace(qm+'production.mjs', './workshop.mjs?build=quartermaster86a', f'./workshop.mjs?build={BUILD}')
    for dependency in ('workshop', 'production'):
        replace(qm+'entry.mjs', f'./{dependency}.mjs?build=quartermaster86a', f'./{dependency}.mjs?build={BUILD}')
    replace(qm+'index.html', './entry.mjs?build=quartermaster86a', f'./entry.mjs?build={BUILD}')

    # Keep calculator routing and breadcrumb context and remove only its sidebar item.
    application = 'admin/application.mjs'
    replace(application, 'for(const r of adminRoutes){if(r.group', "for(const r of adminRoutes){if(r.id==='landed-cost')continue;if(r.group")
    replace(application, "['quartermaster','QUARTERMASTER','/admin/quartermaster/'", "['quartermaster','QUARTERMASTER: Workshop & fulfilment','/admin/quartermaster/'")
    replace('admin/admin-gate.mjs','./application.mjs?build=quartermaster86a',f'./application.mjs?build={BUILD}')
    for name in files:
        if name.startswith('admin/') and name.endswith('.html'):
            files[name] = re.sub(rb'admin-gate\.mjs\?build=quartermaster86a',f'admin-gate.mjs?build={BUILD}'.encode(),files[name])

    changed = sorted(name for name in files if files[name] != original[name])
    if not changed or any(not name.startswith('admin/') for name in changed):
        raise ValueError('Unexpected release scope')
    out.mkdir(parents=True, exist_ok=True)
    with ZipFile(out/'nocturne89-static.zip','w') as archive:
        for name,data in sorted(files.items()):
            item = ZipInfo(name,(1980,1,1,0,0,0))
            item.external_attr = 0o100644<<16
            archive.writestr(item,data,compress_type=ZIP_STORED)
    manifest = {'files': len(files), 'changed': changed,
                'inventory': {name: sha(data) for name,data in sorted(files.items())}}
    (out/'nocturne89-inventory.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    print(f'{len(files)} files, {len(changed)} Admin-only changes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('base',type=Path)
    parser.add_argument('sources',type=Path)
    parser.add_argument('out',type=Path)
    args = parser.parse_args()
    build(args.base,args.sources,args.out)
