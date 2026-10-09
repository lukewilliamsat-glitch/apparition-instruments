# Forge Application Shell V1

## Boundary and root cause

Baseline: `eed69162e9677bee5abfc0666332b3728b205fa0` / `17c140b50b5f551176c2aeec8e2735fd194682ca`.

Project-open loaded and validated the selected project, but the detail was appended after equally weighted library/creation/import/template sections. There was no workspace transition, focus or project URL. The first checkpoint promotes and focuses detail; the final shell makes Instrument the selected workspace, records the project identifier in the route, provides an explicit library return, and opens the existing detail workflows through task commands/browser items. This is a presentation/routing repair, not a new project renderer or data reconstruction.

## One application, six regions

`dist/forge-shell/shell.mjs` owns only context, active view, browser item, selected UI object and responsive panel placement. It has no electrical, database or entitlement imports. Free and private Projects use the same shell primitives and stylesheet with route adapters.

Application bar: instrument/local identity, revision where known, truthful save state, Projects/account access and explicit save action. Free local save is separate from transfer to Projects. Project cloud revision save submits the existing metadata/revision form; no autosave is implied.

Command registry: Design, Analyse, Build, Document. Native details menus retain Tab/Enter/Space behaviour; Escape closes and restores summary focus. Existing command nodes move with bindings intact. Commands cannot grant access or bypass repository/server enforcement. Compare is unavailable until at least two revisions exist.

Browser: navigation, not a giant form. Free configuration domains open their existing editors in Properties; Components exposes the current authoritative inspection list. Projects exposes Library, Instrument, Electronics, Revisions, Compare, Measurements, Templates and Document only when implemented and permitted.

Workspace: named view registry, native button navigation and a focused heading. View switching toggles existing nodes and preserves forms/electrical state. Free views are Circuit, Signal, Build/Parts and Local Save/Share. Projects views expose existing durable workflows. Neither route has blank future tabs.

Properties: existing instrument/configuration forms, existing component/terminal/wire inspector, project metadata and read-only revision/measurement/saved-component selection. Nominal specifications and manually observed measurements remain distinct. Component identity comes from existing controller selection or the revision snapshot, never invented physical/manufacturer/fit data.

Status: existing authoritative wiring/response/kit support and configuration feedback plus Physical fit UNKNOWN. Availability is not a fitment claim. Loading/error messages retain their live status contract.

Help: original onboarding and knowledge relationships remain available in a native Help dialog instead of occupying the working area. Preview disclosure stays accurate and restrained.

## State and persistence

Electrical state/history/model/response/renderer remain in existing authorities. Shell view/panel changes do not call model recomputation. Existing diagram-selection bindings feed the inspector and a selection context boundary. Existing mobile zoom, touch, pan and ambiguity handling remain; panel placement delegates to the shell.

Local save = one browser storage record. Undo/Redo = transient circuit editing history. Share = settings without private names/notes. Cloud revision = explicit immutable project history. Template = immutable reusable source for an independent project. Build Sheet = frozen revision-bound document. No public Passport or workshop metadata screen is fabricated.

Project -> editor session transfer carries owner/project/version, title and revision context. Returning designs still verifies the signed-in owner and uses the existing explicit revision flow. Stale pending designs cannot silently overwrite cloud versions; fork remains available. Project metadata draft fields survive view changes and secondary actions at the same project version; a committed new version supersedes that draft. Sign-out clears private view and pending context.

## Responsive and accessibility

Desktop: browser, workspace and Properties columns; side regions may collapse. At <=1100px the same side nodes move into native modal drawers. Tablet/phone preserve the dominant workspace, grouped commands and explicit panel toggles. <=600px command spacing and view buttons wrap; form controls remain usable. Free route reuses the existing drawer/touch controls. Resizing preserves DOM form values and circuit state; it does not reload a project.

Native dialog cancellation handles Escape and focus restoration. View changes focus a labelled workspace heading when requested; all forms retain labels, buttons retain >=44px targets, visible focus and reduced-motion contracts. No standard global browser shortcuts are intercepted. Native browser dialog focus containment and rendered sizing need Luke's manual acceptance.

## Future renderers

A view is an id/title/node with optional availability/reason; onView is presentation-only. A future WebGL/2D/manufacturing renderer may register its own node and lifecycle adapter and selection payload without changing application regions or electrical truth. No 3D/geometry/CNC/manufacturing implementation or placeholder UI exists in V1.

## Production safety and verification

No database migration, configuration update, Supabase access, project read or production fixture in this pass. The real PRS project is preserved; its legitimate use is for Luke's acceptance. Repository, domain, document engine, capabilities, Foundation/Preview SQL and electrical manifest remain exact.

Focused tests cover Project-open/routing/reachability, metadata drafts, same shell regions, navigation, selected object, view stability, responsive reparenting, native Escape/focus contracts, Free/local/pro round trips, and existing isolated ownership/IDOR/RLS/capability workflows. One final integrated gate runs only directly affected workflows. No rendered QA/browser installation/screenshots.

Local checkpoint commits preserve the implementation sequence; canonical publication uses one final exact tree. Checkpoint hashes/trees are in the completion report. No paid entitlement/billing or business/content changes.

Final gate ledger: 14 targeted checks completed. The first run stopped on the Forge DOM import test because the old workbench container still held the imported-state notice. The notice moved into the shell status layer and all remaining controller-bound children were retained in Help. Only affected Free shell/import/preservation checks and the remaining gate checks ran after that correction. The already-passing security/electrical/domain suites were not repeated. The project UI check also exercises the application-bar cloud revision save directly.

## Recovery integration, 9 October 2026

Recovered the actual complete-history bundle at `/workspace/scratch/cb2e5446a934/export/forge-application-shell-v1-tested.bundle`, SHA-256 `1c45e0750d0e37603127a5ad8ce19492f8349279f63dc6efcddd92dbe511930c`. Bundle verification and isolated import/fsck passed. Candidate `044dee881740a26ed2d08eeb3875b904ea95fa83`, tree `d2868d3552165e0aba35800b6d096bfd53cb4048`, has exactly the five recorded commits after base `eed69162e9677bee5abfc0666332b3728b205fa0` (tree `17c140b50b5f551176c2aeec8e2735fd194682ca`). The original bundle, candidate ref and Studio checkpoints remain intact.

Integration base is canonical `335bbe3dc408affface942374982fc88124f5fe2`, tree `aa5a588f477b28661d76999e06db105f389a0eb2`. Five ordered cherry-picks applied in an isolated worktree without conflicts. Initial integration checkpoint: `3f6fd13`. All eleven application files match the recovered candidate exactly; no application reconstruction or adjustment was required. The only integration adjustment is the preservation test's comparison base plus explicit current-production and route assertions. The original candidate-base assertion would incorrectly classify accepted newer Admin development as a Forge change.

Scope remains 17 files: four new application assets, seven modified application files, five test files (one modified), and this new document. No files removed. Account change is limited to the existing Projects link label. Admin, Email Template Studio, transactional-email renderer/signing/version resolution, all Supabase sources/migrations, catalogue, commerce, Luthier Hub, wiring tools, global navigation/styles, dependencies and Pages configuration remain byte-identical to the integration base. Transactional-email was read-only verified ACTIVE v14; no backend deployment or migration is required.

Original 14 Forge gates passed on the combined tree, including isolated DB ownership/capabilities/history, circuit correctness, stale pending design, responsive and keyboard behaviour. Focused production checks passed for Studio workspace/transport/renderer/backend/dispatch parity, email preview backend/Admin/dispatch, Aftercare backend/transport/Admin, fulfilment email, external order editing, Admin shell/catalogue and checkout operation guards. Static audit passed all 94 pages, local links/fragments/assets, IDs, public navigation, module syntax and imports. The production static-only Pages sequence was executed on an isolated output copy: public CMS generation (31 articles), Search Console preparation and asset stamping. Account vendor rebuild matches the committed bundle.

The historical `luthier-hub-repair` assertion expects a superseded capacitor article title and fails identically on unchanged canonical production. No Hub files changed. Current CMS data/schema and editor UX checks passed instead; the obsolete assertion was not rewritten during Forge recovery. Fixture-only tests use network-blocking preload, with NODE_OPTIONS inherited by child test processes where needed. No real emails, orders, stock, payments or customer mutations are used.

Implemented: shared application regions, Circuit/Signal/Build/Local views, contextual Properties, explicit local/cloud save distinction, focused private project workflow, immutable revisions/comparison/measurements/documentation under existing capabilities, Help and responsive native drawers. Deferred: billing/subscriptions, public Circuit Passport, physical-fit validation, 3D/WebGL/CNC/manufacturing. Free electrical tools remain available without an account. Owner-session private project acceptance remains manual; anonymous access is the safe live browser verification boundary.
