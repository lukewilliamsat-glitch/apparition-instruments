"""Compose an exact read-only candidate from sealed FIRST LIGHT and HOMECOMING.

Inputs are the GitHub artifact wrappers. Outputs are review-only and this
script performs no network or deployment operations.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

WORKSHOP_FILES = {
    "admin/quartermaster/index.html",
    "admin/quartermaster/entry.mjs",
    "admin/quartermaster/workspace.css",
}
REUSED_INTEGRATION = {"admin/application.mjs", "admin/orders/app.mjs"}
BASE_TOKEN = b"unification78b-81b1"
PREVIEW_TOKEN = b"homecoming82-workshop1"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def require(data, expected, label):
    if digest(data) != expected:
        raise ValueError(f"Unexpected SHA-256 for {label}")
    return data


def static_files(sealed):
    with ZipFile(io.BytesIO(sealed)) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or any(
            name.startswith("/") or name.endswith("/") or "\\" in name
            or any(part in ("", ".", "..") for part in name.split("/"))
            for name in names
        ):
            raise ValueError("Unexpected archive entries")
        return {name: archive.read(name) for name in names}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("first_light", type=Path)
    parser.add_argument("workshop", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    with ZipFile(io.BytesIO(require(args.first_light.read_bytes(),
            "7764bebe684efd8441bdf778bf51dced4497de0a5b8c2d7adf250072503b19ac", "FIRST LIGHT wrapper"))) as archive:
        base = static_files(require(archive.read("stageb81-static.zip"),
            "b5900c3e15b92db98a345f202bac9d56a1559809b82646d3b62c9c1c093809e7", "FIRST LIGHT static"))
    with ZipFile(io.BytesIO(require(args.workshop.read_bytes(),
            "f24ec6d163dce5879e2810cfee390db4c2a6db9a8bc36c17c96aa36960701f07", "workshop wrapper"))) as archive:
        preview = static_files(require(archive.read("_temp/dom79/workshop82-preview-only.zip"),
            "8cc5d57c5fadcc0c6dda5e21db8b1f3a38829e41510a93c4a04a063d8b636295", "workshop static"))
    if len(base) != 488 or len(preview) != 491 or set(preview) - set(base) != WORKSHOP_FILES or not set(base) <= set(preview):
        raise ValueError("Unexpected base or workshop inventory")

    # Reuse the accepted Orders link and active workspace routing. Unwind the
    # historical preview-wide cache token to keep the other live files exact.
    candidate = dict(base)
    for name in REUSED_INTEGRATION:
        candidate[name] = preview[name].replace(PREVIEW_TOKEN, BASE_TOKEN)
    for name in WORKSHOP_FILES:
        candidate[name] = preview[name].replace(PREVIEW_TOKEN, BASE_TOKEN)
    here = Path(__file__).resolve().parent
    candidate["admin/quartermaster/entry.mjs"] = (here / "entry.mjs").read_bytes()
    # Only the Orders and workshop routes need a fresh shell/module cache key.
    # Keep all other FIRST LIGHT files byte-identical.
    def update_import(path, module, prior):
        old = module + b"?build=" + prior
        if candidate[path].count(old) != 1:
            raise ValueError(f"Expected one import in {path}")
        candidate[path] = candidate[path].replace(old, module + b"?build=quartermaster84-observe1")

    update_import("admin/admin-gate.mjs", b"application.mjs", BASE_TOKEN)
    update_import("admin/orders/index.html", b"admin-gate.mjs", BASE_TOKEN)
    update_import("admin/orders/index.html", b"app.mjs", BASE_TOKEN)
    update_import("admin/quartermaster/index.html", b"admin-gate.mjs", BASE_TOKEN)
    update_import("admin/quartermaster/index.html", b"entry.mjs", b"82-workshop")
    changed = {name: digest(data) for name, data in candidate.items() if base.get(name) != data}
    expected_changes = WORKSHOP_FILES | REUSED_INTEGRATION | {"admin/admin-gate.mjs", "admin/orders/index.html"}
    if set(changed) != expected_changes:
        raise ValueError("Unexpected release scope")

    args.output.mkdir(parents=True, exist_ok=True)
    sealed = args.output / "quartermaster84-observe-static.zip"
    with ZipFile(sealed, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(candidate.items()):
            entry = ZipInfo(name)
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data, compress_type=ZIP_DEFLATED, compresslevel=9)
    manifest = {
        "files": len(candidate),
        "staticSha256": digest(sealed.read_bytes()),
        "sqlSha256": digest((here / "observe.review.sql").read_bytes()),
        "changed": dict(sorted(changed.items())),
        "inventory": {name: digest(data) for name, data in sorted(candidate.items())},
    }
    (args.output / "quartermaster84-observe-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({key: manifest[key] for key in ("files", "staticSha256", "sqlSha256")}))
    print(f"{len(changed)} Admin entries changed or added")
    print(" ".join(sorted(changed)))


if __name__ == "__main__":
    main()
