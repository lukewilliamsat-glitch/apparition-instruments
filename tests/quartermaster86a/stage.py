"""Create an isolated 84C-fixture overlay. The production archive is never used here."""
import json
import sys
from pathlib import Path, PurePosixPath
from zipfile import ZipFile
from build import ROOT,digest,once

STAGE_SHA='539df247ff7b7f06bd378f87fdc498be88ae6b4f7727cd50fc8d4a5e90e30904'

def build_stage(source,out):
    if digest(source.read_bytes())!=STAGE_SHA:
        raise ValueError('Expected the exact 84C fixture archive')
    with ZipFile(source) as archive:
        names=archive.namelist()
        if len(names)!=18 or len(set(names))!=18 or any(PurePosixPath(n).is_absolute() or '..' in PurePosixPath(n).parts for n in names):
            raise ValueError('Unexpected stage inventory')
        assets={name:archive.read(name) for name in names}
    entry=assets['entry.mjs'].decode()
    entry="import { mountHQ } from './hq.mjs';\n"+entry
    entry=once(entry," nav.append(link('Orders','/admin/orders/'),link('DOMINION'", " nav.append(link('Orders','/admin/orders/'),link('QUARTERMASTER','/admin/quartermaster/'),link('DOMINION'")
    entry=once(entry," const panel=node('div');area.append(panel);",""" const panel=node('div');area.append(panel);
 if(route==='/admin/quartermaster/'&&!id){
  activeWorkshop=mountHQ({document,root:panel,request});return;
 }""")
    entry=once(entry,"  const suppliers=await call('suppliers');\n","")
    entry=once(entry,"orderId:id,request,suppliers","orderId:id,request")
    assets['entry.mjs']=entry.encode()
    workshop=once(assets['workshop.mjs'].decode(),"  material: ['POST','quartermaster84w_create_material'],",
        "  register: ['POST','quartermaster86_register'],\n  hq: ['GET','quartermaster86_page'],\n  detail: ['GET','quartermaster86a_detail'],\n  change: ['POST','quartermaster86a_change'],")
    workshop=once(workshop,'request, suppliers=[], makeRequestId','request, makeRequestId')
    begin=workshop.index('    if(o.canReceive) {')
    end=workshop.index('\n  }\n  async function load()',begin)
    workshop=workshop[:begin]+"""    if(o.canReceive) {
      const stock=section('Packaging management');
      for(const [label,target] of [['Manage packaging','packaging'],['Receive packaging stock','purchasing']]) {
        const a=el('a',label);
        a.href='/admin/quartermaster/?'+new URLSearchParams({section:target,fromOrder:orderId});
        stock.append(a);
      }
    }"""+workshop[end:]
    assets['workshop.mjs']=workshop.encode()
    hq=(ROOT/'hq.mjs').read_text()
    hq=once(hq,"root.replaceChildren(header,nav,status,main);","""header.append(el('p','Staging fixtures. Register packaging SKUs with the 84C- prefix.'));
  root.replaceChildren(header,nav,status,main);""")
    hq=once(hq,"body.append(link('Manage suppliers in IRONCLAD','/admin/ironclad/#suppliers'));",
        "body.append(el('p','Supplier maintenance uses IRONCLAD in the production Admin.'));")
    assets['hq.mjs']=hq.encode()
    assets['manage.mjs']=(ROOT/'manage.mjs').read_bytes()
    assets['stage.css']+=b'\n'+(ROOT/'hq.css').read_bytes().replace(b'#quartermaster-workshop ',b'')
    out.mkdir(parents=True,exist_ok=True)
    inventory=[]
    for name,data in sorted(assets.items()):
        if b'acdxpxvksvdwfajntzfx' in data:
            raise ValueError('Production reference in staging assets')
        path=out/'site'/name
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(data)
        inventory.append({'path':name,'bytes':len(data),'sha256':digest(data)})
    (out/'stage-inventory.json').write_text(json.dumps(inventory,separators=(',',':'))+'\n')

if __name__=='__main__':
    build_stage(Path(sys.argv[1]),Path(sys.argv[2]))
