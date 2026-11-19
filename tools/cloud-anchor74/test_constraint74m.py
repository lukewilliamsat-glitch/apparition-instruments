"""Native tests. No assertion prints proof SQL, parse trees, or archive bytes."""
import copy
import json
import pathlib
import tempfile
from unittest.mock import patch

import anchor
import constraint74m
from test_final_two import digest_and_key

PRIVACY = ('anchor_m_', 'anchor m;', 'fixture; private marker',
           'unresolved_dependency', 'pg_catalog.>', 'secret-fixture-text')


def rule(proof, name):
    return next(r for r in proof['constraints'] if r['conname'] == name)


def wrap(definition):
    expression, no_inherit, not_valid = constraint74m.check_clause(definition)
    return 'CHECK (((' + expression + ')))' + (' NO INHERIT' if no_inherit else '') + (
        ' NOT VALID' if not_valid else '')


def variant(proof, name, definition=None):
    out = copy.deepcopy(proof)
    item = rule(out, name)
    item['rule'] = definition or wrap(item['rule'])
    return out


def refusal(expected, actual, env, dump, markers):
    try:
        anchor.verify_v2_final(expected, actual, env, dump, semantic=True)
    except anchor.Refusal as exc:
        diagnostic = str(exc)
        assert all(m in diagnostic for m in markers), 'required diagnostic class absent'
        assert not any(m in diagnostic for m in PRIVACY), 'non-public content in diagnostics'
    else:
        raise AssertionError('unproven proof was accepted')


def native_cases(env, dump):
    sql = (anchor.HOME/'proof-v2.sql').read_text()
    def read(body):
        return json.loads(anchor.psql(body + '\n' + sql + '\nROLLBACK;', env, 'fixture catalog projection failed'))

    actual = read('BEGIN READ ONLY;')
    equivalents = (
        ('anchor m; check', 'CHECK (((quantity OPERATOR(pg_catalog.>) CAST(0 AS integer))))'),
        ('anchor_m_function', 'CHECK (((public."anchor_m_first"(quantity) >= 0)))'),
        ('anchor_m_cast', 'CHECK (CAST(quantity AS pg_catalog.int8) > CAST(0 AS bigint))'),
        ('anchor_m_collate', """CHECK (((caption COLLATE pg_catalog."C") <> 'fixture; private marker'::pg_catalog.text))"""),
        ('anchor_m_enum', None), ('anchor_m_extension', None), ('anchor_m_domain', None),
        ('anchor_m_no_validation', None),
    )
    for n, (name, spelling) in enumerate(equivalents, 1):
        before = variant(actual, name, spelling)
        try:
            assert anchor.verify_v2_final(before, actual, env, dump, semantic=True) == ('0','1')
        except (anchor.Refusal, AssertionError) as exc:
            raise AssertionError(f'native equivalent CHECK case {n} failed: {exc}') from None
    print(f'PASS native CHECK: {len(equivalents)} proven equivalents (qualification, cast display, enum, domain, extension, collation and NOT VALID).')

    mutants = (
        ('anchor m; check', 'CHECK (quantity > 1)', 'literal_tokens=1'),
        ('anchor m; check', 'CHECK (quantity > alt)', 'typed_catalog_difference=1'),
        ('anchor m; check', 'CHECK (quantity <= 0)', 'operator_tokens=1'),
        ('anchor m; check', 'CHECK (quantity > 0 OR alt IS NOT NULL)', 'typed_catalog_difference=1'),
        ('anchor_m_cast', 'CHECK (quantity::numeric > 0::numeric)', 'type_tokens=1'),
        ('anchor_m_function', 'CHECK (public.anchor_m_other(quantity) >= 0)', 'call_tokens=1'),
        ('anchor_m_collate', """CHECK ((caption COLLATE "POSIX") <> 'fixture; private marker')""", 'collation_tokens=1'),
        ('anchor_m_enum', """CHECK ((colour <> 'shade'::public.anchor_m_colour))""", 'typed_catalog_difference=1'),
        ('anchor_m_extension', 'CHECK (ext::text <> \'x\'::text)', 'typed_catalog_difference=1'),
        ('anchor_m_no_validation', 'CHECK (id > 0) NOT VALID', 'unresolved=1'),
    )
    for name, definition, mark in mutants:
        refusal(variant(actual, name, definition), actual, env, dump, (mark, 'constraints (rule=1)'))
    refusal(variant(actual, 'anchor_m_function', 'CHECK (public.unresolved_dependency(quantity) >= 0)'),
            actual, env, dump, ('unresolved=1',))
    refusal(variant(actual, 'anchor m; check', 'CHECK (quantity > 0); SELECT 1'),
            actual, env, dump, ('unresolved=1',))
    refusal(variant(actual, 'final_partition_check'), actual, env, dump, ('unresolved=1',))
    refusal(variant(actual, 'final_inh_check'), actual, env, dump, ('unresolved=1',))
    assert constraint74m.check_clause("CHECK (x = 'escaped'';()')") is not None
    for bad in (r"CHECK (x = E'x\\y')", "CHECK (x = $$x$$)", 'CHECK ((x > 0) /* ') :
        assert constraint74m.check_clause(bad) is None

    # Change the real catalog projection. None of these classes has a text
    # waiver: restore must reject when the matching inventory identity differs.
    table = '"public"."anchor m; table"'
    def replace(name, definition):
        return f'ALTER TABLE {table} DROP CONSTRAINT {name}; ALTER TABLE {table} ADD CONSTRAINT {name} {definition};'
    ddl = (
        (f'ALTER TABLE {table} DROP CONSTRAINT "anchor m; check";', 'missing_target=1'),
        (f'ALTER TABLE {table} ADD CONSTRAINT anchor_m_added CHECK (alt > 0);', 'extra_target=1'),
        (f'ALTER TABLE {table} VALIDATE CONSTRAINT anchor_m_no_validation;', 'validation_difference=1'),
        (replace('anchor_m_fk', 'FOREIGN KEY (quantity) REFERENCES public.anchor_m_ref (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED'), 'foreign_key=1'),
        (replace('anchor_m_fk', 'FOREIGN KEY (quantity) REFERENCES public.anchor_m_ref_alt (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED'), 'foreign_key=1'),
        (replace('anchor_m_fk', 'FOREIGN KEY (quantity) REFERENCES public.anchor_m_ref (alternate) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED'), 'foreign_key=1'),
        (replace('anchor_m_fk', 'FOREIGN KEY (quantity) REFERENCES public.anchor_m_ref (id) ON DELETE SET NULL'), 'foreign_key=1'),
        (replace('anchor_m_unique', 'UNIQUE NULLS NOT DISTINCT (alt)'), 'unique=1'),
        (replace('anchor_m_pk', 'PRIMARY KEY (alt,id)'), 'primary_key=1'),
        (replace('anchor_m_exclude', 'EXCLUDE USING gist (span WITH =)'), 'exclude=1'),
    )
    for n, (statement, mark) in enumerate(ddl, 1):
        try:
            mutated = read('BEGIN;\n' + statement)
            refusal(actual, mutated, env, dump, (mark,))
        except (anchor.Refusal, AssertionError) as exc:
            raise AssertionError(f'native structural mutation case {n} failed: {exc}') from None

    assert 'referential_actions' in constraint74m.difference_hints(
        'FOREIGN KEY (a) REFERENCES other(a) ON DELETE CASCADE',
        'FOREIGN KEY (a) REFERENCES other(a) ON DELETE SET NULL')
    assert 'deferral_tokens' in constraint74m.difference_hints(
        'FOREIGN KEY (a) REFERENCES other(a) DEFERRABLE INITIALLY DEFERRED',
        'FOREIGN KEY (a) REFERENCES other(a)')
    assert 'uniqueness_tokens' in constraint74m.difference_hints(
        'UNIQUE NULLS NOT DISTINCT (a)', 'UNIQUE (a)')

    # A CHECK must not be reinterpreted in a catalog whose other proof groups
    # already failed, even if the changed function has the same name/OID.
    changed = read('BEGIN; CREATE OR REPLACE FUNCTION public.anchor_m_first(int) RETURNS int LANGUAGE sql IMMUTABLE RETURN $1 + 2;')
    refusal(variant(actual, 'anchor_m_function'), changed, env, dump,
            ('other_group_unresolved=1', 'constraints', 'functions'))

    # Even a legitimate expression is never executed over TCP, with provider
    # credentials, or in the presence of enabled event triggers.
    example = variant(actual, 'anchor m; check')
    for tweak in ({'PGHOST': 'example.invalid'}, {'PGPASSWORD': 'synthetic'},
                  {'PGHOSTADDR':'127.0.0.1'}, {'PGOPTIONS':'-c search_path=public'}):
        assert anchor.constraint_rule_equivalence(
            example['constraints'], actual['constraints'], env | tweak, True)[1] == 0
    anchor.psql("""CREATE FUNCTION public.anchor_m_event() RETURNS event_trigger LANGUAGE plpgsql AS
                  $$ BEGIN RAISE EXCEPTION 'secret-fixture-text'; END $$;
                  CREATE EVENT TRIGGER anchor_m_event ON ddl_command_start EXECUTE FUNCTION public.anchor_m_event();""",
                env, 'synthetic event trigger setup failed')
    refusal(example, actual, env, dump, ('unresolved=1',))
    anchor.psql('ALTER EVENT TRIGGER anchor_m_event DISABLE; DROP EVENT TRIGGER anchor_m_event; DROP FUNCTION public.anchor_m_event();',
                env, 'synthetic event trigger cleanup failed')
    assert read('BEGIN READ ONLY;') == actual
    print(f'PASS native CHECK: {len(mutants)+4} changed or unprovable rules and {len(ddl)} catalog mutations refused; no private diagnostic or persistent probe.')

    return actual


def main():
    anchor.offline()
    assert anchor.constraint74m is constraint74m
    with tempfile.TemporaryDirectory(dir='/work') as td:
        work = pathlib.Path(td)
        source, exchange, target = (work / name for name in ('source','exchange','target'))
        for path in (source, exchange, target):
            path.mkdir()
        recipient, key = digest_and_key(work)
        with patch.object(anchor, 'EXCHANGE', exchange):
            db, env = anchor.start_local(source, 'anchor_fixture_source')
            try:
                for fixture in ('fixture.sql', 'fixture-v2.sql', 'fixture-final-two.sql', 'fixture-constraint74m.sql'):
                    anchor.psql((anchor.HOME/fixture).read_text(), env, 'fixture setup failed')
                raw_psql = anchor.psql
                proof_sql = (anchor.HOME/'proof-v2.sql').read_text()

                def equivalent_deparser(sql, env, step):
                    output = raw_psql(sql, env, step)
                    if proof_sql in sql:
                        proof = json.loads(output)
                        proof = variant(proof, 'anchor m; check', 'CHECK (((quantity OPERATOR(pg_catalog.>) CAST(0 AS integer))))')
                        for name in ('anchor_m_function', 'anchor_m_enum'):
                            proof = variant(proof, name)
                        return json.dumps(proof, ensure_ascii=True).encode()
                    return output

                # Fictional capture variation only: seal different text for
                # the same three rules and prove them through real restore.
                with patch.object(anchor, 'psql', side_effect=equivalent_deparser):
                    anchor.capture(source, env, [recipient], 'synthetic', version=2)
                native_cases(env, source/'scope.dump')
            finally:
                anchor.stop_local(db)
            digest = anchor.sha(exchange/'backup.age')
            anchor.restore(target, 'synthetic', key, digest, anchor.git_run(), required_version=2, semantic=True)
            receipt = json.loads((exchange/'restore.json').read_text())
            assert set(receipt['checks']) == set(anchor.PROOF_GROUPS)
            assert receipt['equivalent_relation_default_acls'] == '4'
            assert receipt['equivalent_native_check_rules'] == '3'
            print('PASS authenticated synthetic proof: three sealed CHECK spellings required native equivalence; four ACL equivalents and all 14 groups passed.')
            (exchange/'restore.json').unlink()

            verifier = anchor.verify_v2_final
            def check_failed_restore(expected, actual, env, dump, *, semantic):
                anchor.psql('ALTER TABLE public.final_not_valid VALIDATE CONSTRAINT final_nv_valid_rows;',
                            env, 'synthetic restored validation mutation failed')
                altered = json.loads(anchor.psql(anchor.v2_read(proof_sql), env, 'synthetic mutation proof failed'))
                return verifier(expected, altered, env, dump, semantic=semantic)

            with tempfile.TemporaryDirectory(dir=work) as failed:
                with patch.object(anchor, 'verify_v2_final', side_effect=check_failed_restore):
                    try:
                        anchor.restore(pathlib.Path(failed), 'synthetic', key, digest,
                                       anchor.git_run(), required_version=2, semantic=True)
                    except anchor.Refusal as exc:
                        assert 'validation_difference=1' in str(exc)
                    else:
                        raise AssertionError('changed constraint validation was accepted during restore')
            assert not (exchange/'restore.json').exists()
            print('PASS changed restored validation refused before receipt, even with other rules proven equivalent.')


if __name__ == '__main__':
    main()
