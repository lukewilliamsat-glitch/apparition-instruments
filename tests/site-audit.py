from pathlib import Path
from lxml import html
from urllib.parse import urlsplit,unquote
import subprocess,re
root=Path('dist');errors=[];pages=list(root.rglob('*.html'))
for p in pages:
 d=html.parse(str(p));ids=d.xpath('//@id')
 if len(ids)!=len(set(ids)):errors.append(f'Duplicate IDs {p}')
 if 'wiring-diagrams' not in str(p):
  for dest in ['/contact/','/terms/','/privacy/','/faq/']:
   if not d.xpath('//footer//a[@href=$v]',v=dest):errors.append(f'Footer missing {p} {dest}')
  for cat in ['potentiometers','capacitors','treble-bleeds']:
   if len(d.xpath('//details[contains(@class,"nav-components")]//a[@href=$v]',v='/components/'+cat+'/'))!=2:errors.append(f'Category navigation missing {p} {cat}')
 for raw in d.xpath('//@href|//@src'):
  u=urlsplit(raw)
  if u.scheme or u.netloc:continue
  dest=root/unquote(u.path.lstrip('/')) if u.path.startswith('/') else p.parent/unquote(u.path) if u.path else p
  if dest.is_dir():dest=dest/'index.html'
  if not dest.exists():errors.append(f'{p}: missing {raw}')
  elif u.fragment and dest.suffix=='.html' and not html.parse(str(dest)).xpath('//*[@id=$id]',id=u.fragment):errors.append(f'{p}: missing fragment {raw}')
 for a in d.xpath('//a'):
  if a.get('href') in ['','#']:errors.append(f'Empty CTA {p}')
 for phrase in ['youtube','inside a les paul circuit','explore the diagram','upcoming guides']:
  if phrase in ' '.join(d.xpath('//body//text()')).lower():errors.append(f'Old copy {p}: {phrase}')
for p in list(root.rglob('*.mjs'))+list(root.rglob('*.js')):
 r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
 if r.returncode:errors.append(r.stderr)
 for src in re.findall(r"from\s+['\"]([^'\"]+)",p.read_text()):
  if src.startswith('.') and not (p.parent/src).exists():errors.append(f'Missing import {p}: {src}')
assert not errors,'\n'.join(errors)
print(f'{len(pages)} pages passed: local links, fragments, IDs, desktop/mobile menu hierarchy, footer, retired copy, script syntax and imports.')
