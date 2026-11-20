"""Compose a deterministic static review ZIP from the exact accepted Release C."""
from hashlib import sha256
from pathlib import Path, PurePosixPath
import json
import re
import sys
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

digest = lambda b: sha256(b).hexdigest()
baseline, out = map(Path, sys.argv[1:])
base_hash = "be062020a7f3362357cd9a5f6613fe75104d55bb38aeaedccd695b0c55ea0c30"
assert digest(baseline.read_bytes()) == base_hash
with ZipFile(baseline) as archive:
    before = {n: archive.read(n) for n in archive.namelist()}
    assert len(before) == len(archive.namelist()) == 485
    assert all(n and not n.endswith("/") and not n.startswith("/") and ".." not in PurePosixPath(n).parts and "\\" not in n for n in before)

after = before.copy()
admin_only = lambda n: n.startswith("admin/") or n == "commercial/admin.mjs"
old = b"unification78b-c1"
new = b"unification78b-81b1"
for name, body in before.items():
    if admin_only(name) and name.endswith((".mjs", ".js", ".html")):
        after[name] = re.sub(rb"(application\.mjs|admin-gate\.mjs|commercial/admin\.mjs|operations\.mjs|detail-presentation\.mjs|editor-view\.mjs|view\.mjs|admin\.mjs|overview\.mjs|app\.mjs)\?build=" + old,
                             lambda m: m[1] + b"?build=" + new, body)

nav = "admin/application.mjs"
needle = b"['landed-cost','Landed cost calculator','/admin/ironclad/calculator/','Stock & purchasing'],"
assert after[nav].count(needle) == 1
after[nav] = after[nav].replace(needle, needle + b"\n ['dominion','Stock & packing status','/admin/dominion/','Stock & purchasing'],")
needle = b"'landed-cost':'Estimate"
assert after[nav].count(needle) == 1
after[nav] = after[nav].replace(needle, b"dominion:'View UNITY reservations and QUARTERMASTER packing status. Read only.','landed-cost':'Estimate")
for name in ("index.html", "entry.mjs", "workspace.css"):
    target = "admin/dominion/" + name
    assert target not in before
    after[target] = (Path(__file__).parent / "stageb81" / name).read_bytes()
for name, body in after.items():
    if name.endswith((".mjs", ".js", ".html")):
        assert re.search(rb"(application\.mjs|admin-gate\.mjs|commercial/admin\.mjs|operations\.mjs|detail-presentation\.mjs|editor-view\.mjs|view\.mjs|admin\.mjs|overview\.mjs|app\.mjs)\?build=" + old, body) is None, name
changed = sorted(n for n, body in after.items() if before.get(n) != body)
assert all(admin_only(n) for n in changed)
out.mkdir(parents=True, exist_ok=True)
zip_path = out / "stageb81-static.zip"
with ZipFile(zip_path, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name, body in sorted(after.items()):
        info = ZipInfo(name)
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        archive.writestr(info, body, compress_type=ZIP_DEFLATED, compresslevel=9)
inventory = {n: digest(b) for n, b in sorted(after.items())}
(out / "stageb81-manifest.json").write_text(json.dumps({
    "baselineDeployment": "f290e564-6dde-4123-a349-997c70308729",
    "rollbackZipSha256": base_hash,
    "candidateZipSha256": digest(zip_path.read_bytes()),
    "readContractSha256": digest((Path(__file__).parent / "stageb81.read.review.sql").read_bytes()),
    "files": len(after), "modifiedOrAdded": {n: inventory[n] for n in changed},
    "inventory": inventory
}, indent=2) + "\n")
print(f"Stage B: {len(after)} files, {len(changed)} Admin-only changes; all public bytes unchanged")
