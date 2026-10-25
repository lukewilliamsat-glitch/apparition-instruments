# Byte integrity and safe processing

| Check | Result |
| --- | --- |
| Original ZIP byte count | 20,301,705 — expected match |
| Original ZIP SHA-256 | `d358efe91b5db0b0845505afd91a3eaa079c4bc0aeaa9a331fe5916d4266e349` — expected match |
| Original verification UTC | 2026-10-25T13:44:30.905084+00:00 |
| Independent private read-back bytes | 20,301,705 |
| Independent read-back SHA-256 | `d358efe91b5db0b0845505afd91a3eaa079c4bc0aeaa9a331fe5916d4266e349` — original match |
| Read-back UTC | 2026-10-25T13:45:20.300510+00:00 |
| Separate read-back | Independent retained copy materialized separately; different-file check passed |
| ZIP entry / compression | One regular `artifact.tar`; deflate; CRC32 `eee5f0a4` |
| TAR original bytes | 24,893,440 |
| TAR SHA-256 | `d894a7c54734779d692a903df2dc201a2d4480d4134d3dc4a5b08743472e314f` |
| TAR entries | 538: 115 directories and 423 regular files |
| Full ZIP CRC / TAR checksums | PASS |
| Independent per-file verification | 423/423 sizes and SHA-256 hashes match the first inventory |
| TAR end blocks / member and trailing padding | PASS: checked zero padding and two end blocks |
| Image processing | Byte hashing only; no decoding, transformation or display |

The ZIP SHA-256 was computed from streamed original bytes before private retention. Read-back came from the persistent retained copy rather than a copy of the original temporary download. Private storage identities and access details are omitted. A separate strict 512-byte TAR-header pass over that read-back verified header checksums, types, all per-file hashes and padding. This is independent retrieval and independent parsing within the same assistant/runtime, not third-party attestation.

## Limits selected before archive processing

| Limit | Selected bound |
| --- | --- |
| Original ZIP | 22 MiB |
| Outer ZIP entries | 20,000 |
| Outer expanded bytes / single envelope | 256 MiB / 256 MiB |
| Per-entry compression expansion ratio | 1,000:1 |
| Nested payload entries | 20,000 |
| Payload total / individual file | 256 MiB / 64 MiB |
| UTF-8 path / depth | 512 bytes / 32 components |
| Stream chunk | 64 KiB maximum |
| Inventory process memory | 512 MiB address-space limit |
| Inventory CPU / wall time | 120 / 180 seconds |
| Inspection output disk budget | 64 MiB; no website extraction; generated inspection outputs below budget |
| Allowed ZIP compression | Stored or deflate, unencrypted |
| Allowed payload types | Regular files and directories only |
| Supported envelope | Recognised single uncompressed `artifact.tar` in ZIP; observed format matched |

Metadata checks preceded payload processing. Paths were normalized and checked for absolute/drive/traversal paths, backslashes, control characters, UTF-8 length, depth, duplicates, Unicode/case-fold collisions and file/directory-prefix collisions. Symlinks, hardlinks, devices, special files, sparse files, privileged file modes, corruption, unsupported structures and excessive expansion were rejected. Actual entries passed every check; no link or special type occurred. Logical public paths omit the TAR's leading `./`; original ZIP/TAR bytes were never rewritten.

Methods: Python standard-library `zipfile`, `tarfile`, `hashlib`, resource limits and bounded reads. No archived JavaScript, generator, browser, server or executable content was run. Offline JSON parsing and bounded textual reference checks provide metadata evidence only; they do not certify application behaviour or current backend state.
