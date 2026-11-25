"""Create an isolated 84C-fixture overlay. The production archive is never used here."""
import json
import sys
from pathlib import Path, PurePosixPath
from zipfile import ZipFile
from build import ROOT,digest,once

STAGE_SHA='539df247ff7b7f06bd378f87fdc498be88ae6b4f7727cd50fc8d4a5e90e30904'

def stage_sql(source):
    start=source.index('do $preflight$')
    end=source.index('end $preflight$;',start)+len('end $preflight$;')
    source=source[:start]+"""do $fixture$
begin
  if to_regclass('quartermaster84c.fixture_orders') is null
     or to_regclass('quartermaster84c.fixture_suppliers') is null
     or to_regclass('quartermaster84c.test_members') is null
     or not exists(select from supabase_migrations.schema_migrations where version='20261124123950') then
    raise exception 'Expected the 84C fixture project';
  end if;
end $fixture$;"""+source[end:]
    pairs=[
        ("where o.fulfillment_applied_at","where exists(select from quartermaster84c.fixture_orders f where f.id=o.id) and o.fulfillment_applied_at"),
        ("r using(sku);","r using(sku) where m.sku like '84C-%';"),
        ("  created:=public.","  perform quartermaster84c.require_sku(p_sku);\n  created:=public."),
        ("  actor_id uuid := ironclad69.actor();\n  rights quartermaster84w.staff%rowtype;","  actor_id uuid := quartermaster84c.actor();\n  rights record;"),
        ("  select * into rights from quartermaster84w.staff where user_id=actor_id;","""  select coalesce(s.can_pack,false) can_pack, coalesce(s.can_receive,false) can_receive,
    coalesce(s.can_record_postage,false) can_record_postage,coalesce(f.can_approve,false) can_approve_finance
    into strict rights
    from (select actor_id as user_id) authenticated_actor
    left join quartermaster84w.staff s using(user_id)
    left join quartermaster84c.finance_staff f using(user_id);"""),
        ("from quartermaster79.purchase p join ironclad69.suppliers s on s.id=p.supplier\n          order by","from quartermaster79.purchase p join ironclad69.suppliers s on s.id=p.supplier\n          join quartermaster84c.fixture_suppliers fs on fs.id=s.id\n          where p.sku like '84C-%'\n          order by"),
        ("      where (p_sku is null or p.sku=p_sku)","      join quartermaster84c.fixture_suppliers fs on fs.id=s.id\n      where p.sku like '84C-%' and (p_sku is null or p.sku=p_sku)"),
        ("from ironclad69.suppliers s where strpos","from ironclad69.suppliers s join quartermaster84c.fixture_suppliers fs on fs.id=s.id where strpos"),
        ("from quartermaster79.purchase p where rights.can_receive","from quartermaster79.purchase p join quartermaster84c.fixture_suppliers fs on fs.id=p.supplier where rights.can_receive and p.sku like '84C-%'"),
        ("where rights.can_pack and l.action","where rights.can_pack and exists(select from quartermaster84c.fixture_orders f where f.id=o.id) and l.action"),
        ("where rights.can_record_postage\n      union","where rights.can_record_postage and exists(select from quartermaster84c.fixture_orders f where f.id=o.id)\n      union"),
    ]
    for old,new in pairs: source=once(source,old,new)
    return source.replace('quartermaster84w.finance_receipts','quartermaster84c.finance_receipts')

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
        "  register: ['POST','quartermaster86_register'],\n  hq: ['GET','quartermaster86_page'],")
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
    (out/'stage.review.sql').write_text(stage_sql((ROOT/'workspace.review.sql').read_text()))

if __name__=='__main__':
    build_stage(Path(sys.argv[1]),Path(sys.argv[2]))
