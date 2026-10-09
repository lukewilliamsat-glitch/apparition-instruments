# Forge Workspace UX V2

## Architecture and navigation audit

Base: canonical `9c2e6ee4f26ce568d7dc7dd485c36813e50f3371`, tree `3036d535c5463b8ceef7e8df476c21ec35eceb90`. Isolated integration branch; original V1 bundle and accepted Studio checkpoints retained.

Authority: shared presentation in `forge-shell/shell.mjs` and scoped `shell.css`; Free adapter in `circuit-forge/application-shell.mjs`; electrical state/selection and original renderer bindings in `circuit-forge/app.mjs`; canvas zoom in `mobile-workbench.mjs`; private project UI in `forge-pro/app.mjs` and its adapter. Repository, domain, capabilities and immutable revision APIs remain authoritative. Layout controls must not call save/network/engine mutation APIs.

| Current controls | Behaviour and overlap | V2 destination |
| --- | --- | --- |
| Global site header, Account, Projects links | Site navigation; leaves editor; native keyboard links and mobile navigation | Preserve global navigation and application context links |
| Save locally / Send design to Projects | Explicit browser save or local transfer; cloud persistence requires confirmation in Projects | Primary local save in context bar; transfer in Files workspace |
| Design > Guitar & Pickups; Browser categories | Same configuration controller; current Browser opens configuration in right Properties | One Configuration Browser using existing form disclosures |
| Circuit Lab / Signal Lab menu actions | Duplicate workspace tabs; presentation navigation only | Single primary workspace tabs |
| Circuit / Signal / Build / Local Save tabs | Stable DOM views; preserves design and local draft | Sole primary workspace hierarchy |
| Browser Circuit / Signal / Parts / Local destinations | Third copy of workspace navigation | Remove redundant destinations; retain all primary tabs |
| Undo / Redo | Existing editing history; changes circuit deliberately | Circuit contextual actions using original nodes |
| Build/Trace/Explain | Diagram presentation; does not change electrical topology | Circuit contextual strip, distinguish illustration Build from parts workspace |
| View wiring / Guided build / Build kit / Designer | Existing tool handoffs with state; some unavailable for unsupported circuits | Build workspace actions, original nodes and URLs |
| Wiring SVG/Print | Existing supported Wiring Generator export handoff | Build action with explicit unavailable fallback |
| Zoom out / Fit / Zoom in | Presentation only, original fit and zoom system | Always visible Circuit canvas toolbar |
| Browser / Properties toggles | Native keyboard buttons; mobile modal drawers; desktop hides panel without freeing grid column | Reliable collapse with reclaimed canvas columns, Restore layout |
| Help | Native dialog, Escape and focus return | Preserve Help with original content |
| Inspector inventory / contacts / changes / explanation | Existing electrical authority; selection reads data without mutation | Clear labelled disclosure sections in contextual Inspector |
| Projects workspace/menu/browser destinations | Duplicate navigation on private route | Single tabs; project list is contextual browser |
| Project search/lifecycle/Open | API list filtering and explicit owned-project opening | Structured rows and read-only list details; opening remains explicit |
| New/import/templates | Explicit validated commands; originals retained | Distinct library creation/import disclosures, unchanged validation |
| Metadata Save/duplicate/archive/restore | Explicit CAS commands; immutable history; archive/restore confirmation | Preserve existing forms and confirmations; truthful busy/error status |
| Compare/measurements/documents | Capability-gated implemented workflows | Unique existing workspace tabs; no commercial or capability changes |

All retained controls are native buttons, labelled form fields, links or disclosure summaries. Keyboard and touch access remain available through tabs, responsive drawers and workspace actions. No UI layout action may clear drafts or create false dirty state. Existing circuit/project URLs and revision semantics remain unchanged. Initial audit checkpoint precedes application edits.

Resizable sidebars are deferred in favour of reliable collapse/restore and automatic canvas sizing; no new framework or persistent private layout data is introduced.

## Implemented and verified

One primary tab hierarchy; redundant workspace destinations removed from Browser and action menus. Existing configuration controls are reparented into native Browser disclosures. Original Undo/Redo nodes are in Circuit; original Wiring Generator, guided build, kit and Designer handoffs are in Build. Export is explicitly disabled when the existing wiring handoff is unavailable. Local save stays primary and marks success only after the original store reports success; failed saves retain the design. Cloud transfer stays in Local Save/Share.

Desktop collapse sets the actual Browser/Inspector grid track to zero; explicit grid placement keeps the canvas in its correct column. Restore preserves form and circuit state. Tablet/mobile use the same controls in native modal drawers. Breakpoint transitions retain desktop collapse preferences without storing private information. Canvas uses the existing resize/zoom/fit system; workspace changes no longer automatically close contextual inspection or rerender response merely because layout changed. Drag resizing remains deferred.

Inspector now has a concise overview/selection disclosure, original connections/explanation and component inventory, and a separate model-limitations disclosure. Selection titles follow the authoritative selection, including cleared/invalid selections. No measured values, topology or supported response conclusions are invented. Electrical engine, diagram renderer, domain, repository, capability definitions and database sources remain byte-identical to canonical V1.

Projects use compact structured rows, search/lifecycle controls, read-only details from loaded API fields and complete revision identities. Detail disclosure/filtering sends no open/save requests. New project/import/templates and existing metadata/revision/document workflows retain their validation and CAS/ownership gates. Empty library, filtered-empty library, loading, authentication and network-error states remain distinct. Cloud actions show busy/error state; failed actions preserve local metadata. Old shell instances are disposed before retries.

Validation: original 14 Forge gates pass; V2 focused checks cover 1920/1440/1280/1024/768/390/320px media state and computed collapse styles, native drawer cancellation/focus, restore, unique forms, unsaved retention and cleanup. These are DOM/CSS tests, not seven real-browser screenshots. Authenticated library filtering/details/error recovery pass with mocks; production project writes are not used. Seventeen focused production suites pass: Studio workspace/Admin/renderer/backend/dispatch parity, email preview backend/Admin/dispatch, Aftercare backend/transport/Admin, fulfilment email, external editing, Admin shell/catalogue, operation checkout and checkout contract. All 94 static routes pass links/fragments/navigation/import/syntax checks. Static-only production build (31 CMS articles, verification preparation, stamping) and Account vendor parity pass.

Only source-preservation base assertions and assertions identifying old control locations were adapted; no electrical, persistence, ownership or immutable-history checks were weakened. A temporary detached-DOM lookup error was caught before publication and corrected, with explicit original handoff/history reachability assertions. No baseline failures were waived in this V2 pass. No SQL, backend deployment, billing, customer emails, business mutations or production test projects. Authenticated owner acceptance and real-device visual acceptance remain manual.

Live visual verification also found a legacy laptop Inspector rule applying a two-column grid inside the narrow sidebar. A Forge-scoped block-layout override corrects it. The seven-width test now loads both original Forge and V2 CSS with the real Inspector class, asserting a single flow. This was corrected and independently redeployed before final acceptance. Live collapse/restore reclaimed exactly 550px of canvas width, with no page overflow at the checked viewport; selection, zoom/fit and Build handoff reachability were observed in the browser.
