"""Build exact Admin-only overlays on the accepted 85A static archive."""
import json
import re
import sys
from hashlib import sha256
from pathlib import Path, PurePosixPath
from zipfile import ZipFile, ZipInfo, ZIP_STORED

ROOT = Path(__file__).resolve().parent
BASE_SHA = '3312915d6b4659117ad348e64e1cf6b90d7efea19e6bcbf8289e3de071ec64bf'

def digest(data):
    return sha256(data).hexdigest()

def once(source, old, new):
    if source.count(old) != 1:
        raise ValueError('Accepted source drift: ' + old)
    return source.replace(old, new)

def build(source, out):
    if digest(source.read_bytes()) != BASE_SHA:
        raise ValueError('Expected the exact 85A archive')
    with ZipFile(source) as archive:
        names = archive.namelist()
        if len(names) != 493 or len(set(names)) != 493 or any(
            PurePosixPath(n).is_absolute() or '..' in PurePosixPath(n).parts for n in names):
            raise ValueError('Unexpected 85A inventory')
        base = {name:archive.read(name) for name in names}
    files = base.copy()
    qm = 'admin/quartermaster/'
    def replace(path, old, new):
        files[path] = once(files[path].decode(),old,new).encode()

    application = 'admin/application.mjs'
    replace(application, " ['dominion','Stock & packing status'", """ ['quartermaster','QUARTERMASTER','/admin/quartermaster/','Stock & purchasing'],
 ['dominion','Stock & packing status'""")
    replace(application, ' dominion:', " quartermaster:'Manage packaging inventory, purchasing, suppliers and the packing queue.',\n dominion:")
    replace(application, "if(p.startsWith('/admin/quartermaster/'))return 'orders';", "if(p.startsWith('/admin/quartermaster/'))return 'quartermaster';")
    gate = 'admin/admin-gate.mjs'
    replace(gate,'./application.mjs?build=quartermaster84-observe1','./application.mjs?build=quartermaster86')
    for name,data in base.items():
        if name.startswith('admin/') and name.endswith('.html') and b'admin-gate.mjs?' in data:
            files[name] = re.sub(rb'admin-gate\.mjs\?build=[\w-]+',b'admin-gate.mjs?build=quartermaster86',data)
    replace(qm+'index.html','./entry.mjs?build=quartermaster84d','./entry.mjs?build=quartermaster86')
    replace(qm+'index.html','./workspace.css?build=82-workshop','./workspace.css?build=quartermaster86')
    replace('admin/ironclad/index.html','./entry.mjs?build=unification78b-c1','./entry.mjs?build=quartermaster86')
    replace('admin/ironclad/entry.mjs','./app.mjs?build=unification78b-81b1','./app.mjs?build=quartermaster86')
    replace('admin/ironclad/app.mjs',"let view='inventory',offset=0",
        "let view=root.ownerDocument.location.hash==='#suppliers'?'suppliers':'inventory',offset=0")
    files[qm+'workspace.css'] += b'\n'+(ROOT/'hq.css').read_bytes()
    files[qm+'hq.mjs'] = (ROOT/'hq.mjs').read_bytes()

    entry = qm+'entry.mjs'
    files[entry] = b"import { mountHQ } from './hq.mjs?build=quartermaster86';\n"+files[entry]
    replace(entry, "  const orderSelected = uuid.test(orderId ?? '');", """  if (!orderId) {
    const request = productionTransport({backend:config,auth,boundedJSON,
      fetcher:document.defaultView.fetch.bind(document.defaultView)});
    return mountHQ({document,root,request});
  }
  const orderSelected = uuid.test(orderId ?? '');""")
    production = qm+'production.mjs'
    replace(production,"  const suppliers = access.receive === true && access.mode === 'workshop'\n    ? await request('suppliers', {}, timeout()) : [];\n","")
    replace(production, 'orderId, request, suppliers','orderId, request')
    workshop = qm+'workshop.mjs'
    replace(workshop,"  material: ['POST','quartermaster84w_create_material'],",
        "  register: ['POST','quartermaster86_register'],\n  hq: ['GET','quartermaster86_page'],")
    replace(workshop,'request, suppliers=[], makeRequestId','request, makeRequestId')
    replace(workshop,"  root.replaceChildren(back,el('h1','Quartermaster'),status,view);", """  const hq=el('a','QUARTERMASTER packing queue');
  hq.href='/admin/quartermaster/?section=queue';
  const links=el('nav');links.className='qm-nav';links.setAttribute('aria-label','Packing navigation');
  links.append(back,hq);
  root.replaceChildren(links,el('h1','Quartermaster'),status,view);""")
    start=files[workshop].index(b'    if(o.canReceive) {')
    end=files[workshop].index(b'\n  }\n  async function load()',start)
    files[workshop]=files[workshop][:start]+b"""    if(o.canReceive) {
      const stock=section('Packaging management');
      for(const [label,target] of [['Manage packaging','packaging'],['Receive packaging stock','purchasing']]) {
        const a=el('a',label);
        a.href='/admin/quartermaster/?'+new URLSearchParams({section:target,fromOrder:orderId});
        const row=el('p');row.append(a);stock.append(row);
      }
    }"""+files[workshop][end:]
    for filename in ('entry.mjs','production.mjs'):
        f=qm+filename
        files[f]=files[f].replace(b'?build=quartermaster84d',b'?build=quartermaster86')

    changed=sorted(n for n,d in files.items() if base.get(n)!=d)
    if not all(n.startswith('admin/') for n in changed) or len(files)!=494:
        raise ValueError('Unexpected release scope')
    out.mkdir(parents=True,exist_ok=True)
    with ZipFile(out/'quartermaster86-static.zip','w') as archive:
        for name,data in sorted(files.items()):
            item=ZipInfo(name,(1980,1,1,0,0,0))
            item.external_attr=0o100644<<16
            archive.writestr(item,data,compress_type=ZIP_STORED)
    manifest={'files':len(files),'changed':changed,'inventory':{n:digest(d) for n,d in sorted(files.items())}}
    (out/'inventory.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    print(f'{len(files)} files, {len(changed)} Admin-only changes')

if __name__=='__main__':
    build(Path(sys.argv[1]),Path(sys.argv[2]))
