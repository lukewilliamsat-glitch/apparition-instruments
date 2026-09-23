from pathlib import Path
from lxml import html
import re,json
root=Path(__file__).resolve().parents[1];data=json.loads((root/'scripts/navigation.json').read_text())
def anchor(label,url,current):return f'<a href="{url}"'+(' aria-current="page"' if url==current else '')+f'>{label}</a>'
for p in (root/'dist').rglob('index.html'):
 s=p.read_text()
 if '<header class="site-header">' not in s:continue
 current='/'+str(p.parent.relative_to(root/'dist'))+'/'
 if current=='/./':current='/'
 def componentLink(index,label,url):
  if label=='View All Components':return anchor(label+' →',url,current)
  return f'<a href="{url}"'+(' aria-current="page"' if url==current else '')+f'><span class="nav-category-number">{index+1:02}</span><span><strong>{label}</strong><small>{data["componentNotes"][label]}</small></span></a>'
 dropdown='<details class="nav-components"><summary>Components</summary><div class="components-menu">'+''.join(componentLink(i,a,b) for i,(a,b) in enumerate(data['components']))+'</div></details>'
 nav=dropdown+''.join(anchor(a,b,current) for a,b in data['primary'])
 s=re.sub(r'<nav aria-label="Main navigation">.*?</nav>','<nav aria-label="Main navigation">'+nav+'</nav>',s,flags=re.S)
 s=re.sub(r'<nav id="mobile-nav".*?</nav>','<nav id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation" hidden>'+nav+anchor('Basket','/basket/',current)+'</nav>',s,flags=re.S)
 s=re.sub(r'<div class="footer-links">.*?</div>','<div class="footer-links">'+''.join(anchor(a,b,current) for a,b in data['footer'])+'</div>',s,flags=re.S)
 if 'href="/knowledge.css"' not in s:s=s.replace('</head>','<link rel="stylesheet" href="/knowledge.css"></head>')
 p.write_text(s)
