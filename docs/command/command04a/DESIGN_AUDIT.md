# NOCTURNE design audit

23 October 2026 · Authorisation 41 · Baseline application `20002c45933a7f24b08f6d5f0199a7fc8fa1a282`.

## Baseline evidence and source review

All ten original COMMAND 02 Git PNGs and all eight AFTERIMAGE captures were reviewed, including desktop/tablet/phone editing, review, validation, saved, denied, expired, conflict and uncertain outcomes. AFTERIMAGE archive `12422172177` was downloaded through the GitHub integration: 817,061 bytes; SHA-256 `1762971e40e69b6cc25c7cb12ac91ee87c4b40a6a7e61cfccb1f71edb46c0579`; ZIP CRCs, decoded originals and image fingerprints matched its existing manifest.

The actual unchanged COMMAND 04 application was then launched in the established isolated Chrome environment before styling changes. Baseline CI [39926041094](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39926041094) passed all 14 requested interface journeys. Its original 14 PNGs and DOM observations were retained in [artifact 12489756458](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/39926041094/artifacts/12489756458). Independent download: 1,927,886 bytes, SHA-256 `edf9a4f8f4311ab3a48ca32ed14e26dee0acc4cbab61c9dce3f7874bea2263f1`. Expiry: 22 November 2026, 08:38:34 UTC.

Source reviewed: COMMAND 01 interface/README/browser acceptance and view/controller/styles; COMMAND 02 architecture/README/browser acceptance and schema/session/editor-view/styles; COMMAND 03 adapter architecture/README/browser acceptance, identity/bridge/styles and AFTERIMAGE successor evidence; COMMAND 04 composition/wire, README, acceptance and test harness; migration handover. The nonexistent COMMAND 04 RELEASE_GATES path was not used.

| Finding | Classification / priority | Evidence | Decision |
| --- | --- | --- | --- |
| Product identity 10px, tabs 11px, some table labels 8px | Verified sizing; readability concern / medium | CSS and baseline DOM measurements at 390/768/1440 | Increase primary fields to 16px and supporting copy to rem-based 11–14px, without removing stock/pricing/eligibility |
| Six editor tabs wrap into multiple rows on phones | Verified layout; navigation preference / medium | Original phone captures and actual 390px baseline | Native labelled section chooser at <=600px; preserve desktop roving tabs and protected sections |
| Phone editor extends beyond the capture; review/discard require scrolling | Verified reachability friction, not data loss / medium | At 390px editor bottom 1119.91px, review button bottom 1055.91px in 1100px viewport; ancestor overflow hidden | Fixed phone action tray with reserved content space; remove clipping ancestor; check hit targets and 200% text |
| Validation exists beside fields but has no cross-section summary | Verified source limitation / medium | editor-view attaches field errors; review disables when invalid | Add live summary with links selecting the relevant section and focusing its invalid field |
| Original/local/current comparisons become dense on phones | Observed presentation concern / medium | Four-column conflict table and three-column review | Stack labelled values per changed field on phones; retain actual values and supported recovery choices |
| Most surfaces share an olive cast and similar visual weight | Subjective brand choice / low | Original captures and scoped styles | Charcoal surfaces, neutral separators, restrained brass for selection/actions, larger product hierarchy |
| Review Escape can leave focus on the hidden Cancel button | Verified interaction defect / medium | New real-Chrome checks failed at all five widths after native dialog close | Restore the review invoker on the close event, preserving submission/concealment focus rules |
| Session and save messages use fixture-oriented technical language | Source-grounded clarity concern / medium | Locked/expired/unknown captures; existing states are functionally conservative | Add plain-language guidance derived from existing states, never manufacture success or display concealed draft content |
| Existing keyboard tabs, draft protection, revision checks, local filtering and image protection work | Verified strengths | Baseline journeys, source and inherited acceptance | Preserve the accepted modules and state machine; presentation extension only |

The baseline did not show horizontal document overflow at 390, 768 or 1440px. Long-label wrapping and recovery safeguards were already implemented; these are not claimed as newly fixed defects. The new work is a reviewable design candidate, not owner approval or comprehensive accessibility certification.

## Refinement history

The first implementation run `39927368511` was cancelled after source review found repeated visibility writes in the new presentation observer. It is not acceptance evidence. Run `39927766406` passed all 219 inherited Node tests and 119 inherited Chrome groups but failed five new Escape-focus checks and one pending-status test race; two additional screenshots were consequently absent. These outcomes remain in GitHub. The focus defect was corrected in presentation code; the test now synchronises the real pending fixture request rather than assuming phase entry means transport entry. The candidate also receives explicit label captions, permission-denial wording, editor scroll clearance and dynamic rem text enlargement. No inherited assertion was removed or weakened.

Run `39928631267` passed 46/47 new checks, retained all 34 planned PNGs, and passed the inherited suites. Its only failing expectation assumed a denied catalogue capability would change the bridge status to `permission`; source inspection confirmed the existing bridge can remain `authorized` with `catalogueRead:false`. The presentation now explicitly handles that capability without changing bridge security. A separate source-grounded check keeps desktop navigation below the natural/sticky header.

Run `39929435984` confirmed the missing-capability, focus and recovery fixes, but the new navigation-clearance assertion failed. The candidate inherited a `bottom:0` constraint from the shared fixed-sidebar primitive; with sticky positioning this could pull the sidebar beneath the header. NOCTURNE now clears that constraint explicitly, and the original geometry assertion remains. This run is retained as failed evidence, not relabelled acceptance.

Final verification: CI `39930046308` at source `1bbe60fd216a412eed7349c8d79acdd50a94931e` passes all 47 NOCTURNE checks, all inherited functional suites, all 10 isolation controls and before/after source preservation. All 34 original PNGs were independently verified and visually reviewed. Historical COMMAND 02/03 README retention statements are reconciled with the specific authorised successor evidence; the dated originals remain unchanged.
