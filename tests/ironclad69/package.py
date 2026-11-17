import hashlib, json, pathlib, sys
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
files = {}
def add(name, data):
    path = out / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    files[name] = {"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
for name in ["armoury.css", "app.mjs", "model.mjs"]:
    add(f"admin/ironclad/{name}", pathlib.Path(f"dist/admin/ironclad/{name}").read_bytes())
add("fixture.mjs", pathlib.Path("tests/ironclad69/fixture.mjs").read_bytes())
add("index.html", b"""<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>IRONCLAD | Protected fixture</title><link rel="stylesheet" href="/admin/ironclad/armoury.css"><script type="module" src="/fixture.mjs"></script></head><body><a class="armoury-skip" href="#armoury">Skip to inventory</a><main class="armoury" id="armoury"></main></body></html>""")
add("_headers", b"""/*
  X-Robots-Tag: noindex, nofollow, noarchive
  Cache-Control: no-store
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self' data:; font-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'
""")
print(json.dumps([files[s] for s in sorted(files)], separators=(",", ":")))
