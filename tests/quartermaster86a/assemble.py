"""Assemble one production migration and a separate 84C fixture upgrade."""
from pathlib import Path
import re
import sys
from hashlib import sha256

ROOT=Path(__file__).resolve().parent

def once(source,old,new):
    if source.count(old)!=1:
        raise ValueError('Accepted source drift: '+old)
    return source.replace(old,new)

def page(source):
    text=re.search(r'create function public\.quartermaster86_page\([\s\S]+?\nend \$\$;',source)[0]
    text=text.replace('create function','create or replace function',1)
    replacements=[
      ("'all','low','awaiting'", "'all','low','archived','awaiting'"),
      ("where available<=reorder_at)", "where available<=reorder_at and not exists(select from quartermaster86.material_state a where a.sku=stock.sku and a.archived))"),
      ("from quartermaster86.stock) end", "from quartermaster86.stock where not exists(select from quartermaster86.material_state a where a.sku=stock.sku and a.archived)) end"),
      ("'latest_batch_minor',b.total_minor", "'display_sku',coalesce(ms.display_sku,m.sku),'archived',coalesce(ms.archived,false),'latest_batch_minor',b.total_minor"),
      ("left join quartermaster86.descriptions d using(sku)", "left join quartermaster86.descriptions d using(sku)\n      left join quartermaster86.material_state ms using(sku)"),
      ("and (p_filter<>'low' or m.available<=m.reorder_at)", """and (p_filter<>'low' or m.available<=m.reorder_at and not coalesce(ms.archived,false))
        and (p_filter<>'archived' or coalesce(ms.archived,false))
        and (p_section<>'choices' or not coalesce(ms.archived,false))"""),
      ("strpos(lower(m.sku||' '||m.title),query_text)>0", """(strpos(lower(m.sku||' '||m.title||' '||coalesce(ms.display_sku,'')),query_text)>0
          or exists(select from quartermaster86.sku_names a where a.sku=m.sku and strpos(lower(a.name),query_text)>0))"""),
      ("jsonb_build_object('sku',p.sku,'title',left(m.title,120)", """jsonb_build_object('id',p.id,'sku',p.sku,'display_sku',coalesce(ms.display_sku,p.sku),
        'replacement',exists(select from quartermaster86.inventory_audit a where a.action='batch-cost' and a.after_state#>>'{replacement,id}'=p.id::text),
        'reversed',exists(select from quartermaster86.inventory_audit a where a.action='reverse-receipt' and a.purchase_id=p.id),'title',left(m.title,120)"""),
      ("join quartermaster79.material m on m.sku=p.sku", "join quartermaster79.material m on m.sku=p.sku\n      left join quartermaster86.material_state ms on ms.sku=p.sku"),
      ("          order by p.received_at desc,p.id desc limit 5) k)", """          and exists(select from quartermaster79.movement mv where mv.purchase_id=p.id and mv.kind='purchase')
          order by p.received_at desc,p.id desc limit 5) k)"""),
      ("and strpos(lower(p.reference||' '||p.sku||' '||s.name),query_text)>0", """and (strpos(lower(p.reference||' '||p.sku||' '||coalesce(ms.display_sku,'')||' '||s.name),query_text)>0
          or exists(select from quartermaster86.purchase_names n where n.purchase_id=p.id and strpos(lower(n.reference),query_text)>0))"""),
      ("    ), page as (\n      select * from entries", """      union all
      select 'adjustment',a.recorded_at,a.request_id::text,null,a.sku,null,null
      from quartermaster86.inventory_audit a where rights.can_receive
    ), page as (
      select * from entries"""),
    ]
    for old,new in replacements:
        if old.startswith("          order by p.received_at desc"):
            # Both production and staging use the immutable movement as evidence of an acquisition.
            if "          where p.sku like '84C-%'\n" not in text:
                new=new.replace("          and exists","          where exists",1)
        if old=="from quartermaster86.stock) end":
            if text.count(old)!=2: raise ValueError(old)
            text=text.replace(old,new)
        else: text=once(text,old,new)
    return text

def workspace(text):
    text=text.replace('CREATE OR REPLACE FUNCTION','create or replace function',1)
    text=text.replace('create function','create or replace function',1)
    text=once(text,"'sku',m.sku,'title',left(m.title,120)", "'sku',m.sku,'title',left(coalesce(ms.display_sku || ' · ', '') || m.title,120)")
    text=once(text,"from (select * from quartermaster79.material order by sku limit 25) m;",
        """from (select m.* from quartermaster79.material m
      where not exists (select from quartermaster86.material_state s where s.sku=m.sku and s.archived)
      order by (m.quantity-(select count(*) from quartermaster79.packing p where p.sku=m.sku and p.state='reserved')>0) desc,m.sku
      limit 25) m
      left join quartermaster86.material_state ms using(sku);""")
    return text

def build(base,writer,out,staging=False):
    original=base.read_text()
    add=(ROOT/'inventory.review.sql').read_text()
    add=add[add.index('create table'):add.rindex('commit;')]
    if staging:
        add=add.replace("  data:=quartermaster86.snapshot(p_sku,p_batch);","  perform quartermaster84c.require_sku(p_sku);\n  data:=quartermaster86.snapshot(p_sku,p_batch);")
        add=add.replace("  select * into strict m from quartermaster79.material","  perform quartermaster84c.require_sku(p_sku);\n  select * into strict m from quartermaster79.material")
        add=add.replace("perform quartermaster84w.finance_actor();","perform quartermaster84c.finance_actor(true);")
        add=add.replace("    material_title:=", "    perform quartermaster84c.require_sku(corrected_sku);\n    material_title:=")
        header="""begin;
set local lock_timeout='3s';
set local statement_timeout='20s';
do $fixture$
begin
  if not exists(select from supabase_migrations.schema_migrations where version='20261125105741')
     or to_regclass('quartermaster84c.fixture_orders') is null then
    raise exception 'Expected exact War Room staging source';
  end if;
end $fixture$;
"""
    else:
        if sha256(original.encode()).hexdigest()!='ce5451351ecb8500475e599207fb44915cdf565cfe976bffb97f5c6abaf4dd4b':
            raise ValueError('Expected accepted 86 base SQL')
        header=original[:original.rindex('commit;')]
    definition=re.search(r'create function public\.quartermaster84w_workspace\([\s\S]+?\n\$\$;',writer.read_text(),re.I)
    if not definition:
        raise ValueError('Expected original workspace definition')
    out.write_text(header+'\n'+add+'\n'+page(original)+'\n'+workspace(definition[0])+'\ncommit;\n')

if __name__=='__main__':
    build(Path(sys.argv[1]),Path(sys.argv[2]),Path(sys.argv[3]),'--stage' in sys.argv[4:])
