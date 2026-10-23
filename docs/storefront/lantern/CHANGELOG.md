# Changes and rationale

| Area | Exact change | Reason |
| --- | --- | --- |
| `dist/storefront/startup.mjs` | New presentation-only boundary; pending status, hidden/busy original main, 15-second deadline, replacement recovery main, explicit reload/help/contact | Establish meaningful feedback before dependent module evaluation can fail; remove unverified snapshot controls on failure |
| Focus and semantics | Pending `role=status`/polite live region; failure `role=alert`; restore focus to recovery heading only when removed content owned focus; retain main ID/class and public component ID | Preserve navigation and product lookup context without copying purchase data |
| `dist/storefront/entry.mjs` | Four fixed route loaders retaining original module paths and query versions | Exactly one original route import; no user-controlled URL or additional repository call |
| 16 HTML entries | Four Components pages, product shell and nine product snapshots, basket and checkout retarget their existing module script | Cover direct navigation and generator template; retain existing relative/root path prefixes |
| FAQ | Two outdated blanket ordering claims replaced | Reflect implemented but conditional basket/checkout/payment capabilities |
| Components, basket, checkout | Four catalogue notices, two page introductions and one basket-summary string clarified | Basket is intent, not an order/reservation; authoritative checks and availability remain required |
| Tests | Three new offline/source harness files | Reproduce import rejection, check boundary outcomes, request count, stored intent and exact change scope |
| `tests/p10c-storefront-truth.mjs` | Two entry-script assertions retargeted; two copy expressions updated to require the new conditional wording; four original-loader target assertions added | The expected public contract changed intentionally. No inherited assertion was removed; this suite is still NOT RUN because happy-dom is absent |

The basket UI change is a single literal replacement, verified byte-for-byte against the base with that replacement applied. Each of the 16 HTML files is likewise reconstructed from the base using only its script retarget and approved wording substitutions. FAQ changes only the two reviewed sentences/answers. Existing product identity, specifications, offers/JSON-LD, images and prices are untouched. The generator reads the existing product shell/category files; no generator or production build was run or changed.

Of 899 inherited blobs, 880 are unchanged and 19 modified. Five files are added for application/tests, then eight evidence documents. No CSS, asset, dependency, workflow, Supabase, commercial rule, pricing calculation, inventory, kit constraint, checkout identity/redirect/status/cancellation implementation, cache or mutation code changed. RAV03/RAV15 were not implemented.

Presentation behaviour changes intentionally: original main content is hidden during initial evaluation, then either restored or replaced. The UI deadline can show unavailable for a slow but eventually successful import and requires reload to try again. It is not request cancellation. Existing CSS is reused; appearance, focus visibility and responsive reachability await genuine browser review.
