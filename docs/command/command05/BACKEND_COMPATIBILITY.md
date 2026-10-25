# Real backend compatibility — UNKNOWN, no calls authorised

Owner reports allowance reset and active webstore/holiday mode; current quota figures, reporting lag and backend access contracts are not independently established here. No Supabase request, SQL, Auth session, business row, credential or migration was used. Synthetic acceptance proves the integration under its declared fixture contract only.

## Source-known vs deployed-unknown

| Question | Git source evidence | Still required |
| --- | --- | --- |
| Authentication | admin-auth access/refresh session, user check, self admin_members lookup | Installed Auth/membership/RLS behaviour and session/revocation handling; no live session accessed |
| Read projection | components source fields, specs JSON, integer-pence prices, updated_at; inventory component_id/quantity/stock_unit | Actual types/exposure/grants/policies, row caps and coherent least-data authenticated reads |
| Image/private fields | Main components has image; component_internal has costs/supplier/private notes | Prove new list/detail never requests/returns them; no original image decoding needed |
| Stock permissions | Source existing membership-wide Admin policies; synthetic inventoryRead is deliberately narrower | Authoritative permission mapping, inventory visibility for launch audience and legacy route boundaries |
| Versions | Source updated_at/defaults do not establish all-writer CAS; order and FORGE versions are separate | Installed revision/receipt/audit and all actual writer dependencies before write activation |
| Migration state |46 main migration files and recorded historical crosswalks in ARCHIVIST | Actual installed schema; no filename/timestamp assumption or replay |

The candidate rejects non-synthetic read adapters until this compatibility gate is closed. No database migration is inherently needed merely to render this UI, but a verified production read adapter and coherent, bounded server contract are still missing. The existing unrestricted eager Admin list reads images/private costs and is unsuitable. Narrow remedy: inspect only the read path, verify its grants/projection/freshness/budget, then implement an explicit data-minimised read adapter. Do not activate IRONCLAD, build new financial permissions or migrate unrelated services just to launch read-only COMMAND.

## Proposed minimum metadata inspection — NOT EXECUTED / NOT AUTHORISED

`BACKEND_INSPECTION_CONTRACT.json` contains four exact SELECT-only metadata proposals and their hashes. Proposed ceiling: one execution each,5 seconds,8,192 accepted UTF-8 bytes each/24,576 aggregate, maximum50 rows; a reached row/byte limit is incomplete, not permission to paginate/retry. No user, membership, product, inventory, customer, order, private cost or token rows; no function bodies, secrets, unrestricted schema dump or writer invocation. Read-only transaction/session settings must be enforced by an approved provider inspection channel, not assumed from a SQL label. No channel or privilege is selected/used here.

The four proposals identify expected columns, relevant RLS/policy fingerprints, effective table grants for anon/authenticated and optional catalogue view security metadata. They do not prove real JWT row-level behaviour. Policy fingerprints require association to reviewed source definitions; a mismatch/unknown is HOLD. Privileged operator metadata success is not a browser-identity access test. Installed helper/schema/migration questions not needed for the narrow read launch should remain deferred to the separately authorised write phase.

After owner-approved metadata evidence, prepare the exact owner-operated authenticated read acceptance and request/response budget separately, using current session authority without sharing credentials. No privilege expansion, automatic login or business-data export is assumed. Real read compatibility, real write compatibility and owner UI acceptance remain separate gates.
