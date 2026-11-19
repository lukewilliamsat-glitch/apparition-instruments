"""Exercise the native offline engine, failure buckets and encrypted recovery."""
import copy
import json
import pathlib
import subprocess
import tempfile
from unittest.mock import patch

import anchor
import constraint74o as c
from test_final_two import digest_and_key

TABLE='anchor_o_fictional'
SECRET='fixture_not_visible_in_diagnostics'


def row(proof,name):
    return next(r for r in proof['constraints'] if r['conname']==name)


def variant(proof,name,rule):
    altered=copy.deepcopy(proof)
    row(altered,name)['rule']=rule
    return altered


def classified(env,proof,name,rule,target=None):
    after=row(proof,name)
    return c.native_check(('public',TABLE,name),after|{'rule':rule},target or after,env)


def same(rule):
    return 'CHECK ((('+rule[7:-1]+')))'


def native(env,proof):
    positives=(
        ('anchor_o_regex',r"CHECK (((rule_text OPERATOR(pg_catalog.~) $demo$^demo\d+$$demo$)))"),
        ('anchor_o_literal',r"CHECK (((rule_text <> 'synthetic\anchor')))"),
        ('anchor_o_any','CHECK ((qty = ANY(ARRAY[11, 22]::integer[])))'),
        ('anchor_o_all','CHECK ((qty <> ALL(ARRAY[33, 44])))'),
        ('anchor_o_nested',same(row(proof,'anchor_o_nested')['rule'])),
        ('anchor_o_quoted',same(row(proof,'anchor_o_quoted')['rule'])),
    )
    for i,(name,rule) in enumerate(positives,1):
        result=classified(env,proof,name,rule)
        assert result=='native_equivalent',(i,result)
    negatives=(
        ('anchor_o_regex',r"CHECK (rule_text ~ '^demo\w+$')",'native_structure_mismatch'),
        ('anchor_o_literal',r"CHECK (rule_text <> E'synthetic\\\\anchor')",'native_structure_mismatch'),
        ('anchor_o_any','CHECK (qty = ANY(ARRAY[11, 23]))','native_structure_mismatch'),
        ('anchor_o_all','CHECK (qty <> ANY(ARRAY[33,44]))','native_structure_mismatch'),
        ('anchor_o_any','CHECK (qty >= ALL(ARRAY[11,22]))','native_structure_mismatch'),
        ('anchor_o_regex',r"CHECK (second_text ~ '^demo\d+$')",'constrained_column_mismatch'),
        ('anchor_o_regex',r"CHECK (lower(rule_text) ~ '^demo\d+$')",'native_structure_mismatch'),
        ('anchor_o_regex',r"""CHECK ((rule_text COLLATE "C") ~ '^demo\d+$')""",'dependency_mismatch'),
        ('anchor_o_any','CHECK (qty::numeric = ANY(ARRAY[11,22]::numeric[]))','native_structure_mismatch'),
        ('anchor_o_any','CHECK (qty + )','sql_syntax'),
        ('anchor_o_any',f'CHECK ({SECRET}(qty))','sql_resolution'),
        ('anchor_o_any','CHECK (qty)','sql_type'),
        ('anchor_o_any',"CHECK (qty > 'not an integer')",'sql_data'),
        ('anchor_o_any','CHECK (true; SELECT 2)','unsafe_input'),
        ('anchor_o_any','CHECK (true), ADD CONSTRAINT rogue CHECK(false)','source_unsupported_syntax'),
        ('anchor_o_any','CHECK (true) /* more */','source_unsupported_syntax'),
        ('anchor_o_any','CHECK ($broken$ true)','source_quoting_restriction'),
        ('anchor_o_any',"""CHECK (U&'unsafe' IS NOT NULL)""",'source_quoting_restriction'),
        ('anchor_o_any','CHECK ('+'('*129+'true'+')'*130,'expression_depth_limit'),
        ('anchor_o_any','CHECK ('+' '*c.RULE_LIMIT+'true)','expression_size_limit'),
    )
    for i,(name,rule,want) in enumerate(negatives,1):
        result=classified(env,proof,name,rule)
        assert result==want,(i,result,want)
    name='anchor_o_any'
    original=row(proof,name)
    assert classified(env,proof,name,original['rule'],original|{'rule':'CHECK [true]'})=='target_unsupported_syntax'
    assert classified(env,proof,name,original['rule'],original|{'rule':'CHECK ($x$ false)'})=='target_quoting_restriction'
    assert classified(env,proof,name,original['rule'],original|{'convalidated':False})=='validation_mismatch'
    assert classified(env|{'PGOPTIONS':'-c foo=x'},proof,name,original['rule'])=='boundary_restriction'
    assert c.native_check(('public',TABLE,'not-real'),original,original,env)=='eligibility_restriction'
    assert c.native_check(('public',TABLE+'\0',name),original,original,env)=='unsafe_input'
    for value,want in ((None,'result_shape'),('[true,true,true, null, null]','native_decode'),
        ('[true,true,true,"{UNSUPPORTED :x 1}","{UNSUPPORTED :x 1}"]','native_unsupported_node')):
        try: c.classify(value)
        except c.Refused as e: assert str(e)==want
        else: raise AssertionError(want)
    with patch.object(c.subprocess,'run',side_effect=subprocess.TimeoutExpired('synthetic',12)):
        assert classified(env,proof,name,original['rule'])=='probe_process_timeout'
    db=c.Connection(env)
    try:
        db.query('BEGIN')
        db.query("SET LOCAL statement_timeout TO '20ms'")
        try: db.query('SELECT pg_sleep(0.2)')
        except c.Refused as err: assert str(err)=='sql_statement_timeout'
        else: raise AssertionError('statement timeout not detected')
        db.query('ROLLBACK')
        db.query('BEGIN')
        db.query('LOCK TABLE public.anchor_o_fictional IN ACCESS EXCLUSIVE MODE')
        assert classified(env,proof,name,original['rule'])=='sql_lock_timeout'
        db.query('ROLLBACK')
        # Even if the lexer were bypassed, the extended protocol cannot
        # execute stacked commands.
        try: db.query('SELECT 1; SELECT 2')
        except c.Refused as err: assert str(err)=='sql_syntax'
        else: raise AssertionError('stacked SQL accepted')
        assert db.query("SELECT count(*) FROM pg_constraint WHERE conname LIKE '_anchor74m_comparison_only'")=='0'
    finally: db.close()
    print(f'PASS 74O: {len(positives)} native equivalents; {len(negatives)} input/native rejections; distinct lock, statement, decoding and boundary failures.')


def main():
    anchor.offline()
    with tempfile.TemporaryDirectory(dir='/work') as td:
        root=pathlib.Path(td)
        source,exchange,target=(root/name for name in ('source','exchange','target'))
        for x in (source,exchange,target): x.mkdir()
        recipient,key=digest_and_key(root)
        sql=(anchor.HOME/'proof-v2.sql').read_text()
        raw=anchor.psql
        with patch.object(anchor,'EXCHANGE',exchange):
            db,env=anchor.start_local(source,'anchor_fixture_source')
            try:
                for fixture in ('fixture.sql','fixture-v2.sql','fixture-final-two.sql',
                                'fixture-constraint74m.sql','fixture-constraint74o.sql'):
                    raw((anchor.HOME/fixture).read_text(),env,'fixture setup failed')
                actual=json.loads(raw(anchor.v2_read(sql),env,'fixture metadata failed'))
                native(env,actual)
                try:
                    anchor.verify_v2_final(variant(actual,'anchor_o_any',f'CHECK ({SECRET}(qty))'),
                                           actual,env,root/'no-dump',semantic=True,classified=True)
                except anchor.Refusal as e:
                    assert 'sql_resolution=1' in str(e) and SECRET not in str(e)
                else: raise AssertionError('diagnostic verification did not refuse')
                def project(q,conn,step):
                    contents=raw(q,conn,step)
                    if sql in q:
                        proof=json.loads(contents)
                        for name in ('anchor_o_regex','anchor_o_literal','anchor_o_any'):
                            proof=variant(proof,name,same(row(proof,name)['rule']))
                        return json.dumps(proof).encode()
                    return contents
                with patch.object(anchor,'psql',side_effect=project):
                    anchor.capture(source,env,[recipient],'synthetic',version=2)
            finally:
                anchor.stop_local(db)
            anchor.restore(target,'synthetic',key,anchor.sha(exchange/'backup.age'),
                           anchor.git_run(),2,semantic=True,classified=True)
            receipt=json.loads((exchange/'restore.json').read_text())
            assert set(receipt['checks'])==set(anchor.PROOF_GROUPS)
            assert receipt['equivalent_relation_default_acls']=='4'
            assert receipt['equivalent_native_check_rules']=='3'
            print('PASS 74O: encrypted native recovery, four ACL equivalents, three sealed CHECK variants, all 14 groups.')


if __name__=='__main__': main()
