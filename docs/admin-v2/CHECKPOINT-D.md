# Admin V2 checkpoint D

Baseline 713a9c2e9441a5fd435acc0ac9e021e15e6ddc9c; tree 39ff8f43b08d75d361092f9042201d5cd041595e.

Site Operations and Commercial retain their existing URLs, forms, repositories and business authorities. The shared route adapter presents Site Operations/store/audit, Commercial, News and Announcements separately, retaining all controller nodes. Store summary styling uses the existing effective-state/preset classifier. Schedules, UK timezone validation, optimistic concurrency and RPC payloads are unchanged.

Commercial rows expose scope, URL, enabled/disabled and paused-only conditions as text; Edit and Remove remain explicit. Removal now requires confirmation before the existing mutation path. Shared feedback presents loading/success/error with polite status semantics; the existing reload and error contracts remain.

Shared refinements prevent fragmented table headings, expose row keyboard focus, keep forms/dialogs within narrow viewports and preserve cream CMS surfaces. The narrow drawer removes closed links from keyboard access and contains Tab while open, with Escape returning focus. Native dialogs gain initial form focus, Tab bounds and focus return; no domain actions are introduced.

Validation is local/mocked with production network prohibited. No schema/backend/auth/RLS changes, business/content writes, Conjure/public edits, browser inspection or final E cleanup. E/V5 remain deferred.
