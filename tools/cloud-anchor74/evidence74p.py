"""Private residual CHECK analysis. Outputs only a fixed, bounded vocabulary."""
import json
import re

import constraint74m as old
import constraint74o as native

CATALOG = """SET LOCAL search_path TO pg_catalog;
SET LOCAL quote_all_identifiers TO off;
SET LOCAL standard_conforming_strings TO on;
SET LOCAL DateStyle TO 'ISO, YMD';
SET LOCAL TimeZone TO 'UTC';
SET LOCAL IntervalStyle TO postgres;
SET LOCAL extra_float_digits TO 3;
WITH id AS (SELECT convert_from(decode('{identity}','hex'),'UTF8')::jsonb j)
SELECT jsonb_build_object('rule',pg_get_constraintdef(c.oid),'convalidated',c.convalidated,
 'ordinary_relation',r.relkind='r' AND NOT r.relispartition,
 'local_constraint',c.conislocal AND c.coninhcount=0 AND c.conparentid=0,
 'no_inherit',c.connoinherit)
FROM id JOIN pg_namespace n ON n.nspname=id.j->>0
JOIN pg_class r ON r.relnamespace=n.oid AND r.relname=id.j->>1
JOIN pg_constraint c ON c.conrelid=r.oid AND c.conname=id.j->>2 AND c.contype='c';
"""


def family(rec):
    src=rec.get('rule')
    if not isinstance(src,str) or len(src.encode())>native.RULE_LIMIT:
        return {'shape':'outside_input_bound'}
    # Presence flags only. These are lexical hints, not a semantic decision.
    return {'shape':'within_input_bound','backslash': '\\' in src,
            'dollar_marker':bool(re.search(r'\$(?:[a-zA-Z_][a-zA-Z_0-9]*)?\$',src)),
            'escape_string_marker':bool(re.search(r"(?<![\w$])[Ee]'",
                                                  src)),
            'unicode_quote_marker': bool(re.search(r"""(?i)U&['"]""",src)),
            'array_marker':bool(re.search(r'\b(?:ANY|ALL|ARRAY)\b',src,re.I)),
            'parentheses_band': min(4,src.count('(')//4)}


def outcome(data):
    if isinstance(data,str) and data in native.FIXED:
        return {'outcome':data}
    if isinstance(data,dict):
        return data  # independently schema-checked at the subprocess boundary
    return {'outcome':'result_shape'}


def select_pair(before,after,keys):
    lhs={tuple(r[k] for k in keys):r for r in before}
    rhs={tuple(r[k] for k in keys):r for r in after}
    if set(lhs)!=set(rhs) or len(lhs)!=len(before) or len(rhs)!=len(after):
        return None
    diff=[k for k in lhs if lhs[k]!=rhs[k]]
    if len(diff)!=1:
        return None
    k=diff[0]
    a,b=lhs[k],rhs[k]
    if a['convalidated'] != b['convalidated'] or not all(old.kind(r['rule'])=='check' for r in (a,b)):
        return None
    return k,a,b


def examine(pair,env,schema_env,psql,readonly):
    key,sealed,restored=pair
    report={'profile':'anchor74p-residual-check-v1','source_shape':family(sealed),'target_shape':family(restored),
            'sealed_against_full':outcome(native.native_check(key,sealed,restored,env,details=True)),
            'full_against_self':outcome(native.native_check(key,restored,restored,env,details=True))}
    if schema_env is None:
        return report|{'schema_only':'unavailable'}
    payload=json.dumps(key,ensure_ascii=True).encode().hex()
    raw=psql(readonly(CATALOG.format(identity=payload)),schema_env,'schema-only catalog lookup failed')
    if not raw:
        return report|{'schema_only':'constraint_not_found'}
    other=json.loads(raw)
    required={'rule','convalidated','ordinary_relation','local_constraint','no_inherit'}
    if (not isinstance(other,dict) or set(other)!=required or not isinstance(other['rule'],str)
        or any(type(other[n]) is not bool for n in required-{'rule'})):
        return report|{'schema_only':'catalog_result_shape'}
    return report|{'schema_only':'found', 'schema_render_equals_full':other['rule']==restored['rule'],
                   'schema_validation_equals_full':other['convalidated']==restored['convalidated'],
                   'schema_ordinary_relation':other['ordinary_relation'],'schema_local_constraint':other['local_constraint'],
                   'schema_no_inherit':other['no_inherit'],
                   'sealed_against_schema':outcome(native.native_check(key,sealed,other,schema_env,details=True)),
                   'schema_against_self':outcome(native.native_check(key,other,other,schema_env,details=True))}
