# Live acceptance — not executed

**BLOCKED — NOT DEPLOYED.** No new release commit was written to main, no Pages upload/deploy was initiated, and no live storefront/browser requests were made. It would be misleading to label the isolated correction as live.

The supplied live symptom remains a user observation; no current production-health conclusion is drawn from source or old successful logs. No deployment/job identity exists for this mission. The successful SPECTRE35 test run `39583250290` is isolated Chrome acceptance only.

## Existing evidence reused

Reviewed CSS SHA-256 `16d6ebbd2372d54e32565a7999edfd1bc9152c785b77f1bcbf79ee47bba1794a` is identical to tested source `232017a80fd6c5f2a3083d99cd9f647d8f4db27e`. SPECTRE35 accepted 320,390,768,1024,1280,1440,1920,2560,3440,3840 CSS-pixel widths. At 2560 the heading changed 270px/six lines → 900px/three; at 3840 zero width/22 lines → 900px/three. Desktop font size remained 120px. Representative screenshots and 21 functional checks remain [in the original evidence](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/4f09bd5b4d5109df6028a8dc0d00468512d9af1c/docs/engineering/spectre-hero-fix/BROWSER_ACCEPTANCE.md). No duplicate browser programme was run for unchanged CSS.

Known limitations are unchanged: exact external-font parity and true browser-chrome zoom are unverified. CDP visual zoom is different. A pre-existing header overflow yields a 327px document at 320px/150% default text, both before and after; the hero fits. No broader navigation correction is included.

## Proposed bounded live check after a future approved deployment

This is a checklist, not executed or new authority. Maximum **12 explicit HTTP GETs**, sequential, no retries, no redirects, 8 seconds each, maximum 1 MiB per HTML/CSS body and 6 MiB aggregate; stop on non-200, byte limit, content-type mismatch or unexpected origin. Public static first-party URLs only. Counts include the exact resolved CSS URL; redirects consume budget and stop, rather than silently broadening scope.

Inspect homepage, its exact deployed CSS reference, catalogue entry, one product path selected from the independently verified publication inventory, wiring-kit landing, interactive-tools landing and basket shell (seven base requests). Retain five requests for strictly necessary already-inventoried static references or bounded validation. Never guess the representative product URL or regenerate it. Validate all local links against the complete retained inventory before live checking.

Compare served CSS bytes with the release manifest, accounting for any separately verified stamping transform. Read-only shell checks cannot demonstrate current stock, checkout authority, authentication or payments.

Browser checks require a separate explicit allowlist and network guard **before navigation**. Use 390,768,1440,2560,3840 viewport sizes against one acquired/cached exact release; do not create an unbounded browser crawl. Block Supabase, Stripe, authentication, external fonts, analytics and service workers before application scripts run. First prove guards using harmless synthetic destinations. Reuse bounded first-party asset bodies across viewports and establish a separate finite browser request/byte budget from the retained inventory before execution. If trusted browser control cannot enforce those limits, do not open the live page; record browser acceptance as unavailable. No owner session is required or used.

This proposed checklist is not a way to infer a full deployment from HTTP200. Release acceptance additionally requires complete payload/rollback gates and correct rendered behaviour. Any material regression after an authorised release triggers the pre-established rollback, not another speculative deployment.
