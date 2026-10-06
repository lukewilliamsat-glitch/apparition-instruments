# Admin V2 checkpoint B

Baseline: b758bf3ae282994f9882d2d806d1277c72af1ccd, tree 771a0ab22536a3d3f925ba21d3abea55123fec6e.

Overview uses existing authorised component, assembly, order, Operations/News and article repositories. It performs reads only. Each area has an independent unavailable state and retry; missing values never become zero. Stock attention is active zero-stock components; no low-stock threshold is invented. Article counts reuse the existing revision-state classifier. Store schedules and announcement timing reuse Operations authority. News counts are labelled persisted record states, not public publication counts. No Conjure draft metric is introduced.

Inventory, Assemblies, Catalogue Settings and Master use the existing shell plus a scoped presentation adapter. Existing controls move without replacing bindings. Private legacy exports move to collapsed utilities at the bottom and remain directly accessible through Settings & maintenance. Shared catalogue records and local Master planning drafts remain distinct. Existing /admin/ Inventory route and all deep links are preserved. Overview is /admin/overview/; its Add Component action opens the existing form without saving anything.

Validation uses isolated fixtures/mocks only. No production business writes, backend/schema changes, public changes or Conjure editing changes. No browser inspection. C–E and V5 remain outside this checkpoint.
