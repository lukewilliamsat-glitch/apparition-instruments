"""Assemble the exact additive release migration from pinned reviewed sources."""
from hashlib import sha256
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
PINS = {
    'tests/dominion78c/quartermaster79.sql':'208cf52b19d4033390bb59b84319647966475118891ec585753b2e0a5ef1b81d',
    'tests/quartermaster84w/writer-core.review.sql':'e403818bb73283f4871b9d2fb2baca9f5e980f376e5dd729bcecd12c077a1026',
    'tests/quartermaster84w/writer-context.review.sql':'7e2fa0016326144de6884984181637c231e7e3cf47a5f934ce3a0b3627a8d241',
}
def checked(repo, name):
    data = (repo/name).read_bytes()
    if sha256(data).hexdigest() != PINS[name]:
        raise ValueError(name)
    return data.decode()

def body(source):
    return source.split('\nbegin;\n',1)[1].rsplit('\ncommit;',1)[0]

def build(repo):
    historical, core, context = [checked(repo,name) for name in PINS]
    helpers = [re.search(r'create function quartermaster79\.'+name+r'\([\s\S]+?\nend \$\$;',historical)[0]
               for name in ('receive','complete')]
    pre_receipt = '  created := quartermaster79.receive'
    if core.count(pre_receipt) != 1:
        raise ValueError('Unexpected receipt writer')
    core = core.replace(pre_receipt, """  if not exists(select from quartermaster84w.receipt_actor where purchase_id=p_id and actor=member) then
    perform 1 from ironclad69.suppliers where id=p_supplier and active for share;
    if not found then raise exception 'Select an active supplier' using errcode='22023'; end if;
  end if;
""" + pre_receipt)
    return '\n\n'.join([
        'begin;\nset local lock_timeout = \'3s\';\nset local statement_timeout = \'20s\';',
        (ROOT/'preflight.sql').read_text(), *helpers,
        'revoke all on all functions in schema quartermaster79 from public,anon,authenticated,service_role;',
        body(core), body(context), (ROOT/'integration.sql').read_text(), 'commit;',''])

if __name__=='__main__':
    Path(sys.argv[2]).write_text(build(Path(sys.argv[1])))
