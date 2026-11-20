"""Compose navigation-only variants over the verified cumulative B and staged C."""
import hashlib, io, json, posixpath, re, sys
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_STORED

SHA=lambda v:hashlib.sha256(v).hexdigest()
outer={
 'b': ('8c107f07b24815d81f1b4029d2644af2bb0932172f392b795d43324d862d22ea','612e4b57e1fc72d8c2d2adeb871400a3b59cb36a604ebed2b39764dc7fa3d2ea',480),
 'c': ('f089eecc2ef5d8b521378996810328dd4384ad78f4d1ad0d52acda88a450adb8','b5ba06e988cb56bfe3273737d0de74f8a424b09b056e711902309bff254b953f',485),
}
ref=re.compile(r"""(?P<name>(?:\.{1,2}/|/)[^'";,>\s?]+\.(?:mjs|js))(?P<search>\?[^'";,>\s#]*)?(?=['",\s>])""")
def target(parent,child):
 return posixpath.normpath(child[1:] if child.startswith('/') else posixpath.join(posixpath.dirname(parent),child))
def unique(v,a,b):
 if v.count(a)!=1:raise ValueError('Expected exactly one '+a)
 return v.replace(a,b)
def compose(root,kind):
 stamp='unification78b-v1' if kind=='b' else 'unification78b-c1'
 raw=(root/f'hosted-{kind}.zip').read_bytes()
 wrap,inner,count=outer[kind]
 assert SHA(raw)==wrap
 with ZipFile(io.BytesIO(raw)) as z:
  assert z.namelist()==[f'release-{kind}.zip']
  data=z.read(f'release-{kind}.zip')
 assert SHA(data)==inner
 with ZipFile(io.BytesIO(data)) as z:
  files={n:z.read(n) for n in z.namelist()}
 assert len(files)==count and all(not n.startswith('/') and '..' not in n.split('/') for n in files)
 original=files.copy()
 semantic={}
 def edit(p,fn,reason):
  content=fn(files[p].decode()).encode()
  assert content!=files[p],p
  files[p]=content
  semantic[p]=reason
 def shell(v):
  v=unique(v,"['inventory','Inventory','/admin/?view=inventory','Workspace'],['overview','Overview','/admin/overview/','Workspace'],","['overview','Overview','/admin/overview/','Workspace'],\n ['ironclad','IRONCLAD: Stock & purchasing','/admin/ironclad/','Stock & purchasing'],['landed-cost','Landed cost calculator','/admin/ironclad/calculator/','Stock & purchasing'],\n ['inventory','Components & catalogue stock','/admin/?view=inventory','Catalogue'],")
  v=unique(v,"inventory:'Components, pricing and shared stock. Your existing inventory tools, in one workspace.'","inventory:'Edit components, catalogue prices and product details. Stock quantities use the same physical inventory as IRONCLAD.',ironclad:'Manage physical stock, suppliers, procurement, acquisition batches, measurements and stocktakes in one place.',\n 'landed-cost':'Estimate purchase and landed costs without posting a purchase or changing stock.'")
  v=unique(v,"orders:'Manage customer orders, production and dispatch.'","orders:'Manage orders, fulfilment and commercial dates. Open an order for ECLIPSE financials, or use the Fulfilment Cost Library from Orders.'")
  v=unique(v,"const p=location.pathname,q=", "const p=location.pathname.replace(/\\/index\\.html$/,'/'),q=")
  # The IRONCLAD mount replaces its own children. Keep common context outside its mount.
  v=unique(v,"const invoice=main.id==='invoice';","const ownsTitle=main.hasAttribute('data-admin-workspace-owns-title');\n const invoice=main.id==='invoice';")
  v=unique(v,"if(!header){header=uiNode", "if(!header&&!ownsTitle){header=uiNode")
  v=unique(v,"header.classList.add('admin-page-header');header.querySelector('.eyebrow')?.remove();","header?.classList.add('admin-page-header');header?.querySelector('.eyebrow')?.remove();")
  v=unique(v,"header.before(breadcrumb);","if(header)header.before(breadcrumb);else chrome.prepend(breadcrumb);")
  v=unique(v,"header.after(description);","(header||breadcrumb).after(description);")
  if kind=='c':
   v=unique(v,"['delivery','Delivery & postage'","['omniscience','OMNISCIENCE: Business financials','/admin/omniscience/','Finance'],\n ['delivery','Delivery & postage'")
   v=unique(v,"external:'Record an external","omniscience:'Review business-level contribution, cash outlays and reconciled sales. Order-level BLACK LEDGER and ECLIPSE remain in Orders.',external:'Record an external")
  return v
 edit('admin/application.mjs',shell,'Register shared stock and calculator routes; clarify stock authority, order finance and page context.')
 edit('admin/ironclad/index.html',lambda s:unique(s,'<main class="admin-main armoury" id="armoury"></main>','<main class="admin-main" id="ironclad-workspace" data-admin-workspace-owns-title><div class="armoury" id="armoury"></div></main>'),'Keep shared breadcrumb and description outside the Armoury mount; retain the existing accessible skip target.')
 edit('admin/ironclad/app.mjs',lambda s:unique(s,"'Return to Inventory'","'Edit components & catalogue stock'"),'Distinguish the existing component editor from IRONCLAD Inventory Command.')
 def overview(s):
  s=unique(s,"['inventory','Inventory','/admin/?view=inventory']","['inventory','Stock & purchasing','/admin/ironclad/']")
  s=unique(s,"['inventory','Out of stock','/admin/?view=inventory']","['inventory','Out of stock','/admin/ironclad/']")
  return unique(s,"['Add Component','/admin/?view=inventory&new=component']","['Open IRONCLAD','/admin/ironclad/'],['Add Component','/admin/?view=inventory&new=component']")
 edit('admin/overview.mjs',overview,'Send operational stock shortcuts to IRONCLAD; keep Add Component on the catalogue editor.')
 edit('admin/ironclad/calculator/index.html',lambda s:unique(s,'Open live Inventory','Edit components &amp; catalogue stock'),'Clarify that the existing shortcut opens the component editor.')
 if kind=='c':
  edit('admin/omniscience/index.html',lambda s:unique(s,'<main class="admin-main omniscience" id="main"></main>','<main class="admin-main omniscience" id="main" data-admin-workspace-owns-title></main>'),'Let OMNISCIENCE retain its authored page title while showing shared Finance context.')
  # Conceal removes workspace children; preserve the shell on lock and re-sign-in as in B.
  edit('admin/omniscience/entry.mjs',lambda s:unique(s,"const root=d.querySelector('#main'), stop=", "const root=d.querySelector('#omniscience-workspace'), stop="),'Mount reporting inside its own content root, separate from navigation.')
  f='admin/omniscience/index.html'
  files[f]=unique(files[f].decode(),'data-admin-workspace-owns-title></main>','data-admin-workspace-owns-title><div id="omniscience-workspace"></div></main>').encode()
 def trim(s):
  s,n=re.subn(r'<p class="storage-note"><a href="/admin/ironclad/">.*?</p>','',s)
  assert n==1
  if kind=='c':
   s,n=re.subn(r'<p class="storage-note"><a href="/admin/omniscience/">.*?</p>','',s)
   assert n==1
  return s
 edit('admin/index.html',trim,'Remove the temporary landing-page links now provided by the shared sidebar.')
 # B/C wrap precise application consumers, not whole-release cache stamps. Collapse aliases.
 text={p:b.decode() for p,b in files.items() if p.endswith(('.mjs','.js','.html'))}
 changed_js={p for p in semantic if p.endswith(('.mjs','.js'))}
 while True:
  callers={p for p,v in text.items() if p.endswith(('.mjs','.js')) and any(target(p,m['name']) in changed_js for m in ref.finditer(v))}
  if callers<=changed_js: break
  changed_js|=callers
 for p,v in text.items():
  def reversion(m):
   if target(p,m['name']) not in changed_js:return m[0]
   prior=m['search'] or ''
   assert re.fullmatch(r'(?:\?(?:build|v)=[^&\s]+)?',prior),(p,m[0])
   return m['name']+'?build='+stamp
  files[p]=ref.sub(reversion,v).encode()
 delta=[n for n in sorted(files) if original[n]!=files[n]]
 assert set(files)==set(original) and all(n.startswith('admin/') or n=='commercial/admin.mjs' for n in delta)
 assert not any(x in delta for x in ('admin/admin-auth.mjs','admin/ironclad/repository.mjs','admin/orders/financial-order.mjs'))
 assert (kind=='c') == ('admin/omniscience/index.html' in files)
 assert ('/admin/omniscience/' in files['admin/application.mjs'].decode()) == (kind=='c')
 out=root/('unified-'+kind);out.mkdir()
 inv={p:SHA(v) for p,v in sorted(files.items())}
 with ZipFile(root/('unified-'+kind+'.zip'),'w',compression=ZIP_STORED) as z:
  for p in inv:
   f=out/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(files[p])
   entry=ZipInfo(p,(2000,1,1,0,0,0));entry.external_attr=0o100644<<16;z.writestr(entry,files[p])
 record={'base_wrapper_sha256':wrap,'base_zip_sha256':inner,'zip_sha256':SHA((root/('unified-'+kind+'.zip')).read_bytes()),'inventory_sha256':SHA(json.dumps(inv,separators=(',',':'),sort_keys=True).encode()),'file_count':count,'delta':{p:{'before':SHA(original[p]),'after':inv[p],'reason':semantic.get(p,'Cache reference only')} for p in delta},'files':inv}
 (root/('unified-'+kind+'-manifest.json')).write_text(json.dumps(record,indent=2,sort_keys=True)+'\n')
 print(kind,record['zip_sha256'],record['inventory_sha256'],len(delta),len(semantic))

if __name__=='__main__':
 for variant in sys.argv[2:] or ('b','c'): compose(Path(sys.argv[1]),variant)
