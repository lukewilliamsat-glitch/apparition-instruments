# Forge Pro foundation V1

## Architecture inspection and decision

Baseline: e84606327a3cab6ab2536bf2e0f86555a46e9d76 / 72f5ea4903ab1652cae8401d6be81e032b83b7ed.
Free uses `electronics/state/project.mjs`: explicit local saves (25 entries), session handoffs, allowlisted public circuit links, shared circuit versions 1/2, existing Undo/Redo. Preserve that envelope and all Free behaviour. Pro composes it; it does not replace it.
The existing customer Auth client is separate from Admin Auth. Reuse its verified session; never Admin membership, client flags or editable user metadata for entitlement. Existing Supabase has no Forge projects/entitlements. Admin Manifest/Hub revisions belong to publication and are NOT reusable project storage. Their immutable-snapshot and optimistic-concurrency principles are reusable, not their tables/controllers.
Shared instrument/circuit configuration, graph construction, component terminals and response engines remain authoritative. Logical BOM comes from the existing Forge component graph; current catalogue matches remain optional commercial projections, never historical technical truth.

## Domain ownership

Project is a stable instrument/build identity owned by one customer account. It has title, notes, lifecycle, timestamps, explicit instrument metadata and current revision. Revision is an immutable, versioned technical snapshot, distinct from editor Undo/Redo. Electronics is one domain in that snapshot. Measurement is an append-only manual bench observation with a type, unit, nominal value, measured value, time and optional component reference. Template is an immutable reusable snapshot; instances receive independent identities and provenance. Document records bind an immutable revision plus captured measurements to a versioned output model.
Current instrument metadata uses an allowlisted structured object (manufacturer/model/year/serial/type/configuration/notes/reference), not future arbitrary JSON or a second electrical configuration. Actual pickups/controls remain in shared electronics. No CRM customer personal-data domain is introduced.

## Capabilities and security

Named capability grants are database-owned, expiring and provider-independent. No seed grants, purchased-plan fiction, development production bypass, Admin automatic grant or billing implementation. Default is no Pro capabilities. Free remains unchanged. A trusted operator may later grant individual capabilities after explicit authorisation; this pass grants nobody access.
Capabilities: cloud, history, compare, personal templates, measurements, professional documents, workshop metadata. UI reflects capabilities, but all mutations use one database command authority with auth/ownership/capability checks, stale-version checks and immutable history. Public RPC is invoker; its narrowly granted private-schema implementation is definer solely to perform atomic writes without granting direct table DML. All tables have RLS; authenticated SELECT is owner + cloud capability, with additional domain capabilities on domain records. Anonymous access and direct user DML are denied. No public Passport route or publication API exists.

## Snapshot/versioning

Snapshot schema 1 records metadata, normalised shared electronics, engine identity, logical component requirements and configuration/control summary. It never references mutable catalogue price/stock as technical truth. Opening designs revalidates through shared normalisers. Historical documents use captured technical facts and do not substitute today's catalogue. If the engine identity differs, editor restore/document diagram regeneration stops explicitly; captured historical facts remain readable. A restore creates a new revision with provenance; the old revision never changes. Concurrent saves require the expected project version, and local originals remain untouched.
Local import is explicit, owner-scoped and idempotent by browser-local entry ID. Session transfer of an unsaved design is explicit and removed only after cloud success. Public circuit links continue to exclude project notes/instrument identity. Returning to the editor passes only UUID in URL; private context stays in session storage and is owner-verified before cloud actions.

## Component identity / future boundaries

Current graph component ID identifies an instance within a revision, not a SKU. Existing catalogue IDs identify commercial records. Preserve both. Future stable manufacturer/component identity belongs in a separate registry linking electrical, schematic/contact, verified physical-envelope and commercial projections; it must not collapse Component = SKU. Unknown dimensions/fit remain UNKNOWN. Do not create that registry without verified source data.
Geometry/manufacturing are future versioned aggregates linked to project/revision: scale/fret, body/neck, cavities, mounts, clearances, routing and CAM must each have deterministic authorities and verified units. No geometry/CNC/fit claims today.
Workshop Job and Customer will be separate aggregates linked to technical Project. Diagnostics will link revision -> session -> explicit test step -> measurement -> result; no DCR-to-tone inference. AI may propose supported primitives; deterministic engines validate. No AI authority or implementation today.
Circuit Passport foundation is a pure allowlisted technical projection, excluding title/notes/serial/manufacturer/customer reference. Any future public passport requires explicit immutable publication, revocable share identity and a separate allowlisted snapshot store. Private projects/documents never become public implicitly.

## Implemented / deferred contract

Implement instrument projects, capabilities, cloud library, revisions/restore, explicit local import, personal templates, manual measurements, deterministic structured comparison and printable Technical Build Sheet. Rendered acceptance is Luke's task; no browser infrastructure is installed.
Defer billing, grants UI, attachments, public Passport/QR, CRM/jobs, collaboration, branded documents, geometry, CNC, manufacturing, physical compatibility, diagnostics sessions and AI. Unsupported electrical configurations stay unsupported. No fake dashboard statistics or empty future-domain navigation.

## Manual acceptance

Open `/circuit-forge/projects/`: signed-out and no-capability states; granted test account (only after separate explicit provisioning) create/open/save/revise/restore/duplicate/archive/search, import a local entry without deleting it, template instantiation, measurement recording, comparison and document print/download. Open Free Forge and confirm existing editor/save/share/wiring/parts/Hub handoffs. Inspect keyboard focus, narrow layouts and print pagination. No production fixtures are created by this pass.

## Delivery notes / operational prerequisites

Checkpoint A captures the domain/SQL authority and isolated security tests. Checkpoint B integrates the complete library/editor/document UX; final G hardening records the integrated gate and reviewed migration. One UI test caught comparison results being erased by a rerender; results now survive, and failed actions retain form values. Measurements are revision-associated; historical sheets never borrow observations from another revision. Templates clear serial/reference when instantiated. Build Sheets use the existing escaped SVG renderer only for the matching engine and retain captured facts otherwise. The engine manifest regression requires deliberate engine identity/version work if electronics/renderer sources change.

Production capability grants remain empty intentionally. Luke cannot exercise entitled cloud workflows on live production until a separate trusted grant is explicitly authorised. The no-capability preview and Free integration work immediately; isolated tests exercise all entitled paths. No user-facing grant UI or automatic Admin bypass is included. Read-only public/source verification cannot substitute for authenticated rendered acceptance.

Final gate: ten relevant suites passed; the historical announcement-hotfix suite then rejected the authorised Forge source path via its old task-specific allowlist (not an announcement failure). It remains unchanged. The existing announcement runtime suite replaces it in the 11-suite gate; only affected checks were rerun. Stale editor work has an explicit independent fork action and cannot reopen against the newer version silently.

## Applied migration / verification

Supabase recorded the approved migration as `20261007101404_forge_pro_foundation_v1`; the CLI-created source file was renamed to the recorded version without altering SQL. Post-apply read-only verification confirms all six Forge tables empty, six RLS flags enabled, no anonymous read/RPC, no authenticated direct write, invoker public RPC, and empty capabilities without a user. No Forge security advisor findings. No grants, project fixtures, business records or existing content were written.
