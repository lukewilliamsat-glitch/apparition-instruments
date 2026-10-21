# COMMAND 01 interface
## Design
A restrained charcoal workbench with warm off-white text, brass selection/focus accents, compact catalogue metrics and an adjacent detail inspector. The only navigation destination is the functioning catalogue anchor. There are no decorative Orders/Analytics buttons, invented dashboards or disabled future Save/Publish controls.

The implementation extends the existing Admin palette, `data-admin-app` scope and ES-module conventions. It reuses `uiNode`, `statusBadge` and `setAdminFeedback`; production navigation/authentication are deliberately not mounted. No framework or application dependency is introduced. Fonts are system fonts, so no font network is necessary.

## Implemented interactions
- Search name, SKU, category, manufacturer and a documented technical allowlist. Multiple whitespace-separated terms are ANDed, case insensitive and literal; no arbitrary serialized JSON search.
- Compose category, manufacturer, individual sale, kit eligibility and stock-state filters.
- Clear all filters, remove individual filter chips, or recover from no results.
- Select by stable component ID. Duplicate names do not confuse identity. A product filtered out remains selected with an explicit note.
- Refresh explicitly; simultaneous requests coalesce. Superseded successes and errors are ignored. No polling, subscriptions or hidden periodic refresh.
- Inspect identity, selling/kit prices, stock unit/quantity, eligibility, technical metadata, description and image state.
- Retry catalogue or detail failures. A failed refresh labels retained rows as the last successful response. Empty successful data is distinct from failure.
- Close the inspector or press Escape while focused inside it; focus returns to the selected product or search if it is filtered out.

## Responsive and accessibility intent
At wide desktop widths the list and sticky inspector sit together; at tablet/mobile widths the inspector stacks. Below 520px the semantic table becomes compact component cards. No off-canvas modal or focus trap is introduced. Selection focuses the inspector heading and scrolls to it on mobile when the selection still owns focus. Delayed completion and filter changes do not steal focus from active search. All controls are native buttons, inputs, selects and links. Table headings, labels, loading status, alerts, focus outlines and text stock labels remain present.

Reduced-motion preference removes transitions and smooth scrolling. The acceptance matrix uses 390, 768, 1024, 1440 and 1920px widths and an increased-text scenario. Detailed results, limitations and genuine Chrome screenshots are in BROWSER_ACCEPTANCE.md.

## Scope boundaries
Active/inactive is the verified component `active` flag, not an invented publication/draft lifecycle. The prototype low-stock threshold (1–3) is a labelled display convention, not a reorder rule, reservation calculation or promise of delivery. Eligibility does not imply availability to checkout. All writes and commerce authority remain in the existing systems.

The image panel displays metadata/placeholders only. It intentionally does not load product photographs. There are no arbitrary image references, HTML insertion, untrusted template execution or second preview engine.
