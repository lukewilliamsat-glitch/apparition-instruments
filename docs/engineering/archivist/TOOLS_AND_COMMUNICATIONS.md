# Engineering tools, private authoring and communications

All items below have source in current main; current live feature acceptance is unverified. Historical docs/suites are evidence of their recorded checkpoints, not tests rerun here. See portfolio IDs and exact paths for each domain.

## Electrical and physical tools

Wiring Generator uses one shared graph/contact/terminal authority for Build/Trace/Explain, guided parts, conductor conventions, SVG and print. Signal Forge instrument identity/state/project layers compose it rather than supplying a second electrical truth table. HSS supports standard Modern 1V2T/1V1T with the validated two-pole five-way and an explicitly supported bridge manual split; unsupported auto-split, phase/series/parallel or arbitrary devices must not acquire an invented graph.

Treble Bleed Designer/Signal Lab model bounded electrical voltage transfer with illustrative R/L/C/cable/load assumptions; they are not measured pickup data, perceived loudness or full coupled guitar response. Wiring support, numerical response support and kit/BOM eligibility are independent gates. Preserve the existing supported Modern segment limits and withhold unsupported split/phase/Both response. Build checklist state is presentation, not continuity/QC certification; physical fit and logical circuit compatibility differ. PCB/CAD/CNC, cavity routes and unverified manufacturer mappings remain future work.

Relevant source/tests include dist/electronics/instrument/capabilities.mjs, dist/electronics/response/circuit.mjs, dist/wiring-generator/*, dist/treble-bleed-designer/* and tests/hss*, advanced-switching*, switch-visual*, signal-lab*, wiring-generator*, kit-* (exact file inventory indexed). Historical media/computed-style/DOM checks must not be upgraded to native browser or physical-device acceptance.

## Forge and authoring

Forge cloud Projects preserve owner-scoped stable project UUIDs, CAS revisions, capability checks, local/cloud distinctions and instrument documentation tied to exact technical revisions. Workspace UX/shell is already main source. Instrument Workspace V3's approved SQL hash matches the main file despite a documented provider-assigned migration timestamp. It is a documentation system, not manufacturing stock/job cost or public Passport. Billing/grants UI, CRM/workshop jobs, diagnostics/AI, collaboration, geometry/CNC and public passports remain deferred.

Conjure/Manifest provides private structured and visual draft authoring, safe page mappings, semantic/body/layout versioning and protected dynamic previews. Ordinary CMS articles have an established publication path; universal homepage/catalogue/contact Manifest drafts do not have a public renderer/publication pointer. Generic authoring/media primitives remain domain-independent adapters. Do not confuse article media references with the catalogue image publisher. A future public authoring route requires its own permission, source-fingerprint, revision and complete-publication design.

## Communications and customer care

| Programme | Existing implementation/evidence | Current unknowns and safeguards |
|---|---|---|
| Order emails/fulfilment | SQL claims/result ledgers, guarded first-send/resend, audited corrections; website and external channel distinctions | Preserve payment/refund/recipient/automatic-eligibility checks; unknown SMTP outcome cannot be retried automatically |
| Email Preview GIGA | Read-only authoritative preview; HMAC signed actor/order/mode/operation/expiry/full-content identity; explicit confirm reauthorises and atomically claims | Never accept arbitrary browser HTML/recipient/totals; confirm exact installed Edge/SQL/renderer parity without sending mail |
| Aftercare GIGA | Derived seven-day Europe/London reminders; explicit reschedule/skip/handled, protected preview/delivery ledger | No automatic timer/bulk marketing/backfill. eBay draft copying is not sending or completion; marketplace/policy acceptance remains bounded |
| Template Studio GIGA | Four channel/kind templates, immutable published versions, draft/revision validation, protected placeholders, sandboxed preview | Historical applied ledger version differs from filename but approved SQL SHA matches; current deployed config/objects unknown. Published template changes invalidate stale prepared identities |
| Customer contact | Stable submission ID, validation, rate/idempotency safeguards and sent/failed/uncertain distinctions | SENTINEL fixes settled Sending label; no fake confirmed inbox delivery or automatic resend |

The source docs historically report migrations and Edge publication for Preview/Aftercare/Studio and source publication for Forge. These statements remain HISTORICALLY REPORTED APPLIED, not newly queried Supabase state. No actual customer record, message, payment or email was read/sent by ARCHIVIST. Do not reapply any migration or use real delivery as a verification probe.
