"""Package the actual admin modules with a clearly labelled, offline fixture harness."""
import hashlib, json, pathlib, re, sys
src = pathlib.Path('dist').resolve()
out = pathlib.Path(sys.argv[1]).resolve()
assert not out.exists()
out.mkdir(parents=True)
copied = set()
root_with_repo = pathlib.Path.cwd()
def put(path, value):
    dst = (out / path).resolve()
    assert dst.is_relative_to(out)
    dst.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(value, bytes):
        dst.write_bytes(value)
    else:
        dst.write_text(value, encoding='utf-8')
def copy(path):
    path = (src / path).resolve()
    assert path.is_relative_to(src)
    relative = path.relative_to(src)
    if relative in copied:
        return
    copied.add(relative)
    if relative.as_posix() == 'backend/public-config.mjs':
        put(relative, "export const publicBackendConfig = Object.freeze({enabled:false,url:'https://fixture.invalid',publishableKey:'fixture-only'});")
        return
    b = path.read_bytes()
    put(relative, b)
    if path.suffix == '.mjs':
        source = b.decode()
        for ref in re.findall(r'(?:\bfrom\s*|\bimport\s*)[\'"]((?:\.\.?/|/)[^\'"]+)[\'"]', source):
            child = (src / ref.lstrip('/') if ref.startswith('/') else path.parent / ref).as_posix().split('?')[0]
            if pathlib.Path(child).is_file():
                copy(child)
for path in ['style.css','brand.css','admin/admin.css','admin/overseer-typography.css','admin/site-operations/operations.css','admin/delivery/delivery.css',
             'admin/site-operations/operations.mjs','admin/delivery/delivery.mjs','admin/orders/aftercare-direct.mjs','admin/orders/order-date-correction.mjs']:
    copy(path)
nav = '''<nav class="overseer-nav" aria-label="Preview workspaces"><a href="/">Overview</a><a href="/admin/delivery/">Delivery Command</a><a href="/admin/aftercare-direct/">Aftercare Direct</a><a href="/admin/site-operations/">Operations Ascendant</a><a href="/admin/orders/date-correction/">Order date correction</a></nav><p class="overseer-fixture-label">Protected design preview · Fictional data (browser-local) · No email, payment or live change</p>'''
head = '<script type="module" src="/overseer-fixture.mjs"></script><link rel="stylesheet" href="/preview-shell.css"><link rel="stylesheet" href="/admin/overseer-typography.css?v=68b">'
for page in ['admin/delivery','admin/site-operations']:
    html = (src / page / 'index.html').read_text()
    html = re.sub(r'<script type="module"[^>]+data-admin-entry="[^"]+"[^>]*></script>', head, html)
    html = re.sub(r'<body class="([^"]+)">',r'<body class="\1 admin-authorized overseer-preview" data-overseer-fixture>',html,count=1)
    html = html.replace('<main class="admin-main">','<main class="admin-main">'+nav)
    put(page+'/index.html',html)
shell = '''<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>__TITLE__ | Apparition</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/brand.css"><link rel="stylesheet" href="/admin/admin.css"><link rel="stylesheet" href="/admin/site-operations/operations.css">'''+head+'''</head><body class="admin-page admin-authorized overseer-preview" data-overseer-fixture><main class="admin-main ops-workbench">'''+nav+'''__BODY__</main></body></html>'''
put('index.html',shell.replace('__TITLE__','Operation The Overseer').replace('__BODY__', '''<div class="ops-hero"><div><p class="ops-kicker">COMMAND / Operations</p><h1>Operation The Overseer</h1><p>Explore delivery configuration, order aftercare and store operations without changing any live service.</p></div></div><div class="preview-card-grid"><a class="ops-panel" href="/admin/delivery/"><strong>01 / Delivery Command</strong><p>Draft postage rules, calculate example baskets and review activation.</p></a><a class="ops-panel" href="/admin/aftercare-direct/"><strong>02 / Aftercare Direct</strong><p>Review a fictional eBay order and record an internal test message.</p></a><a class="ops-panel" href="/admin/site-operations/"><strong>03 / Operations Ascendant</strong><p>Preview a notice, inspect UK scheduling and open the operational timeline.</p></a><a class="ops-panel" href="/admin/orders/date-correction/"><strong>04 / Order date correction</strong><p>Correct a fictional marketplace sale date and verify its reporting period and history.</p></a></div>'''))
put('admin/aftercare-direct/index.html',shell.replace('__TITLE__','Aftercare Direct').replace('__BODY__','''<section class="ops-hero"><div><p class="ops-kicker">COMMAND / Customer Aftercare</p><h1>Aftercare Direct</h1><p>Synthetic eBay order · AI-068001</p><button id="open-aftercare" type="button">Review order-linked message</button></div></section>'''))
put('admin/orders/date-correction/index.html',shell.replace('__TITLE__','Order date correction').replace('__BODY__','''<section class="ops-hero"><div><p class="ops-kicker">COMMAND / Orders</p><h1>Order date correction</h1><p>AI-068101 · eBay · recorded 2 November 2026</p><p>Correct the commercial date to place this fictional sale in the correct report. Its record and payment timestamps remain fixed.</p></div></section><section class="ops-panel" id="example-order"></section><p id="date-order-message" role="status"></p><section class="ops-panel"><h2>Sales reporting</h2><label>Reporting month <select id="example-report-period"><option value="2026-11">November 2026</option><option value="2026-10">October 2026</option></select></label><p id="example-report-total" aria-live="polite"></p><button id="example-order-reset" type="button">Reset fictional order</button></section>'''))
put('overseer-fixture.mjs',(root_with_repo/'tests/overseer68/preview.mjs').read_bytes())
put('preview-shell.css',"""[data-overseer-fixture] .admin-main{display:block;max-width:1240px;margin:0 auto;padding:clamp(.8rem,3vw,2.25rem);min-width:0}[data-overseer-fixture] main{visibility:visible}.overseer-nav{display:flex;flex-wrap:wrap;gap:.65rem;margin-bottom:.7rem}.overseer-nav a{border:1px solid #69553a;padding:.45rem .65rem;font-weight:600}.overseer-fixture-label{color:#e8bd79;border-inline-start:2px solid #e8bd79;padding-inline-start:.7rem}.preview-card-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));margin-block:1rem}.preview-card-grid a{text-decoration:none}.preview-card-grid strong{color:#e8bd79}.aftercare-direct-dialog{width:min(660px,calc(100vw - 28px));max-height:calc(100dvh - 28px);overflow:auto}.aftercare-direct-dialog .dialog-actions{flex-wrap:wrap}""")
put('_headers', """/*
  X-Robots-Tag: noindex, nofollow, noarchive
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Cache-Control: no-store
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self' data:; font-src 'self'; base-uri 'none'; object-src 'none'; frame-src 'self' about:; frame-ancestors 'none'; form-action 'none'
""")
files=[]
for p in sorted(out.rglob('*')):
    if not p.is_file():
        continue
    b = p.read_bytes()
    files.append(dict(path=p.relative_to(out).as_posix(), bytes=len(b), sha256=hashlib.sha256(b).hexdigest()))
assert len(files)<=100 and sum(f['bytes'] for f in files)<=8000000
print(json.dumps(files,separators=(',',':')))
