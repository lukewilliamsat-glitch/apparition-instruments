import argparse
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PINS = {
    'tests/dominion78c/ironheart80-stage-a.review.sql': '1e4f79c5a4e321b0e80450b10adf72b80ae3adb5b51dc1c09554c3811e6942de',
    'tests/stageb81/stageb81.read.review.sql': '73cf2dd78c475cab34c6b0e3d47b81b4a4e44dd4aedfeaeb7f8dd283caf4e124',
    'tests/quartermaster84/observe.review.sql': '6a7279540a84a97363b2a2e6139aecff54ee3dfa24f500fd3920d9446a84b0f2',
    'tests/dominion78c/quartermaster79.sql': '208cf52b19d4033390bb59b84319647966475118891ec585753b2e0a5ef1b81d',
    'tests/quartermaster84w/writer-core.review.sql': 'e403818bb73283f4871b9d2fb2baca9f5e980f376e5dd729bcecd12c077a1026',
    'tests/quartermaster84w/writer-context.review.sql': '7e2fa0016326144de6884984181637c231e7e3cf47a5f934ce3a0b3627a8d241',
}

def replace_once(text, original, replacement):
    assert text.count(original) == 1, original
    return text.replace(original, replacement)

def body(source):
    return source.split('\nbegin;\n', 1)[1].rsplit('\ncommit;', 1)[0]

def assemble(repo):
    pulled = []
    for name, expected in PINS.items():
        content = (repo / name).read_bytes()
        assert hashlib.sha256(content).hexdigest() == expected, name
        pulled.append(content.decode())
    dormant, dominion_read, observe_read, historical, core, context = pulled
    unity = dormant[dormant.index('create schema dominion79;'):dormant.index('create table dominion79.consuming(')]
    unity += '\n'.join(f'alter table dominion79.{name} enable row level security;'
                      for name in ('lifecycle_control','holds','hold_lines','active_units'))
    unity += '\nrevoke all on all tables in schema dominion79 from public,anon,authenticated,service_role;'
    tables = dormant[dormant.index('create schema quartermaster79;'):dormant.rindex('commit;')]
    helpers = [re.search(r'create function quartermaster79\.'+name+r'\([\s\S]+?\nend \$\$;',historical)[0]
               for name in ('receive','complete')]
    first = replace_once(body(dominion_read), 'perform ironclad69.actor();', 'perform quartermaster84c.actor();')
    reader = body(observe_read)
    reader = replace_once(reader, '  perform ironclad69.actor();', '  perform quartermaster84c.actor();\n  perform quartermaster84c.require_order(p_order);')
    writer = body(core).replace('ironclad69.actor()', 'quartermaster84c.actor()')
    writer = replace_once(writer, "('disabled', 'workshop', 'drain')", "('disabled', 'observe', 'workshop', 'drain')")
    writer = replace_once(writer, "  perform quartermaster84w.check_mode(false);",
                          "  perform quartermaster84w.check_mode(false);\n  perform quartermaster84c.require_sku(p_sku);\n  perform quartermaster84c.require_supplier(p_supplier);")
    writer = replace_once(writer, "  perform quartermaster84w.check_mode(operation = 'release');",
                          "  perform quartermaster84w.check_mode(operation = 'release');\n  perform quartermaster84c.require_order(p_order);")
    writer = replace_once(writer, "    material_sku := p_action ->> 'sku';", "    material_sku := p_action ->> 'sku';\n    perform quartermaster84c.require_sku(material_sku);")
    workshop = replace_once(body(context), 'ironclad69.actor()', 'quartermaster84c.actor()')
    workshop = replace_once(workshop, "  perform quartermaster84w.check_mode(false);",
                            "  perform quartermaster84w.check_mode(false);\n  perform quartermaster84c.require_sku(p_sku);")
    workshop = replace_once(workshop, "  select * into ord from public.orders", "  perform quartermaster84c.require_order(p_order);\n  select * into ord from public.orders")
    workshop = replace_once(workshop, "if rollout = 'disabled' then return jsonb_build_object('schema',1,'mode',rollout,'order',null);",
                            "if rollout in ('disabled','observe') then return jsonb_build_object('schema',1,'mode','disabled','order',null);")
    pieces = [(ROOT/'db/foundation.sql').read_text(), unity, tables, first, reader, *helpers,
              'revoke all on all functions in schema quartermaster79 from public,anon,authenticated,service_role;',
              writer, workshop, (ROOT/'db/handoff.sql').read_text(), (ROOT/'db/seed.sql').read_text()]
    return "-- 84C staging only, single atomic installation and fixture seed.\nbegin;\nset local lock_timeout='3s';\nset local statement_timeout='20s';\n"+'\n\n'.join(pieces)+'\ncommit;\n'

if __name__ == '__main__':
    p=argparse.ArgumentParser()
    p.add_argument('source',type=Path)
    p.add_argument('output',type=Path)
    args=p.parse_args()
    args.output.write_text(assemble(args.source))
