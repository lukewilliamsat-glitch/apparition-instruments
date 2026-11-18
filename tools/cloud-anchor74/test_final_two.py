"""Native V2 final-two acceptance with fictional grants, constraints and rows."""
import copy
import json
import pathlib
import tempfile
from unittest.mock import patch

import anchor

GRAPH = """SET LOCAL search_path TO pg_catalog;
WITH inheritance AS (
 SELECT cn.nspname AS cs,c.relname AS child,pn.nspname AS ps,p.relname AS parent,
   i.inhseqno, c.relispartition, i.inhdetachpending, pg_get_expr(c.relpartbound,c.oid) AS bounds
 FROM pg_inherits i JOIN pg_class c ON c.oid=i.inhrelid JOIN pg_class p ON p.oid=i.inhparent
 JOIN pg_namespace cn ON cn.oid=c.relnamespace JOIN pg_namespace pn ON pn.oid=p.relnamespace
 WHERE cn.nspname='public' AND c.relname LIKE 'final_%'
), ancestry AS (
 SELECT r.relname AS child,c.conname, c.contype,c.convalidated,c.conislocal,c.coninhcount,c.connoinherit,
   pr.relname AS parent, pc.conname AS parent_constraint
 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
 JOIN pg_namespace n ON n.oid=r.relnamespace
 LEFT JOIN pg_constraint pc ON pc.oid=c.conparentid LEFT JOIN pg_class pr ON pr.oid=pc.conrelid
 WHERE n.nspname='public' AND r.relname LIKE 'final_%'
)
SELECT jsonb_build_object(
 'inheritance',(SELECT jsonb_agg(to_jsonb(i) ORDER BY cs,child,inhseqno) FROM inheritance i),
 'constraints',(SELECT jsonb_agg(to_jsonb(a) ORDER BY child,conname) FROM ancestry a));"""


def digest_and_key(work):
    path = work / 'fixture-key'
    anchor.run(['age-keygen', '-o', str(path)], step='fixture key generation failed')
    recipient = anchor.run(['age-keygen', '-y', str(path)], step='fixture recipient failed').decode().strip()
    key = next(line for line in path.read_text().splitlines() if line.startswith('AGE-SECRET-KEY-1'))
    return recipient, key


def diagnostics(env, expected, proof_sql, dump):
    def observe(stmt):
        body = 'BEGIN ISOLATION LEVEL REPEATABLE READ;\n' + stmt + '\n' + proof_sql + '\nROLLBACK;'
        return json.loads(anchor.psql(body, env, 'fixture mutation projection failed'))

    def reject(restored, hint):
        try:
            anchor.verify_v2_final(expected, restored, env, dump)
        except anchor.Refusal as exc:
            output = str(exc)
            assert hint in output, output
            for private in ('final_acl', 'final_partition_a', 'final_nv_check', 'final_view', 'secret-marker'):
                assert private not in output, 'diagnostic revealed a fixture name or value'
            return output
        raise AssertionError('incorrect acceptance of a changed proof')

    cases = (
        ('GRANT SELECT ON public.final_acl TO PUBLIC;', 'relations (acl=1)'),
        ('GRANT SELECT ON public.final_acl TO authenticated WITH GRANT OPTION;', 'relations (acl=1)'),
        ('REVOKE ALL ON public.final_acl FROM anchor_fixture_source;', 'relations (acl=1)'),
        ('GRANT USAGE ON SEQUENCE public.final_seq TO authenticated;', 'relations (acl=1)'),
        ('ALTER TABLE public.final_acl OWNER TO authenticated;', 'owner=1'),
        ('ALTER TABLE public.final_acl SET UNLOGGED;', 'relpersistence=1'),
        ('ALTER TABLE public.final_acl ENABLE ROW LEVEL SECURITY;', 'relrowsecurity=1'),
        ('ALTER TABLE public.final_acl FORCE ROW LEVEL SECURITY;', 'relforcerowsecurity=1'),
        ('CREATE OR REPLACE VIEW public.final_view AS SELECT id FROM public.final_acl WHERE false;', 'view_definition=1'),
        ('ALTER TABLE public.final_not_valid DROP CONSTRAINT final_nv_check;', 'constraints (missing=1)'),
        ('ALTER TABLE public.final_not_valid ADD CONSTRAINT final_extra CHECK (id > 0);', 'constraints (added=1)'),
        ('ALTER TABLE public.final_not_valid VALIDATE CONSTRAINT final_nv_valid_rows;', 'convalidated=1'),
        ('ALTER TABLE public.final_not_valid DROP CONSTRAINT final_nv_fk; ALTER TABLE public.final_not_valid ADD CONSTRAINT final_nv_fk FOREIGN KEY(parent_id) REFERENCES auth.final_parent(id) ON DELETE CASCADE NOT VALID;', 'constraints (rule=1)'),
        ('ALTER TABLE public.final_inh_child DROP CONSTRAINT final_local_check; ALTER TABLE public.final_inh_child ADD CONSTRAINT final_local_check CHECK (v <> 43) NO INHERIT;', 'constraints (rule=1)'),
        ('ALTER TABLE public.final_partition DETACH PARTITION public.final_partition_a;', 'counts'),
    )
    for i, (stmt, hint) in enumerate(cases, 1):
        try:
            actual = observe(stmt)
        except anchor.Refusal as exc:
            raise AssertionError(f'synthetic mutation {i} failed to execute') from exc
        msg = reject(actual, hint)
        if 'relations (' in msg or 'constraints (' in msg:
            assert 'toc_table_attach=' in msg
    spoof = copy.deepcopy(expected)
    row = next(r for r in spoof['relations'] if r['rel']=='final_acl')
    row['acl'][0][0] = 'secret-marker'  # One grantor differs. Never print the value.
    reject(spoof, 'relations (acl=1)')
    spoof = copy.deepcopy(expected)
    row = next(r for r in spoof['relations'] if r['rel']=='final_acl')
    row['acl'] = None
    assert anchor.verify_v2_final(expected, spoof, env, dump) == '1'
    assert anchor.verify_v2_final(spoof, expected, env, dump) == '1'
    row = next(r for r in spoof['relations'] if r['rel']=='final_acl')
    row['acl'] = []
    reject(spoof, 'relations (acl=1)')
    print(f'PASS final-two: rejected {len(cases)+2} genuine mutations; empty ACL, grantor and grant options stay significant.')


def native():
    anchor.offline()
    with tempfile.TemporaryDirectory(dir='/work') as folder:
        work = pathlib.Path(folder)
        paths = {n: work/n for n in ('source','target','exchange')}
        for path in paths.values():
            path.mkdir()
        recipient, key = digest_and_key(work)
        with patch.object(anchor, 'EXCHANGE', paths['exchange']):
            db, env = anchor.start_local(paths['source'], 'anchor_fixture_source')
            try:
                for fixture in ('fixture.sql', 'fixture-v2.sql', 'fixture-final-two.sql'):
                    anchor.psql((anchor.HOME/fixture).read_text(), env, 'fixture setup failed')
                proof_sql = (anchor.HOME/'proof-v2.sql').read_text()
                source_proof = json.loads(anchor.psql(anchor.v2_read(proof_sql), env, 'fixture proof read failed'))
                source_graph = json.loads(anchor.psql(anchor.v2_read(GRAPH), env, 'fixture source graph failed'))
                assert len(source_graph['inheritance']) == 3
                assert any(c['parent_constraint'] for c in source_graph['constraints'])
                assert sum(not c['convalidated'] for c in source_graph['constraints']) == 3
                for name in ('final_acl','final_seq'):
                    assert next(r for r in source_proof['relations'] if r['rel']==name)['acl']
                anchor.capture(paths['source'], env, [recipient], 'synthetic', version=2)
                diagnostics(env, source_proof, proof_sql, paths['source']/'scope.dump')
            finally:
                anchor.stop_local(db)
            verifier = anchor.verify_v2_final

            def verify_and_check_graph(expected, actual, env, dump):
                result = verifier(expected, actual, env, dump)
                assert result == '2', 'ordinary dump/restore did not reproduce table and sequence default ACLs'
                assert json.loads(anchor.psql(anchor.v2_read(GRAPH), env, 'fixture restored graph failed')) == source_graph
                assert anchor.psql('SELECT count(*) FROM public.final_not_valid WHERE value < 0 AND parent_id=999;',
                                   env, 'fixture historical row check failed') == b'1'
                return result

            archive = paths['exchange']/'backup.age'
            def inject_restore_fault(expected, actual, env, dump):
                anchor.psql('ALTER TABLE public.final_not_valid VALIDATE CONSTRAINT final_nv_valid_rows;',
                            env, 'fixture restored mutation failed')
                changed = json.loads(anchor.psql(anchor.v2_read(proof_sql), env, 'fixture changed proof failed'))
                return verifier(expected, changed, env, dump)

            with tempfile.TemporaryDirectory(dir=work) as negative:
                with patch.object(anchor, 'verify_v2_final', side_effect=inject_restore_fault):
                    try:
                        anchor.restore(pathlib.Path(negative), 'synthetic', key, anchor.sha(archive),
                                       anchor.git_run(), required_version=2, final=True)
                    except anchor.Refusal as exc:
                        assert 'convalidated=1' in str(exc), str(exc)
                    else:
                        raise AssertionError('validation change accepted')
                assert not (paths['exchange']/'restore.json').exists()
                print('PASS final-two: changed restored validation state refused with no receipt.')
            with patch.object(anchor, 'verify_v2_final', side_effect=verify_and_check_graph):
                anchor.restore(paths['target'], 'synthetic', key, anchor.sha(archive), anchor.git_run(),
                               required_version=2, final=True)
            receipt = json.loads((paths['exchange']/'restore.json').read_text())
            assert receipt['restore_profile']==anchor.FINAL_RESTORE_PROFILE
            assert set(receipt['checks'])==set(anchor.PROOF_GROUPS)
            print('PASS final-two: encrypted native round trip, all 14 groups, two proven default ACL equivalents and exact synthetic parent/child graph.')


if __name__ == '__main__':
    native()
