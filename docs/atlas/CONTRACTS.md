# Contracts and exact CLI interfaces

All commands return UTF-8 JSON on stdout; diagnostics are machine fields, not arbitrary evaluated text. Exit **0** means locally successful (including audit-only), **1** means blocked/integrity/I/O failure, **2** means CLI usage failure. Unknown/duplicate flags and missing input digest pins are rejected. CLI digests pin the exact bytes of supplied JSON; relationship digests inside policy/receipts use canonical JSON (`stable`: recursively sorted object keys, two-space indent, final LF). Do not confuse the two if using noncanonical input JSON.

## 1. Inventory and snapshot validator

```bash
node scripts/atlas/cli.mjs inventory --root /tmp/atlas-demo-new/baseline
node scripts/atlas/cli.mjs manifest --root /tmp/atlas-demo-new/baseline
```

`inventory` recursively reads real regular files without following symlinks. Each entry has `path`, `size`, `sha256`, inferred `contentType`, `extension`, `protected`, `includedInManifest`. With no manifest supplied, protection/membership flags are false: inventory alone is not validation. Files and reports are deterministically ordered. Empty directories have no publication identity and are not copied.

`manifest` makes a **local assertion**, not a production certificate. Optional `--spec /absolute/spec.json` supplies `criticalRoutes`, `criticalAssets`, `provenance`; default critical route `index.html`, all files protected, default provenance synthetic/unattested. No production discovery is performed. A manifest is an exact expected file set, not an allow-extra policy.

```bash
node scripts/atlas/cli.mjs validate \
  --root /tmp/atlas-demo-new/baseline \
  --manifest /tmp/atlas-demo-new/baseline-manifest.json \
  --manifest-sha256 "$(sha256sum /tmp/atlas-demo-new/baseline-manifest.json | cut -d' ' -f1)"
```

The example computes a local fixture pin; for a real release the pin must come from independent owner review, not be blindly derived from an untrusted incoming file. Never treat matching an archive's self-supplied checksum as authentication.

Manifest v1 fields: `schemaVersion:1`, `kind:"atlas-static-snapshot"`, `provenance:{type,description}`, `files:[{path,size,sha256,contentType}]`, `protectedPaths`, `criticalRoutes` (HTML file paths), `criticalAssets`. Types: synthetic, supplied-artifact or public-reconstruction. All declared critical/protected paths must be in files. Missing/extra/changed files, bad sizes/hashes/types, duplicate paths/keys and unresolved required local assets fail.

Validation output contains `status`, `valid`, manifest/local consistency, `productionCompleteness:"not-attested"`, canonical manifest digest, full inventory, protected hash report, errors/warnings, reference report and coverage. Unsafe input contracts/filesystem objects throw blocked errors with nonzero CLI status; a partial successful inventory is not returned as a valid snapshot.

Supported reference checks: common HTML src/href/poster/action/data, srcset width/density candidates, inline and external CSS url()/quoted imports, static ESM imports. Relative and root-relative paths, query/hash suffixes and directory index routes are checked without HTTP. External/scheme URLs, runtime/computed references, fragments and inline script behaviour are never asserted verified. Unknown dynamic references emit warnings; they do not silently become local success evidence. Full HTML5/CSS/JS execution, SVG subresource graphs, CSS escapes/custom properties and service-worker behaviour require separate review. HTML base tags are rejected because they undermine this resolver.

## 2. Publication-mode resolver

```bash
node scripts/atlas/cli.mjs resolve \
  --input /tmp/atlas-demo-new/synthetic-mode-input.json \
  --input-sha256 "$(sha256sum /tmp/atlas-demo-new/synthetic-mode-input.json | cut -d' ' -f1)"
```

Input: `schemaVersion:1`, `event`, exact `ref`, `commitMessage`, `dispatch:{mode?}`, `gates`. All five gates must be explicit Booleans and true: sourceRevisionVerified, baselineComplete, overlayAllowlisted, validationPassed, protectedFilesPreserved. No truthy strings or omitted gates. These are **trusted orchestration facts**, not self-authenticating permissions; a commit message or fixture setting them true is not owner approval.

Only exact `refs/heads/main` is supported. Push requires a nonempty message; other events require a present string (may be empty). Markers `[static-only]` and `[cms-only]` are case-insensitive, compatible with GitHub contains semantics. Both together block. Structured dispatch modes may be full-build/static-only/cms-only/audit-only; unknown modes and dispatch fields on other events block. Marker use outside push blocks; do not feed an old push message to a schedule/dispatch event.

| Event/input | Decision when all gates pass | Meaning |
|---|---|---|
| Main push without marker | full-build | Allows orchestration decision only; legacy generators would need separate authority/live inputs |
| Main push static marker | static-only | Offline local preservation/overlay route only |
| Main push CMS marker | cms-only | Identified mode; not Supabase-independent, not executable under Authorisation 19 |
| Manual dispatch explicit mode | That known mode | No source/gate bypass |
| Manual dispatch without mode | audit-only | Conservative default, no publication |
| Schedule with no markers/dispatch mode | audit-only | Cannot grant scheduled publication |
| PR, other ref, unknown event, failed gate | blocked | No publication |

Output: mode, allowed, publicationAllowed, reasonCodes, requiredGates, explanation, authority disclaimer. `allowed:true` for audit-only means audit permitted; `publicationAllowed:false` must gate upload/deploy. Full-build and CMS-only mode support does not execute generators or authorise network access.

## 3. Protected manifest, overlay policy and assembler

Protection v1: `schemaVersion:1`, `kind:"atlas-protected-baseline"`, files with path/size/sha256. It must cover **every baseline file**, stronger than the snapshot's selectable protected subset. No baseline file can be deleted. Only exact homepage insertion can change a baseline byte.

Policy v1: `kind:"spectre-v02-footer-v1"`, schemaVersion, exact five-path allowlist, canonical baseline/overlay/protection manifest digests and homepageBaselineSHA256. Exact supported paths:

- index.html
- landing-v02/index.html
- landing-v02/spectre.css
- landing-v02/spectre.mjs
- landing-v02/state.mjs

No wildcard, extra path, deletion field or generic exception. Four dedicated files must be new; an existing V02 needs another explicit policy/review rather than silent overwrite. Overlay must match its own exact file manifest; references are validated against the final union because overlay alone is not a complete website.

Homepage replacement must equal a deterministic UTF-8 byte-preserving insertion of exactly `<a href="/landing-v02/">Preview Homepage V02 →</a>` immediately after the unique real `<div class="footer-links">` in a unique footer. The container must have a closing div inside that footer. Comments/script text cannot stand in for a real element; ambiguous/missing/already-linked structure fails. No configurable arbitrary anchor/HTML bypass. BOM, Unicode and original line endings are preserved. V02 must contain noindex and an explicit `/` return link; sitemap and original homepage metadata remain protected bytes.

For the generated fixture:

```bash
node scripts/atlas/cli.mjs assemble \
  --baseline /tmp/atlas-demo-new/baseline \
  --baseline-manifest /tmp/atlas-demo-new/baseline-manifest.json \
  --baseline-sha256 "$(sha256sum /tmp/atlas-demo-new/baseline-manifest.json | cut -d' ' -f1)" \
  --overlay /tmp/atlas-demo-new/overlay \
  --overlay-manifest /tmp/atlas-demo-new/overlay-manifest.json \
  --overlay-sha256 "$(sha256sum /tmp/atlas-demo-new/overlay-manifest.json | cut -d' ' -f1)" \
  --protection /tmp/atlas-demo-new/protection.json \
  --protection-sha256 "$(sha256sum /tmp/atlas-demo-new/protection.json | cut -d' ' -f1)" \
  --policy /tmp/atlas-demo-new/policy.json \
  --policy-sha256 "$(sha256sum /tmp/atlas-demo-new/policy.json | cut -d' ' -f1)" \
  --output /tmp/atlas-demo-new/second-candidate
```

Output container must not exist; roots must be disjoint, with existing real parent directories. The site root is **second-candidate/site**, not the container. Metadata siblings: manifest.json, validation.json, preservation.json, READY.json. No metadata is inserted into customer pages. READY and whole container appear in a single directory rename after validation, copying and final input rechecks. The assembler returns the receipt SHA-256.

```bash
node scripts/atlas/cli.mjs verify \
  --artifact /tmp/atlas-demo-new/second-candidate \
  --receipt-sha256 INDEPENDENTLY_RECORDED_RECEIPT_SHA256
```

Independent receipt pin required. This command rechecks container metadata digests and full site hashes/references. Do it immediately before any separately authorised packaging/upload. No tool downloads a snapshot, extracts an archive, invokes GitHub, sends email, creates orders or publishes.

## Library APIs

Exported functions support deterministic fixtures: inventory, makeManifest, validateSnapshot, resolvePublicationMode, assembleStaticOverlay and verifyArtifact. `signal` allows cooperative cancellation. `onPhase` is an optional trusted local observation hook used by adversarial tests to inject mutations before final checks; it is not exposed through the CLI and cannot bypass validation. Untrusted code must not run under the build account regardless of these helpers.
