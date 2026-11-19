"""Synthetic comparison of metadata proof, business checks and residual analysis."""
import contextlib
import hashlib
import io
import json
import pathlib
import tempfile
from unittest.mock import patch

import anchor
from test_final_two import digest_and_key

ROLE_SMOKE = """
GRANT USAGE ON SCHEMA auth TO authenticated;
SET LOCAL ROLE authenticated;
SET LOCAL anchor.fixture_uid = '00000000-0000-4000-8000-000000000001';
SELECT count(*) FROM public.order_financial_records;
SET LOCAL anchor.fixture_uid = '00000000-0000-4000-8000-000000000002';
SELECT count(*) FROM public.order_financial_records;
RESET ROLE;
SELECT has_table_privilege('anon','public.order_financial_records','SELECT');
"""
SIG = """
SELECT jsonb_build_object('inventory',(SELECT jsonb_agg(jsonb_build_array(component_id,quantity) ORDER BY component_id COLLATE "C") FROM public.inventory),
'orders',(SELECT jsonb_agg(jsonb_build_array(id,note) ORDER BY id) FROM public.orders),
'financial',(SELECT jsonb_agg(jsonb_build_array(order_id) ORDER BY order_id) FROM public.order_financial_records));
"""
PROTECTED=('anchor_o_regex','anchor_o_fictional','private-fixture-needle','demo','extensions','public','oid=', 'SELECT ')


def business_probe(env,proof_sql):
    def call(sql):
        return anchor.psql(sql,env,'synthetic contract query failed')
    assert call('BEGIN;'+ROLE_SMOKE+'ROLLBACK;')==b'1\n0\nf'
    weak_before,strong_before=call(anchor.v2_read(proof_sql)),call(anchor.v2_read(SIG))
    # Stable identities, row counts, foreign-key joins, policies, triggers and
    # metadata do not establish complete data value equivalence.
    weak_after=call("BEGIN;UPDATE public.orders SET note='private-fixture-needle';"
                    "UPDATE public.inventory SET quantity=quantity+1;"+proof_sql+"\nROLLBACK;")
    strong_after=call("BEGIN;UPDATE public.orders SET note='private-fixture-needle';"
                      "UPDATE public.inventory SET quantity=quantity+1;"+SIG+"\nROLLBACK;")
    assert weak_before==weak_after
    assert hashlib.sha256(strong_before).digest()!=hashlib.sha256(strong_after).digest()
    broken=call('BEGIN;ALTER POLICY admin_finance ON public.order_financial_records USING (true);'+ROLE_SMOKE+'ROLLBACK;')
    assert broken==b'1\n1\nf'
    # The weak model misses changed data; application check notices changed access.
    print('PASS comparative contract: all 14 original groups missed same-count value mutations; critical-value digest and role smoke independently rejected data/access mutations.')
    return strong_before


def main():
    with tempfile.TemporaryDirectory(dir='/work') as td:
        root=pathlib.Path(td)
        source,exchange,target=(root/x for x in ('source','exchange','target'))
        for p in (source,exchange,target): p.mkdir()
        recipient,key=digest_and_key(root)
        proof_sql=(anchor.HOME/'proof-v2.sql').read_text()
        run=anchor.git_run()
        with patch.object(anchor,'EXCHANGE',exchange):
            db,env=anchor.start_local(source,'anchor_fixture_source')
            try:
                for fixture in ('fixture.sql','fixture-v2.sql','fixture-final-two.sql','fixture-constraint74m.sql','fixture-constraint74o.sql'):
                    anchor.psql((anchor.HOME/fixture).read_text(),env,'fictional fixture load failed')
                before=business_probe(env,proof_sql)
                with tempfile.TemporaryDirectory(dir=root) as clean:
                    anchor.capture(source,env,[recipient],'synthetic',version=2)
                    clean_path=pathlib.Path(clean)
                    base=anchor.verify_v2_final
                    def post(anticipated,actual,target_env,dump,**opts):
                        assert anchor.psql(anchor.v2_read(SIG),target_env,'synthetic target signature failed')==before
                        assert anchor.psql('BEGIN;'+ROLE_SMOKE+'ROLLBACK;',target_env,
                                           'synthetic target role smoke failed')==b'1\n0\nf'
                        return base(anticipated,actual,target_env,dump,**opts)
                    with patch.object(anchor,'verify_v2_final',side_effect=post):
                        anchor.restore(clean_path,'synthetic',key,anchor.sha(exchange/'backup.age'),run,2,
                                       semantic=True,classified=True,evidence=True)
                    assert len(json.loads((exchange/'restore.json').read_text())['checks'])==14
                    (exchange/'restore.json').unlink()
                    print('PASS functional recovery prototype on an actual encrypted synthetic restore: critical values and allowed/denied role paths reproduced.')
                orig=anchor.psql
                def synthetic_changed_source(query,env,step):
                    output=orig(query,env,step)
                    if proof_sql in query:
                        doc=json.loads(output)
                        row=next(rec for rec in doc['constraints'] if rec['conname']=='anchor_o_regex')
                        row['rule']="CHECK (rule_text ~ 'private-fixture-needle')"
                        return json.dumps(doc).encode()
                    return output
                with patch.object(anchor,'psql',side_effect=synthetic_changed_source):
                    anchor.capture(source,env,[recipient],'synthetic',version=2)
            finally:
                anchor.stop_local(db)
            o=io.StringIO()
            with contextlib.redirect_stdout(o):
                try:
                    anchor.restore(target,'synthetic',key,anchor.sha(exchange/'backup.age'),run,
                                   2,semantic=True,classified=True,evidence=True)
                except anchor.Refusal as err:
                    assert 'native_structure_mismatch=1' in str(err)
                else:
                    raise AssertionError('residual mutation accepted')
            line=o.getvalue().strip()
            assert line.startswith('CLOUD ANCHOR bounded residual: ')
            assert all(v not in line for v in PROTECTED),'private source information in witness'
            report=json.loads(line.split(': ',1)[1])
            assert report['schema_only']=='found'
            assert report['schema_render_equals_full'] and report['schema_validation_equals_full']
            assert report['full_against_self']['outcome']=='native_equivalent'
            assert report['schema_against_self']['outcome']=='native_equivalent'
            assert report['sealed_against_full']['typed_first_difference']=='constant'
            assert report['sealed_against_schema']['typed_first_difference']=='constant'
            assert not (exchange/'restore.json').exists()
            print('PASS targeted evidence: independent schema-only restore identified the same typed field category, did not disclose names or values, and issued no receipt.')


if __name__=='__main__':
    anchor.offline()
    main()
