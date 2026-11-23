"""Extract only accepted UI modules into a network-isolated fixture site."""
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import sys
from zipfile import ZipFile

here = Path(__file__).resolve().parent
approved, historical, output = map(Path, sys.argv[1:])
site = output / "site"


def pinned(data, expected):
    assert sha256(data).hexdigest() == expected
    return data


def bundle(path, wrapper_digest, name, inner_digest):
    with ZipFile(BytesIO(pinned(path.read_bytes(), wrapper_digest))) as wrapper:
        return ZipFile(BytesIO(pinned(wrapper.read(name), inner_digest)))


with bundle(approved, "c4a196b23575b5fd0f9374f92d0bb192405ad5813b19f17579b19c9ca9b1ee07",
            "quartermaster84-observe-static.zip", "72bafac531f558fc297706fa4a9d76c90ec2986f4de847d6868f8f275c03e7be") as candidate, bundle(
            historical, "f24ec6d163dce5879e2810cfee390db4c2a6db9a8bc36c17c96aa36960701f07",
            "_temp/dom79/workshop82-preview-only.zip", "8cc5d57c5fadcc0c6dda5e21db8b1f3a38829e41510a93c4a04a063d8b636295") as workshop:
    entry = "admin/quartermaster/entry.mjs"
    shell = (here / "index.html").read_bytes()
    files = {
        "index.html": shell, "admin/orders/index.html": shell, "admin/quartermaster/index.html": shell,
        "preview.css": (here / "preview.css").read_bytes(),
        "fixture.mjs": (here / "fixture.mjs").read_bytes(),
        "_headers": (here / "_headers").read_bytes(),
        entry: candidate.read(entry),
        "admin/quartermaster/picking.mjs": workshop.read(entry),
        "admin/quartermaster/workspace.css": candidate.read("admin/quartermaster/workspace.css"),
        "admin/command/bounded-json.mjs": candidate.read("admin/command/bounded-json.mjs"),
        "backend/public-config.mjs": b"export const publicBackendConfig = {url:'https://quartermaster-fixture.invalid',publishableKey:'preview-fixture-marker'};\n",
    }

assert not site.exists(), "Use a fresh output directory"
inventory = []
for name, data in sorted(files.items()):
    target = site / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    inventory.append({"path": name, "bytes": len(data), "sha256": sha256(data).hexdigest()})
(output / "inventory.json").write_text(json.dumps(inventory, indent=2) + "\n")
print(f"Verified two original wrappers. Staged {len(files)} fixture files.")
