# Atlas Phase 2A — offline publication safety tools

Authorisation 19. Build-time tooling only; no source of customer-facing JavaScript is changed. No existing application, workflow, schema, adapter, image publisher or frozen candidate is modified.

The three components are `scripts/atlas/validate-snapshot.mjs`, `resolve-publication-mode.mjs` and `assemble-static-overlay.mjs`; common path/contract/hash utilities are in `core.mjs`, static reference analysis in `references.mjs`, and the unified command interface in `cli.mjs`. All imports are Node standard library or these local modules. No package or lockfile change is needed.

Read `CONTRACTS.md`, `THREAT-MODEL.md`, `WORKFLOW-INTEGRATION.md` and `CAPTURE-DESIGN.md` before using the tools. The JSON schema in `contracts.schema.json` describes inputs; executable validators enforce additional path, cross-file, size and digest relationships. `FUTURE-ADMIN-COMMERCE.md` records requested future features only.

## Safety states

- **Manifest consistency:** supplied path/hash/size records match local files.
- **Local consistency:** supported local references and required paths also pass.
- **Production completeness:** always `not-attested`. A local manifest is not evidence that all production files were discovered or preserved.
- **Candidate ready:** a validated local artifact was atomically assembled; never means publication authority. Every receipt says `productionPublicationAuthorised:false`.

## Quick synthetic demonstration

Run from a recovered source checkout. Do not use production content or credentials.

```bash
node tests/atlas/demo.mjs /tmp/atlas-demo-new
```

The destination must not exist. It receives synthetic baseline/overlay files, digest-bound input manifests/policy, validation, a decision example and `candidate/` with a `site/` root plus receipts. The demo is labelled synthetic and uses none of the real Spectre assets or downloaded production evidence. No browser or network is used.

## Full isolated regression run (Linux x86_64)

```bash
python3 tests/atlas/run-offline.py --evidence /tmp/atlas-results-new
```

Requires existing GCC, Python3 and Node. It compiles the included small seccomp launcher locally, strips inherited environment credentials, probes its kernel/child network restrictions using documentation IP ranges and `.invalid`, and runs only Atlas fixtures/tests/demo. It installs nothing. The filter prevents creation of network sockets, connect/send and io_uring operations; children inherit it and cannot remove it. Fetch/WebSocket stubs add defence in depth. No production endpoint is used even as a probe.

The reviewed launcher supports Linux x86_64 only. On another OS it stops rather than claiming isolation. Windows-compatible path rules are tested synthetically on Linux; native Windows/macOS, browser and assistive-technology acceptance are not performed.

## Publication status

No production artifact has been captured or certified. No deployment or workflow installation is authorised. The review-only workflow patch requires a separately approved mechanism to supply pinned local inputs and independent completeness/approval evidence. Do not install it just because local tests pass.
