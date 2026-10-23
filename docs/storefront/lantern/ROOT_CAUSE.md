# Startup failure mechanism

## Verified source defect

The five original entry points (Components, products, basket, checkout and site) resolve to 79 local modules and 171 relative import edges, with no missing local dependency. This is a static dependency scan, not a browser run.

`dist/components/catalogue.mjs` performs top-level `await refreshCatalogue()`. Its importers cannot execute until that evaluation succeeds. In particular, the Components module's loading status and `try/catch` run **after** its dependency has already awaited the initial catalogue request. Rejection therefore prevents the handler and normal rendering from being established. The product application's `startProductDetail()` catch has the same import-time boundary limitation.

Products, basket and checkout also import `commerce.mjs`, which imports `wiring-kits/snapshot.mjs` → `les-paul-kits/config.mjs` → `wiring-kits/kit-data.mjs`. The latter exports `kitDefinitions = await loadConfiguredKitDefinitions()`, awaiting component and assembly repositories. That independent eager dependency can reject before the importing application body. These existing awaits and request projections are unchanged.

The Node VM reproduces the first mechanism using the unchanged catalogue and Components entry sources, the real public repository/response validation and injected fictional responses: 401, 402, 500, malformed JSON and a non-array response each reject module evaluation; the entry's status text remains untouched and renderer calls stay at zero. This establishes the source defect without contacting the public endpoint.

## Correction and boundaries

All 16 relevant HTML entries now load `storefront/entry.mjs`. It imports only the pure presentation boundary first, selects one fixed route by an existing DOM marker and dynamically imports that route's original module. The boundary hides the original main while pending; on import rejection/deadline it replaces that subtree rather than leaving snapshot prices, stock or purchasing controls visible. Header/footer navigation remain available.

The 15-second deadline ends the loading UI; it does **not** cancel native imports or impose a transport/egress limit. Late evaluation cannot reattach the removed main through the boundary. Existing independent site/Operations requests and later application lifecycle remain governed by their original code. Recovery requires an explicit page reload; there is no automatic import, request or payment retry.

Recovery retains the main's public `data-component-id`. The independent Operations marketplace handoff uses that attribute for its existing scoped lookup; removing it could accidentally broaden the lookup. No price, stock, original controls or other product data is copied to recovery.

A valid empty response fulfils the boundary and leaves the original application responsible for its empty presentation. A failure is explicitly unavailable, never a fabricated empty catalogue. Later product/shipping errors already handled inside application functions are outside this initial-import correction. Full native product/basket/checkout DOM integration and actual screen-reader behaviour remain pending browser/DOM acceptance.
