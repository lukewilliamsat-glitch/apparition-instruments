# Threat model and security assessment

## Trust boundaries

The tools consume a **supplied local directory and independently reviewed JSON pins**. They neither fetch production nor authenticate a provenance claim. A manifest generated from an incomplete or malicious directory can be internally consistent. The resolver's Boolean gates and supplied pins must come from trusted orchestration and owner-approved evidence; untrusted PR content, commit messages or a mutable manifest cannot create authority.

The host/build account and installed runtime are trusted. This is not an OS sandbox against a malicious process running as the same user or root. Use a private workspace, ownership/permissions, exclusive output, reviewed inputs and no untrusted code during assembly. Resource/path checks and repeated inventories detect tested mutations; they do not freeze a filesystem against arbitrary concurrent privileged changes. Verify the pinned artifact again immediately before a separately approved upload. The test harness's kernel network filter is a stronger independent process/child boundary than request interception.

## Controls

| Threat | Implemented defence | Evidence / residual limit |
|---|---|---|
| Traversal/absolute/drive/UNC/ADS | Portable ASCII relative-path policy; reject backslash, percent paths, dot traversal, colon, ambiguous delimiters | POSIX + Windows-name/case simulations; no native Windows runtime claim |
| Unicode/invalid encoding/case aliases | Fatal UTF8 decoding for filesystem names; portable ASCII filenames; case-insensitive collision set | Conservative rejection, not silent Unicode normalisation; multilingual file names require future policy review |
| Windows reserved/trailing dot/space/8.3 | Reject CON/PRN/AUX/NUL/COM1–9/LPT1–9, dot/space endings, tilde and nonportable characters | Internal spaces/@ are also intentionally rejected; alternative hashed portable names should be used |
| Symlink/root escape/special file | Check root ancestors and every lstat; reject all symlinks including broken links; O_NOFOLLOW when supported; regular single-link files only | Hardlinks, FIFOs and symlink tests; malicious same-user ancestor swaps are outside the trusted-workspace model |
| Input changes during read/build | Open/stat identity, size/mtime/ctime checks, bounded reads; directory identity checks; repeat input inventory after assembly | Deterministic mid-assembly mutation tests; post-check hostile rewrites cannot be universally prevented by portable path APIs |
| Incomplete/forged manifest | Exact file set/hash/size/MIME inference, duplicate paths/JSON keys rejected; independent raw JSON digest pins in CLI | Production completeness always unattested; MIME inferred from extension, not image-signature or content safety certification |
| Resource exhaustion | 20,000 files, 40,000 total entries, depth40, file32MiB, total512MiB, text4MiB, JSON8MiB, JSONdepth64, path240/segment100 | File-growth reads bounded. Root directory enumeration itself uses the standard readdir allocation; use trusted bounded input trees |
| Protected content rewrite | All baseline files separately hash/size protected; exact five-path overlay; four preview files new-only | No deletion, generic exception, arbitrary replacement or checkout/Forge write |
| Homepage bypass | Pinned baseline hash and exact byte-preserving link insertion in a unique real footer container | Added markup, duplicated/missing/unclosed anchor, BOM/Unicode/CRLF adversarial tests |
| Partial/failed output | Private staging + reserved nonexistent output + final validations + one directory rename of site/receipts | On normal failure owned staging/empty reservation cleaned; never remove unrelated concurrent files |
| Concurrent writers | Exclusive output-directory reservation; second Atlas writer receives OUTPUT_EXISTS; final inode/nonempty check | A noncooperating privileged writer is outside model; cannot overwrite an existing nonempty verified artifact |
| Interrupted process | Before commit no final READY exists; stage path is never the selected upload root | SIGKILL/power loss can leave private staging/empty reservation; quarantine after inspection. No power-loss durability/fsync guarantee or automatic cleanup of someone else's files |
| Tampered candidate after readiness | Independent READY pin; metadata digests and full site revalidation | Consumers must run verify against the expected path; a READY file found by scanning random directories is not trusted |
| Shell/event injection | No tool executes input strings or subprocesses; structured mode contract, exact ref/event policy | Only test runner spawns reviewed Node/fixture binaries; messages with shell syntax are tested as inert strings |
| Credentials/production access | No runtime network imports or credential requirements in tools; no external acquisition; synthetic-only tests | Kernel seccomp + no_new_privs inherited by CLI children; minimal env, no production endpoints in probes |
| Runtime page security | No generated customer JS added; only approved preview files in synthetic example | Static analysis is not script sanitisation. New actual Spectre JS/content must have independent source review and approved hashes before publication |

## Atomicity and readiness

The output is a container with site/ and four metadata files. The assembler reserves a new empty output directory, creates private sibling staging, copies baseline and allowlisted overlay, checks full union/references/protected hashes and input stability, writes metadata, then renames the complete directory onto its own empty reservation. It does not overwrite an existing artifact. An ordinary failure leaves no ready output; if an unrelated process populates the reservation, that unknown content is preserved without READY rather than deleted.

The observer hook exists only as a trusted API/test diagnostic; CLI inputs cannot inject callbacks. Cancellation and injected failures are checked before commit and clean owned staging. An OS kill is not caught by finally; stale stages/reservations must be inspected and quarantined manually. Publish consumers must select only the exact expected candidate/site after pinned verify, never glob `.atlas-stage-*` or treat `ready:true` as permission.

No archive extractor is implemented. A future archive-input step must independently defend ZIP/TAR traversal, links, duplicate members, decompression bombs and expected digest/MIME before handing these tools a local directory. Current ZIP packaging is recovery delivery, not a production capture/extraction path.

## Scope limits

No browser rendering/accessibility acceptance, image pixel/signature equivalence, deployed RLS/grant check, authenticated workflow, checkout transaction, security penetration test or current backend compatibility claim is made. No production capture or Supabase availability test occurred. Supported reference checks cannot prove external resources, runtime-generated URLs, CSS/JS semantics or an entire website's discoverability. Unknown references are reported rather than converted into completeness claims.
