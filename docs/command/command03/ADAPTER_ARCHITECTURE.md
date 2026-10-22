# COMMAND 03 adapter architecture

The isolated candidate composes COMMAND 01's existing workbench and COMMAND 02's existing editor without changing either checkpoint or their modules. No framework or production client is added.

## Modules and responsibilities

| Module | Responsibility |
|---|---|
| identity.mjs | Injected, in-memory lifecycle source; explicit fictional handles; synchronous generation change notifications; no password/JWT/Auth implementation |
| contracts.mjs | Source-derived column vocabulary, fixed projections, session grants, bounded rows, field/type/identity validation, safe error messages |
| bridge.mjs | Revalidation, cancellation/deadlines, read coalescing, short detail cache, permission/identity epochs, editor port, operation ownership and inert production writes |
| fixture-wire.mjs | Independent authority for handles, expiry, revocation and granular synthetic capabilities; source-shaped snake-case rows; real fixture CAS/idempotency via reused COMMAND 02 store |
| entry.mjs | Compose unchanged catalogue/editor; conceal prior-session data; retain owner-scoped drafts; session notice and recovery controls |
| index.html / bridge.css | Existing visual language with minimal session presentation; restrictive CSP; no external connect, images, frames, workers or form targets |
| tests/command03 | Focused contracts/security and actual Chrome acceptance, executed after inherited isolation and regressions |

An absent, unknown or live-shaped transport fails closed. The candidate accepts only explicitly marked fictional transports and identities. This makes the scaffold intentionally inert for production; supplying a URL or a real token cannot activate it.

## Read contracts

The transport preserves the established `send(resource,{method,query,...})` shape. Injected session/cancellation arguments are proposed extensions, not claims that the existing live transport already forwards them.

Summary reads query components with explicit basic columns, timestamp and fixed legacy-spec text aliases. They omit description, full specs/product_content, image and private cost. Inventory is separately filtered to those page IDs and selects only component_id/quantity/stock_unit. Pages contain at most 100 components; a nonempty sixth page rejects lists beyond 500 rather than returning partial success. IDs are encoded/validated; resource names and projections are fixed.

Legacy JSON aliases use actual inspected specs keys, preserving local technical discovery without every specification. Actual deployed parsing/grants/shape remain a future verification gate.

Detail reads use stable ID, limit 1 and explicit fields including description/specs; inventory is filtered to that ID. Wrong, missing, duplicate, malformed or excessive fields are rejected. The source's wider structured product_content and original image/private cost are intentionally not loaded by this limited editor. Unsupported details remain deferred, not invented.

There is no verified lightweight original-image metadata projection. The separate metadata interface revalidates permission and returns unloaded with its reason, without an image or full-detail download. Unloaded is not deleted/null.

Inspector and initial editor opening share one canonical detail read for up to 15 seconds. Review/reload force fresh authority. Pending reads coalesce; session changes, failures and successful writes invalidate caches. The inherited selected-inspector refresh may consequently need two further detail reads after a successful UI save. Shared cancellation may fail coalesced readers; an explicit retry is safe. Local search/filtering/typing causes no new table calls.

Component and inventory reads are separate, not an atomic database snapshot. Offset pagination can encounter concurrent changes. Detected duplicates/missing joins fail closed; complete production snapshot guarantees have not been established.

## Lifecycle and authority

A session snapshot captures identity generation, bridge epoch and opaque fixture handle. Each protected operation obtains authoritative capabilities; untrusted role claims are discarded. Read/write permissions are independent. Fixture authority rechecks them at commit as well as before submission.

A notified or observed change/expiry clears caches, aborts pending reads and hides protected presentation immediately. Visibility requires a successful catalogue load in the current identity generation. A retained editor remains scoped to its original identity; another identity cannot use its editor port or reconcile its operation. The original identity can restore and review without losing local values.

Ending a session while a discard dialog is open resolves that dialog as Keep editing before concealing it. It does not discard the draft or leave its confirmation promise locked. Closing a clean editor releases its identity binding. Browser navigation/teardown preserve inherited unload protection and reject stale asynchronous state.

Writes have no automatic retry. A save that crosses a session change is uncertain even if cancellation occurred; an operation-status check by the original identity must establish its outcome. Successful responses require authoritative identity/operation confirmation; newer local edits remain dirty.

## Runtime and deployment boundary

All new application code is under prototypes/command03, outside dist, with no live route or normal Admin entry. The sole new workflow is exact-branch/path restricted, contents:read, no secrets, schedule, production environment, Pages or OIDC authority.

The GitHub controller setup occurs before isolation. All application, Node, browser and inherited child execution occurs after the reused network-namespace gate and inside a clean unprivileged environment. No browser or candidate process can use external routes.

## Final compatibility corrections

The read-only display hash uses common projected component fields and the inventory tuple, so list/detail projections agree without inventing a database revision. It remains a presentation/cache key with no CAS guarantee; specification-only changes need genuine maintained backend versioning to detect reliably.

The desktop inspector has a COMMAND 03-only viewport-height scroll bound. Chrome exposed that a long source-derived detail at 500 products could otherwise keep its Edit action below the viewport while sticky. The new reachability regression passes without forced/scripted clicks; COMMAND 01/02 source remains unchanged.
