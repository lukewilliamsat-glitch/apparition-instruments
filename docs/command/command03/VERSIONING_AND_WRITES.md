# COMMAND 03 versioning and writes

## Existing source capability

The current Admin supports generic component editing, dedicated quantity-conditional inventory updates and separately protected deletion. Its inspected component save is a sequence of private-cost, optional inventory and component requests. The component PATCH filters by ID only. No component compare-and-set token, transactional multi-table commit, operation-id journal or immutable component version/audit contract was established.

An updated_at column with a default is not proof of a maintained version, transactional update or idempotency. Source migration definitions are not proof of deployed database state. Stock's previous-quantity condition protects a different operation and cannot be repurposed as a component revision.

## Candidate capability declaration

| Surface | Guarantee |
|---|---|
| Default read-only bridge | Source-shaped bounded reads; read- hash for presentation/cache identity only |
| mutations.save / changeStock / writeImage | Explicit UNSUPPORTED before any transport call |
| Fixture-versioned editor port | Reused COMMAND 02 simulated compare-and-set and operation journal |
| Production versioned component writes | Unsupported by this candidate; requires separate reviewed contract |
| Image metadata | Explicit unloaded; no source image fetch or delete inference |

The synthetic sim-N revision travels as fixture-only response metadata. It is not selected as an imaginary database column. A production-shaped read identity is deliberately not accepted by COMMAND 02's revision-aware editor.

## Synthetic transaction

Before submission the bridge revalidates write/read permission, owning identity, selected ID, previously read revision, nonempty field whitelist, integer-pence validation and operation identity. The fixture authority independently rechecks permission, expected revision, SKU uniqueness and all field types at commit. One synchronous record replacement preserves unedited inventory, source image, private cost and structured facts.

Operation IDs identify an exact command. Fixture IDs are page-local; production key generation and durable status ownership require their own reviewed design. A reused ID with different content or another identity is denied. A conflict applies nothing and returns current authority. There is no force-save.

A confirmed success updates the editor baseline only after the response and reviewed values are validated; edits made after submission remain unsent. Confirmed failure retains the draft. Malformed success, disconnect, deadline or identity change is unknown. The original identity must reconcile status; pending/unknown/denied status never enables duplicate submission. No write is automatically retried.

The bridge does not send stock, image, private-cost, assembly, payment, order or customer mutations. salePrice remains actual selling price. Kit values remain component kit pricing, not multibuy or promotions.

## Production integration gate

Do not map this port directly to the current generic save or imitate CAS with a browser-only pre-read. A future design must establish server-authorised atomicity, protected-field preservation, real version predicate, idempotency/reconciliation, audit and error semantics, while retaining the dedicated inventory authority. No SQL/RPC or alternative auth system is implemented or proposed for execution here.

Fixture persistence exists for one page lifetime. Synthetic success does not mean any production database changed or accepted the same operation.
