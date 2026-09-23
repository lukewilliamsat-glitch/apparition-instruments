# Customer-ready Pass 01

Two checkpoints: immutable configured-kit basket snapshots, then focused Builder presentation.

## Saved record

New Les Paul entries carry schemaVersion 3, template version, platform/name, normalized configuration, human-readable specification, central component identifiers/SKUs and public technical metadata, quantities, supplied/existing status, explicit kit-price basis, pot/capacitor/bleed/matching specifications, GBP integer-pence pricing lines/base/total, creation time, and the existing engine's complete circuit snapshot plus diagram configuration.

No internal costs, margins, retail prices, stock values or images are copied into the customer record. No orders, reservations or deductions exist. Browser storage is still development persistence, not a permanent order database.

Reading a basket, changing quantity, adding another component, and printing the basket specification preserve its record. Only explicit Edit Configuration > Save replaces it with current choices/prices. Identical configurations at different catalogue revisions/prices remain separate basket lines. Existing schemaVersion 2 records retain their saved names and prices; they cannot retroactively recover component snapshots that were never recorded. Older entries without any record are visibly marked reconstructed from current options.

## Supported scope

Les Paul is the only commercially configured kit in the current central kit registry. CTS short/long, mapped capacitors, bleeds, jacks and toggles remain governed by Admin active/inKits and independent kitPrice. Alpha has a central inventory record but no existing approved customer-kit binding/price, so it has not been fabricated as a priced kit option.

PRS SE Custom 24 remains in development. The retained generic PRS circuit is a superswitch conversion, not a verified SE 3-way-blade factory template. No PRS circuit or price was invented. Fender remains unavailable. Landing family organization is preserved.

## Presentation

Summary and Add to Basket now precede the secondary diagram. Existing hardware choices explicitly say Use my existing output jack/toggle. Required hardware remains present in the same complete circuit. Unavailable saved radio choices stay visible and disabled rather than being silently substituted. Responsive rules contain diagram scrolling and allow long specification labels and selectors to wrap.

## Verification

Kit pricing/snapshots, Admin integration, product content, assemblies, Master, Designer, shared circuit regressions and site route/import audits checked. Static layout rules reviewed at desktop/tablet/mobile breakpoints. Browser visual/click QA remains unverified: this buildless static Site has no compatible supervised preview. No claim of production checkout readiness.
