# NOCTURNE presentation changes

All inherited COMMAND 01–04 code, tests, SQL, evidence, production assets and workflows remain byte-identical. Additions are confined to `prototypes/command04a/`, `tests/command04a/`, this documentation directory and one engineering-branch acceptance workflow.

| Change | Purpose |
| --- | --- |
| Scoped charcoal/neutral surfaces, restrained brass, rem-based typography, clearer focus rings and numeric alignment | Improve readability and hierarchy without adding imagery, fonts or dependencies |
| Desktop catalogue/editor split, bounded catalogue scrolling, wider eligibility column, compact name/SKU row | Keep product context visible and use available width; preserve all catalogue columns |
| Labelled native section selector at <=600px; retained roving desktop tabs | Make phone navigation deliberate while retaining all six supported/read-only sections |
| Catalogue shortcut at <=1100px with retained draft, local search and return context | Browse without rebuilding or abandoning the editor; actual product changes still use inherited dirty-state protection |
| Fixed phone action tray, reserved content space, unclipped editor, modal actions and labelled stacked comparisons | Keep review/discard/check-outcome and comparison controls reachable |
| Explicit field labels, GBP labels, instructions, existing inline validation plus a live cross-section error summary | Explain fields and move directly to invalid values without changing validators or calculations |
| Additional session/save guidance derived from bridge/editor snapshots | Distinguish locked, denied, read-only, expired, dirty, saving, confirmed, conflicting and uncertain states; never expose draft content outside the protected subtree |
| Review focus restored after the native dialog close event | Correct Escape focus remaining on a now-hidden dialog button; no focus move after submission or protected-workspace concealment |
| Fixed synthetic workload sizes 14/100/500 in candidate composition | Exercise the actual inherited authority with realistic fictional catalogue sizes, rather than extending an inconsistent fixture after creation |
| Local fixture-exit document | Support the inherited editor's local exit target within this new prototype |

`compose.mjs` preserves the accepted COMMAND 04 composition, changing only the relative IRONCLAD import and selecting one of the three supported fictional counts. `entry.mjs` is a presentation extension: it reads the existing snapshots, renders text/labels, selects existing sections, manages catalogue scrolling and restores dialog focus. It does not implement mutation, identity, permissions, stock, prices, revisions, receipts or reconciliation.

The original state machine still owns review eligibility, dirty protection, save/discard disabling, uncertain-outcome handling and authoritative success. Inventory stays read only; images remain metadata only; private costs are not displayed or edited. Selling price retains its established meaning.
