# Implemented release mechanism

## Scope and identities

The existing HOMECOMING pure fixture contract was reviewed as prior design, then extended into bounded ZIP/TAR handling, exact assembly, complete-payload receipts, staging and delivery coordination. No frozen source is rewritten.

- Baseline main: `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`.
- Approved CSS source: SPECTRE `4f09bd5b4d5109df6028a8dc0d00468512d9af1c:dist/customer-ui.css`.
- Old CSS SHA-256: `f72258fb8d455513d2cb38e3672f914207f81ee37664c7e6b32edc7d9c320f26`.
- New CSS SHA-256: `16d6ebbd2372d54e32565a7999edfd1bc9152c785b77f1bcbf79ee47bba1794a`.
- ANCHOR public artifact identity: run `40175066908`, artifact `12590914632`; original 20,301,705-byte ZIP SHA-256 `d358efe91b5db0b0845505afd91a3eaa079c4bc0aeaa9a331fe5916d4266e349`.

No original archive is accessed to implement/test these mechanisms. Only the published ANCHOR inventory metadata was checked: 423 files, 24,508,102 file bytes, largest file 4,233,738 bytes; the selected new bounds accommodate that published inventory.

| Module | Actual behaviour |
| --- | --- |
| `payload.py` | Bounded original ZIP hash/size, single regular `artifact.tar`, full CRC and strict TAR header/type/path/padding verification; canonical inventory and payload digest; deterministic packaging |
| `spectre.css` | Exact reviewed CSS copy, not an application `dist` edit |
| `prepare.py` | Checks separate archive approval before opening baseline; exact original identity; verified CSS overlay; private new output directory; candidate/complete original rollback ZIP, receipts, difference manifest and production-not-ready report |
| `delivery.py` | Injected IO coordinator for one publish or whole-payload restore; complete active-payload/source/deployment identity; fresh externally established holiday evidence; lock/journal; no implicit retry or automatic restore after uncertain outcome |
| `handoff.py` | Validates independently pinned owner-decision/receipt hashes, exact tool source, current-state attestation and rollback acceptance; exports selected full payload for a later Pages-only route |
| `verify_uploaded_tar.py` | Rechecks the exact local TAR before upload/deploy; verifies all files, directories and payload identity; does not claim live served verification |

## Bounds and failure rules

Original ZIP <=22 MiB; strict single Pages envelope; expanded TAR and total file bytes <=64 MiB; <=4,096 files and <=8,192 TAR entries including directories; individual files <=8 MiB; HTML processing <=2 MiB/file; path <=512 UTF-8 bytes /32 components; expansion <=1,000:1. CLI resource limits: 512 MiB address space, 120 CPU seconds and 180-second alarm. Bounds apply to accepted offline data, not an assertion of billed network limits. USTAR output must support the path; unsupported lengths/structures stop, never truncate.

Reject absolute/traversal/drive/control paths, backslashes, noncanonical Unicode, case collisions, duplicate names, file/directory prefix collisions, reserved `.git`/`.github` paths, links/special/sparse/extended types, privileged mode bits, corruption, nonzero padding/trailing data and missing Pages root. No extraction occurs until complete validation. Export uses a new directory, no overwrites, no input symlinks and complete read-back; empty directories are preserved.

The release manifest hashes every file and binds source, complete inventory, directories, archive SHA and size. `payloadDigest` is the SHA-256 of canonical sorted file metadata; it is distinct from ZIP/TAR hashes. Changing packaging headers/ZIP compression changes archive identity even when file bytes agree. Future Pages upload reuses the approved inner TAR, with pinned upload-artifact/deploy-pages actions, avoiding a hidden website rebuild.

HTML cache edits use actual stylesheet link tags via HTMLParser, retaining existing percent-escape/query bytes and surrounding HTML and changing only root customer-ui.css query references to a unique `nw=<approved CSS SHA-256>` value. Script/comment literals remain unchanged; unquoted/ambiguous or absolute customer-ui.css references require review. All non-HTML files except the one verified CSS must remain identical; each HTML file must equal the original plus the exact cache-reference transformation. No wording, holiday configuration, catalogue, prices or images are changed by the assembler.

## Honest limits

The coordinator and handoff checker consume externally established current-state evidence. They do not fetch or independently prove that evidence; boolean/hash fields cannot create owner consent. A real production port is not installed. Shared remote Pages concurrency, environment approval rules, active served-byte association, durable real-payload retention and bounded live read-back still require separate acceptance. Simulated confirmation is always labelled simulated.

Local tests deny socket connects but cannot create a process network namespace in this host. CI uses a new Linux network/mount/PID namespace, no external routes and an unprivileged process with zero capabilities, proving IPv4/IPv6 denial before the synthetic suite. No application or browser rendering is part of these package tests. A browser version availability probe is not browser acceptance.

Primary sources: [HOMECOMING contract](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/f89657ec28c73a153f65c1f346fc974747bd5994/tests/homecoming36/release_contract.py), [SPECTRE CSS](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4f09bd5b4d5109df6028a8dc0d00468512d9af1c/dist/customer-ui.css), [ANCHOR inventory](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/c1100c77f22a9ee85fbe1ffbc663d092838af6ad/docs/operations/anchor/ARCHIVE_INVENTORY.md), [FIRST LIGHT gates](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/f813e6f8ca493c3f3f79de860d7f4d5a201336d8/docs/operations/dawnbreaker-first-light/PUBLICATION_READINESS.md).
