# Admin V2 final closure

Baseline: `9e49f46ab4a63fc90e640e2d9c71ca769b00cf1b`, tree `eed28bad534527c66b0f1a29c3cc77f3c3510caa`.

Removed only superseded V1 workspace menus and duplicate Admin tabs from seven migrated entry pages. Existing authenticated V2 sidebar retains every destination. Removed their now-unreferenced stylesheet. The old generator entry point remains compatible but only strips legacy injections, preventing competing navigation from returning. All forms, action IDs, domain controllers, authentication, backend contracts, public source and Conjure V4 are unchanged.

The mixed Discovery/Operations test's OPEN handoff assertion was stale: Commercial V2 allows a verified optional secondary marketplace link while direct website checkout remains primary. Existing Commercial tests explicitly assert this. Updated only the test to check retained secondary access and to check that a paused-only destination stays absent while OPEN. Public handoff source is unchanged.

Final gate: `node tests/admin-v2-e-integrated.mjs`. Seventeen local/mocked suites cover the A–D shell and workflows, all stable routes, mature CMS/editor/revisions/DOCX, media and Orders bindings, Operations schedules/confirmations, Commercial safeguards, responsive keyboard/dialog behaviour, scoped CSS and exact navigation-only source changes. Database/RLS tests use isolated PGlite fixtures. Network defaults are prohibited. No production business/content mutations, migrations or project connections are authorised or performed.

Rendered and manual acceptance belongs to Luke. No Conjure V5 work is included.
