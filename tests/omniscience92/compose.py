from pathlib import Path
r=Path(__file__).parent
parts=[]
for name in ('orders','outlays'):
 s=(r/f'omniscience74_{name}.baseline.sql').read_text()
 assert s.count(f'public.omniscience74_{name}')==1
 s=s.replace(f'public.omniscience74_{name}',f'public.omniscience92_{name}')
 assert s.count('limit 11')==1
 s=s.replace('limit 11','limit 101').replace('limit 10)','limit 100)').replace('from paged)>10','from paged)>100')
 s += f"""\nrevoke all on function public.omniscience92_{name}(date,date,date,uuid) from public,anon,service_role;
grant execute on function public.omniscience92_{name}(date,date,date,uuid) to authenticated;
"""
 parts.append(s)
(r/'report-pages.sql').write_text('\n'.join(parts))
