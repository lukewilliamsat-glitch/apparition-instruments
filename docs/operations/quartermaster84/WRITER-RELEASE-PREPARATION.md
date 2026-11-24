# QUARTERMASTER production writer release preparation

24 November 2026. [84C signed-in staging evidence](STAGING-84C-REGISTER.md) records the operator, finance and observer journey. This document records release inputs and gates. The production SQL, publisher and cumulative archive still need to be sealed and rehearsed together.

## Pinned inputs

| Item | Verified input |
| --- | --- |
| Current production and immediate rollback | Deployment `3d31097e-0418-4547-bdb0-bd9f7ce91b6e`, source `15efc3473d9b91ab6664c5c2e47408bdca529b40`, 491-file artifact `14809317163`, SQL migration `20261124110722`. See the [84B receipt](84B-PRODUCTION-RECEIPT.md) and [accepted artifact digests](RELEASE-PROPOSAL.md). |
| Preserved earlier rollbacks | FIRST LIGHT `62f2f737-da53-49a5-960f-a38bdd10af11` and Release C `f290e564-6dde-4123-a349-997c70308729`. |
| Writer engineering | Source `336d2158eca4946b54d912f795d793e659442306`, isolated run `45385730487`; see [source identities and test pins](WRITER-CHECKPOINT.md). The historical private receipt and completion source in `tests/dominion78c/quartermaster79.sql` has SHA-256 `208cf52b19d4033390bb59b84319647966475118891ec585753b2e0a5ef1b81d`. |
| Working staging integration | Source `c74b0303702105bb42ec74c882addba8dba6929d`, artifact `14920546326`, migration `20261124123950`, deployment `96237d9e-1586-45c6-979a-0d55d22217a0`. The 18-file application and staging migration are bound to synthetic identities, routes and data. |
| Live Admin and read boundary | `ironclad69.actor()` MD5 `dfd0d21e2b3f4f16701b8deb7f5953c4`, `dominion81_status()` MD5 `46709eee25d4a13232a6d51c1f5028f1`, `quartermaster84_review(uuid)` MD5 `594670c01dea054008251b29e1a5b856`, `quartermaster79.saved_bom(jsonb)` MD5 `e25ca99aeea98828ecba08c7a2f3e608`. Production has the saved-BOM helper and lacks the private receipt and completion routines. |
| Finance boundary | Live `command63_financial_read(uuid)` MD5 `13c440e3341d1550a9798a6f8361d508`, `command63_financial_save(uuid,bigint,text,uuid,jsonb)` MD5 `e7226e9772be861465e0cd7f9b377f59`, and `omniscience74_orders(date,date,date,uuid)` MD5 `b728d8e8b2a23d4a08319aa316684d7c`. |

## Release composition to seal

1. One additive migration against the pinned production prerequisites. Extract the reviewed private receipt and completion helpers without the historical bootstrap, grants or activation. Add the role, gate, revision, evidence and idempotency objects in one transaction. Leave the writer gate disabled and keep the existing QUARTERMASTER read rollout in observe. Require closed direct relation and private function access at every phase.
2. One cumulative static artifact built on exact 84B bytes. Integrate the workshop into the existing Orders-linked Admin using the accepted authenticated transport, a bounded current supplier selector and explicit server-provided capabilities. Retain the observed read-only UI while the writer gate is disabled. The three staging seats, synthetic orders, seed costs, staging backend and fixture namespace must be absent. Require a full manifest, exact wrapper and ZIP hashes and a public-file byte comparison.
3. Use genuine order-linked packing evidence and existing Admin membership for the finance handoff. An authorised finance approver explicitly submits through the existing ECLIPSE revision and order-basis checks. Preserve all prior revisions. Keep estimates and recorded actuals distinct and expose approved values through the existing OMNISCIENCE contract. Exercise existing saved documents, corrected evidence and already-itemised financial records. Production defaults require actual order and cost evidence.
4. One protected publisher plus an immediate 84B static rollback. Compare installed definitions, protected environments, artifact digests and production baseline before the single dispatch. Verify canonical bytes and signed-in observe behaviour after publication. Release readiness requires a production-shaped disposable rehearsal of upgrade, no-access modes, role permissions, concurrency, recovery and existing Orders/finance behaviour. Include the exact genuine narrow-width and session-expiry evidence still missing from 84C.
5. Separate activation with one disabled-to-workshop transition for the exact writer singleton, explicit readback and named staff. Existing Orders retains dispatch authority. Existing IRONCLAD retains component stock authority. No UNITY, checkout, carrier, provider consent or label printing changes are in this proposal.

## Permissions and recovery

| Role | Scope |
| --- | --- |
| Named packing operator | Existing Admin membership plus explicit packing entitlement. Eligible orders, saved BOM, reservation, picks, completion, release and actor-owned recovery receipts. |
| Named stock purchaser | Existing Admin membership plus receipt entitlement. Zero-quantity SKU creation, bounded supplier lookup and audited batch receipt. |
| Named postage recorder | Existing Admin membership plus postage entitlement. Record existing evidence for a completed pack. |
| Named finance approver | Existing finance authority and approval entitlement. Explicit order-basis and revision-checked approval. |
| Other Admins | Existing bounded observe view. |
| Anonymous, non-Admin and service-role client | Writer access denied. Direct private relations and helper execution denied to application roles. |

Provide exact approved accounts before provisioning. Preflight the expected singleton and absence of drift. For recovery before activation, retain the additive dormant objects and restore the verified 84B static deployment if the application regresses. After activation, enter the reviewed drain mode to block new receipts, reservations, picks, completions and approvals. Check durable receipts for uncertain outcomes. A named operator reconciles physical work before releasing verified unconsumed packaging. Preserve completed movements, receipts, Orders, stock and finance records. Verify zero reservations and unresolved requests before disabling or revoking writers and restoring 84B static bytes. FIRST LIGHT and Release C remain retained.

## Next approval text for the sealed candidate

After the remaining acceptance and the exact production SQL, artifact, manifest and publisher hashes are recorded, authorise one additive dormant installation and one protected static publication against canonical 84B deployment `3d31097e-0418-4547-bdb0-bd9f7ce91b6e`. Keep the existing read rollout in observe and the new writer gate disabled. Use that exact 84B deployment for static recovery and preserve all business records. Request a separate authorisation before naming production staff or enabling workshop mode.

Owner checkpoints are the live 84B read-only Orders review and the protected 84C workshop, including a narrow-width walkthrough. Physical Niimbot acceptance gates printing separately. GitHub, Supabase and Cloudflare connections support the current engineering work. Stripe Sandbox and eBay consent belong to the later provider workstreams.
