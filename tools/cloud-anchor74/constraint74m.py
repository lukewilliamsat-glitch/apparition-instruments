"""Compare sealed CHECK definitions using PostgreSQL 17.6, and report only counts."""
import collections
import json
import pathlib
import re

PROBE_LIMIT = 12
RULE_LIMIT = 16 * 1024
PROBE_NAME = '_anchor74m_comparison_only'
KINDS = (
    ('check', 'CHECK'), ('foreign_key', 'FOREIGN KEY'), ('primary_key', 'PRIMARY KEY'),
    ('unique', 'UNIQUE'), ('exclude', 'EXCLUDE'),
)
# PostgreSQL REL_17_6 primnodes.h: CoercionForm is for display only (equal() ignores it).
DISPLAY = {
    'FUNCEXPR': ':funcformat', 'RELABELTYPE': ':relabelformat',
    'COERCEVIAIO': ':coerceformat', 'ARRAYCOERCEEXPR': ':coerceformat',
    'CONVERTROWTYPEEXPR': ':convertformat', 'ROWEXPR': ':row_format',
    'COERCETODOMAIN': ':coercionformat',
}


def kind(rule):
    if isinstance(rule, str):
        for label, prefix in KINDS:
            if re.match(r'^' + prefix + r'\b', rule, re.ASCII | re.I):
                return label
    return 'other'


def check_clause(rule):
    """Accept one CHECK clause with standard PostgreSQL quotes, no stacked SQL.

    Suffix parsed separately; PostgreSQL, not this scanner, interprets the
    expression. Unrecognised delimiters and ambiguous quoting fail closed.
    """
    if not isinstance(rule, str) or len(rule.encode()) > RULE_LIMIT or '\\' in rule:
        return None
    start = re.match(r'^CHECK[ \t\r\n]*\(', rule, re.ASCII)
    if not start:
        return None
    i, depth, quote = start.end(), 1, ''
    while i < len(rule):
        ch = rule[i]
        if ch == '\x00':
            return None
        if quote:
            if ch == quote:
                if rule[i+1:i+2] == quote:
                    i += 2
                    continue
                quote = ''
            i += 1
            continue
        if ch in "'\"":
            quote = ch
            # Backslash quoting is refused above; do not reinterpret U& strings.
            if rule[max(0, i-2):i].upper() == 'U&':
                return None
        elif ch in ';$\\' or rule[i:i+2] in ('--', '/*', '*/'):
            return None
        elif ch == '(':
            depth += 1
            if depth > 128:
                return None
        elif ch == ')':
            depth -= 1
            if depth == 0:
                tail = re.fullmatch(r'(?:[ \t\r\n]+(NO INHERIT))?(?:[ \t\r\n]+(NOT VALID))?[ \t\r\n]*', rule[i+1:])
                expr = rule[start.end():i]
                if tail and expr.strip():
                    return expr, bool(tail[1]), bool(tail[2])
                return None
        i += 1
    return None


def node_tokens(value):
    """REL_17_6 outfuncs.c / read.c token boundaries, preserving escaped bytes."""
    tokens = []
    i = 0
    while i < len(value):
        if value[i] in ' \t\n':
            i += 1
            continue
        if value[i] in '{}()':
            tokens.append(value[i])
            i += 1
            continue
        j = i
        while i < len(value) and value[i] not in ' \t\n{}()':
            if value[i] == '\\':
                i += 1
                if i == len(value):
                    raise ValueError('invalid native node escape')
            i += 1
        tokens.append(value[j:i])
    return tokens


def canonical_node(value):
    """Ignore only source positions and explicitly documented CoercionForm.

    Types, resolved OIDs, constants, typmods, coercion nodes, flags, collations
    and dependency identities are left intact. The pair comes from one
    database so object identifiers are directly comparable.
    """
    if not isinstance(value, str) or not value.startswith('{'):
        raise ValueError('missing native node')
    tokens = node_tokens(value)
    out, stack = [], []
    i = 0
    while i < len(tokens):
        item = tokens[i]
        if item == '{':
            if i + 1 >= len(tokens) or not re.fullmatch(r'[A-Z_0-9]+', tokens[i+1]):
                raise ValueError('invalid native node tag')
            stack.append(tokens[i+1])
        elif item == '(':
            stack.append(None)
        elif item in ('}', ')'):
            if not stack or (stack[-1] is None) != (item == ')'):
                raise ValueError('invalid native node delimiters')
            stack.pop()
        elif stack and stack[-1] is not None:
            following = tokens[i+1] if i+1 < len(tokens) else ''
            if ((item == ':location' and re.fullmatch(r'-?[0-9]+', following))
                    or (DISPLAY.get(stack[-1]) == item and re.fullmatch(r'[0-3]', following))):
                i += 2
                continue
        out.append(item)
        i += 1
    if stack:
        raise ValueError('unclosed native node')
    return tuple(out)


def native_check(key, source, target, env, psql, offline):
    """Inspect only the credential-free scratch cluster. Never scan table data."""
    clause = check_clause(source['rule'])
    target_clause = check_clause(target['rule'])
    if (clause is None or target_clause is None or clause[1] != target_clause[1]
            or (clause[2] and source['convalidated'])
            or (target_clause[2] and target['convalidated'])
            or type(source['convalidated']) is not bool or type(target['convalidated']) is not bool
            or source['convalidated'] != target['convalidated']
            or not all(isinstance(k, str) and 0 < len(k.encode()) <= 63 and '\x00' not in k for k in key)):
        return 'unresolved'
    offline()
    host = env.get('PGHOST', '')
    if (not pathlib.PurePosixPath(host).is_relative_to('/work') or '..' in pathlib.PurePosixPath(host).parts
            or env.get('PGDATABASE') != 'postgres' or env.get('PGPORT') != '5432'
            or env.get('PGSSLMODE') != 'disable'
            or {'PGHOSTADDR', 'PGSERVICE', 'PGPASSWORD', 'PGPASSFILE', 'PGOPTIONS'} & env.keys()):
        return 'unresolved'
    payload = json.dumps([*key, *clause[:2], source['convalidated']], ensure_ascii=True).encode().hex()
    query = f'''
BEGIN;
SET LOCAL search_path TO pg_catalog;
SET LOCAL quote_all_identifiers TO off;
SET LOCAL DateStyle TO 'ISO, YMD';
SET LOCAL TimeZone TO 'UTC';
SET LOCAL IntervalStyle TO postgres;
SET LOCAL extra_float_digits TO 3;
SET LOCAL standard_conforming_strings TO on;
SET LOCAL statement_timeout TO '4s';
SET LOCAL lock_timeout TO '1s';
DO $anchor$
DECLARE
  args jsonb := convert_from(decode('{payload}', 'hex'), 'UTF8')::jsonb;
  ns name := args->>0;
  rel name := args->>1;
  con name := args->>2;
BEGIN
  IF current_setting('server_version_num') <> '170006'
     OR inet_server_addr() IS NOT NULL OR inet_client_addr() IS NOT NULL
     OR EXISTS (SELECT FROM pg_event_trigger WHERE evtenabled <> 'D')
     OR NOT EXISTS (
       SELECT FROM pg_class r JOIN pg_namespace n ON n.oid=r.relnamespace
         JOIN pg_constraint c ON c.conrelid=r.oid
       WHERE n.nspname=ns AND r.relname=rel AND c.conname=con AND r.relkind='r' AND NOT r.relispartition
         AND c.contype='c' AND c.conislocal AND c.coninhcount=0 AND c.conparentid=0
         AND NOT c.condeferrable AND NOT c.condeferred AND c.conbin IS NOT NULL
         AND c.connoinherit=(args->>4)::boolean AND c.convalidated=(args->>5)::boolean
         AND NOT EXISTS (SELECT FROM pg_inherits h WHERE h.inhrelid=r.oid OR h.inhparent=r.oid)
         AND NOT EXISTS (SELECT FROM pg_constraint p WHERE p.conrelid=r.oid AND p.conname='{PROBE_NAME}')
     )
  THEN
    RAISE EXCEPTION 'isolated CHECK is not eligible for replay';
  END IF;
  EXECUTE format('ALTER TABLE ONLY %I.%I ADD CONSTRAINT %I CHECK (%s)%s NOT VALID',
      ns, rel, '{PROBE_NAME}', args->>3, CASE WHEN (args->>4)::boolean THEN ' NO INHERIT' ELSE '' END);
END
$anchor$;
WITH args AS (SELECT convert_from(decode('{payload}', 'hex'), 'UTF8')::jsonb AS j)
SELECT jsonb_build_array(original.conkey=probe.conkey AND original.connoinherit=probe.connoinherit
                         AND (SELECT coalesce(jsonb_agg(jsonb_build_array(d.refclassid,d.refobjid,d.refobjsubid,d.deptype)
                               ORDER BY d.refclassid,d.refobjid,d.refobjsubid,d.deptype),'[]'::jsonb)
                              FROM pg_depend d WHERE d.classid='pg_constraint'::regclass AND d.objid=original.oid)
                             = (SELECT coalesce(jsonb_agg(jsonb_build_array(d.refclassid,d.refobjid,d.refobjsubid,d.deptype)
                               ORDER BY d.refclassid,d.refobjid,d.refobjsubid,d.deptype),'[]'::jsonb)
                              FROM pg_depend d WHERE d.classid='pg_constraint'::regclass AND d.objid=probe.oid),
                         original.conbin::text, probe.conbin::text)
FROM args JOIN pg_namespace n ON n.nspname=args.j->>0
JOIN pg_class r ON r.relnamespace=n.oid AND r.relname=args.j->>1
JOIN pg_constraint original ON original.conrelid=r.oid AND original.conname=args.j->>2
JOIN pg_constraint probe ON probe.conrelid=r.oid AND probe.conname='{PROBE_NAME}';
ROLLBACK;
'''
    flags, original, probe = json.loads(psql(query, env, 'isolated CHECK reconstruction refused'))
    if flags is not True or canonical_node(original) != canonical_node(probe):
        return 'typed_catalog_difference'
    return 'native_equivalent'


# Coarse *hints*, never used for equality. Compare classifications, not text,
# and emit only counts; names, values and native errors remain within /work.
LEX = re.compile(r"""'(?:[^']|'')*'|"(?:[^"]|"")*"|::|\bCAST\b|\bCOLLATE\b|[.]|[-+/*=<>~!&|^%]+|[A-Za-z_][A-Za-z_0-9$]*|[0-9]+(?:\.[0-9]+)?|\S""", re.I)


def difference_hints(left, right):
    if not all(isinstance(x, str) and len(x.encode()) <= RULE_LIMIT for x in (left, right)):
        return ('bounded_input',)
    a, b = LEX.findall(left), LEX.findall(right)
    def tags(seq):
        at = lambda i: seq[i] if 0 <= i < len(seq) else ''
        result = collections.defaultdict(list)
        has_cast = any(x.upper() == 'CAST' for x in seq)
        for i, t in enumerate(seq):
            if t == '::' or t.upper() == 'CAST':
                result['cast_notation'].append(t.upper())
                result['type_tokens'].append(at(i+1) if t == '::' else at(i+2))
            elif t.upper() == 'AS' and has_cast:
                result['type_tokens'].append(at(i+1))
            elif t.upper() == 'COLLATE':
                result['collation_tokens'].append((at(i+1), at(i+2), at(i+3) if at(i+2) == '.' else ''))
            elif t == '.':
                result['qualification'].append(at(i-1))
            elif re.fullmatch(r'[A-Za-z_][A-Za-z_0-9$]*|".*"', t) and at(i+1) == '(':
                result['call_tokens'].append(t)
            elif t.startswith("'") or t[0].isdigit():
                result['literal_tokens'].append(t)
            elif re.fullmatch(r'[-+/*=<>~!&|^%]+', t):
                result['operator_tokens'].append(t)
            elif t in ('(', ')', ',', '[', ']'):
                result['expression_shape'].append(t)
        return result
    x, y = tags(a), tags(b)
    differing = tuple(sorted(k for k in x.keys() | y.keys() if x[k] != y[k]))
    return differing or ('other_tokens',)
