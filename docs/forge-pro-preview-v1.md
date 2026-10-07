# Forge Pro Preview V1

Open development preview for confirmed, non-anonymous authenticated customer accounts. Anonymous visitors can discover the preview; private records require authentication and remain owner-scoped.

The singleton `forge_private.preview_policy` is authoritative. It currently enables only:
- `forge.projects.cloud`
- `forge.projects.history`
- `forge.projects.compare`
- `forge.templates.personal`
- `forge.measurements`
- `forge.documents.professional`

`forge.workshop.metadata` is excluded. No subscription, billing, price, individual grant or permanent entitlement is created. Availability may change.

Existing server commands and RLS continue to call `forge_private.has_capability`. Explicit unexpired grants remain effective when preview is disabled. Clients cannot read or modify the private policy. The public invoker resolver returns only effective capabilities for the authenticated caller.

A trusted database operator may disable preview with `update forge_private.preview_policy set enabled=false where singleton;`. This does not delete projects, history or grants. Existing capability access rules apply while disabled. Do not execute this during release verification.

Entry points: Free Forge getting-started area, Interactive Tools Signal Forge block, and the signed-in Account panel. Projects: `/circuit-forge/projects/`. Signed-out visitors use `/account/` to sign in/create an account and confirm email, then the Account Projects link. Only a title is required to create the first project. Free design, local saves, share links and wiring export are unchanged.

Verification uses isolated PGlite fixtures only; production verification reads configuration, schema/security metadata and row counts. Production writes are limited to this migration and one preview configuration row. No production customer/project/business fixtures.

Rendered acceptance: Luke checks discovery, account flow, mobile presentation, first project, editor round trip, history, comparison, templates, measurements and Build Sheet download with his own account. No browser QA performed by the agent.
