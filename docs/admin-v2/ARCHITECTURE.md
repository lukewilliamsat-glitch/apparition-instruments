# Apparition Admin V2

Baseline: 0e90e141c4ed65d6c94847a4de1264f11ea3c210, tree 1ced88d05e145b32052a7e5373704616c82ccd6e.

One private application shell mounts after the existing authenticated Admin role check. It owns the primary hierarchy, session controls, responsive sidebar and page-header contract. Existing forms, action IDs, domain controllers and repositories remain the functional authorities. Conjure is a prominent launch destination and is explicitly excluded from the shell; its editing viewport and entry/return behaviour remain intact.

The shared CSS is opt-in through data-admin-app and pairs private surfaces/foregrounds. It does not change public tokens or Conjure styles. Dense tables retain horizontal overflow. Navigation duplication is removed before workspaces become visible. Existing deep links remain available; Overview is a dedicated command-centre route.

This pass does not change Supabase schema, permissions, RPCs, production business data, public website source or Conjure source. Validation uses isolated fixtures and deterministic DOM tests, not a browser. Luke performs rendered acceptance.
