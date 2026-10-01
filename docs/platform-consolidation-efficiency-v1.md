# Platform Consolidation, Performance + Efficiency V1

Starting commit: `5238c3f1f5662c5346febd8b9d924e32cbf99d8d`.
Starting tree: `bc8e97958b8b6c45bf1f971812de287120c847f1`.
Recovery reference: `platform-efficiency-v1-recovery`.

This is an efficiency and shared hardware correction pass. It adds no electrical capability, changes no equations or electrical endpoints, and requires no schema migration. Rendered visual acceptance is pending Luke. No browsers, screenshots or manual rendered QA were used.

## Authoritative architecture

| Authority | Implementation / boundary |
|---|---|
| Electrical configuration and supported graph construction | `wiring-generator/model.mjs`, `layouts.mjs`; existing terminal contracts and supported layouts |
| Instrument configuration and capability rejection | `electronics/instrument/configuration.mjs`; `control-assignments.mjs` owns assignments |
| Instrument-to-graph adapter | `electronics/instrument/circuit.mjs`; one derived instrument state per `makeInstrumentCircuit` invocation |
| Conductive connectivity | `electronics/circuit-connectivity.mjs`; external wires plus actual closed contacts, with optional exclusion of contacts for Build routing |
| Selector contact definitions | Existing graph/layout definitions; renderer never maps selector numbers to electrical contact pairs |
| DPDT contacts and split modifications | `electronics/switching/devices.mjs` and `modifiers.mjs` |
| Passive coil participation | `electronics/switching/coils.mjs`; contracts conductive nets, then traverses existing passive coil elements |
| Response authority | `electronics/response/*`; Forge adapters and Designer consume the existing validated models |
| State and handoffs | `electronics/state/circuit-state.mjs`; legacy and instrument state adapters remain intact |
| Projects, privacy, save/load/share | `electronics/state/project.mjs` and existing project-panel integrations; filtered deterministic sharing remains authoritative |
| Physical hardware | `wiring-generator/components.mjs`; shared by Forge and Generator |
| Detached diagram composition | `wiring-generator/composition.mjs`; presentation positions never modify source graphs |
| Routes / protected bodies and titles | `wiring-generator/routing.mjs`; existing algorithm and endpoint contracts retained |
| Junctions / crossovers | `wiring-generator/diagram-semantics.mjs`; crossings never create electrical graph edges |
| Physical conductors and solder classifications | `wiring-generator/physical.mjs` |
| SVG presentation and modes | `wiring-generator/render.mjs`, `presentation.mjs`; Forge retains its thin presentation adapter |
| Viewport navigation | Existing shared fit/zoom geometry and tool adapters retained |
| Business components, availability and kit definitions | Supabase repositories; no static replacement of Admin-editable business state |
| Public HTTP projections and concurrent reads | `backend/public-read.mjs`; explicitly public resources only, no Auth transport reuse |
| Basket persistence | `basket-storage.mjs` owns the envelope; `commerce.mjs` retains product/snapshot/price eligibility; header uses `basket-count.mjs` |

Flow remains: configuration and Circuit State → validated graph → shared physical projection/renderer → Inspector/explanation → existing project and handoff adapters. Response consumes validated electrical assumptions independently of presentation. Configuration and Circuit State remain distinct.

## Demonstrated waste removed

- The global header previously imported commerce synchronously. Its dependency chain initialized two Component reads, one Kit Definition read and one permission read even on an empty-basket educational page. The lightweight counter checks the storage envelope first; an empty basket does not import commerce. Non-empty baskets still use the full existing eligibility and snapshot checks. A revision guard prevents an older asynchronous result overwriting a newer empty basket/error state.
- Concurrent identical public requests from separate repository consumers now share one HTTP/JSON load. Settled results are not cached: every later read fetches fresh business state. Requests are keyed by public config, exact URL and fetch function. Results are cloned for consumer isolation. Errors clear the pending entry; there is no authenticated/private cache or local fallback.
- Physical wiring previously traversed conductive connectivity once for ground plus once per wire. It now derives one index for the entire operation. Coil analysis previously derived eight nets per pickup analysis; it now derives one index and reuses it. Existing `net()` callers share the same algorithm, with fresh derivation rather than stale object-identity caching. Passive elements remain outside conductive nets. Net groups/canonical names are derived lazily and canonical minima require no sorting.
- Instrument circuit construction previously derived the same instrument state twice, once before graph construction and once applying values. A private helper consumes the already-derived state; the public value-application API still validates untrusted inputs.
- A draw shares its physical projection with the router, and shares routes/contact semantics with crossover rendering. Component emphasis and selected wire/path nets are computed once per draw rather than per repeated label/body/marker lookup.
- Route-cache overflow evicts one oldest entry instead of flushing all 25 entries. No global graph/response cache was added.
- Circuit State retains native buttons when the device layout is unchanged and updates pressed states in place. One delegated listener replaces per-button recreated handlers; clicking the already-selected state does no reconstruction.
- Configure retains its controls and pickup SVG across selector, push/pull and continuous-control position changes. Capability status still refreshes from current authoritative state. Configuration changes, labels, hardware, values and assumptions rebuild the relevant console normally.
- Forge component inventory buttons remain in place when their displayed content is unchanged; state-dependent facts still update.
- Inspector interaction in Build updates the Inspector without replacing unchanged SVG hardware. Trace/Explain still redraw to express participation and selection. Generator print restoration explicitly invalidates this reuse so exported markup cannot remain in the interactive view.
- Project context is recaptured once per context/render update rather than once for each generated handoff link. Each link still receives the existing privacy-filtered serialization.
- Pages without parallax/progress surfaces no longer register their scroll/resize animation work; progress layout reads occur only when a progress element exists.

## Structural measurements

| Flow | Before | After | Evidence |
|---|---:|---:|---|
| Empty-basket global shell public requests | 4 | 0 | Same hermetic page fixture with the starting Git module closure and new shell |
| Eager global shell module closure, empty basket | 39 modules / 197,676 source bytes | 4 modules / 7,000 source bytes | Static relative-import closure, including entry; excludes dynamic imports and transfer compression. Minor shell edits may change byte totals; module counts and request counts are the primary contracts. |
| Concurrent matching Component repository/raw-client reads | 2 HTTP reads | 1 | Injected request fixture; later settled read fetches again |
| Instrument-state derivations per instrument graph construction | 2 | 1 | Adapter structure, exact checkpoint graph comparison |
| Physical wiring conductive-index derivations | Wire count + 1 | 1 | One operation-scoped index replaces per-wire net traversal |
| Coil-state conductive-index derivations per analysed pickup | 8 | 1 | Hot, ground, four coil ends, output and input share one index |
| SEO Component selected columns | 15 | 12 | Drops `in_kits`, `kit_price`, `kit_price_quantity` |
| Static-only dependency installation | `npm ci` | skipped | Workflow condition; native Node asset stamping does not require packages |

No bandwidth/cost percentage or wall-clock performance claim is made. Source bytes are not measured compressed transfer. Actual production catalogue sizes and egress were not sampled.

## Supabase / network / API findings

Production inspection was limited to schema columns, relevant index metadata, RLS/invoker-view metadata and a zero-row projection validation query. No customer, order, stock, payment, refund or email records were sampled or mutated.

The inspected business tables already have RLS enabled. Public catalogue views already use `security_invoker=true`. Inventory and permitted-component lookup keys, catalogue option identity/label keys, order/session/idempotency keys and owner/date indexes already cover the inspected access shapes. No speculative indexes, policy changes, schema changes, RPC changes or Edge Function deployment are justified by this pass.

Public Component reads retain all 15 fields used by current repository consumers, explicitly selected rather than `*`. Public kit reads retain the 12 existing fields. `get(id)` filters both the kit view and permission table to that assembly instead of retrieving all kits. Permission rows are grouped once before assembly mapping. Public options retain their six used fields. These projections are version-controlled API contracts, not a copy of business state.

Scheduled product generation now requests only the 12 product-facing columns and filters to individually sold, positive-priced, supported-category products. Its existing JS eligibility checks remain as defense in depth. Kit-only products and fields are excluded before transfer; product content and image bytes needed to generate authoritative product pages remain included. The five-minute schedule is unchanged, preserving snapshot freshness.

The public reader does not cache settled stock, price, permission or option data. It does not handle authenticated Admin resources, attach user tokens, bypass RLS or substitute seeded browser data. Transactional/order functions retain their existing RPC, ownership, narrow lookup and exactly-once boundaries. The full single-order email read remains untouched because frozen invoice/lifecycle renderers consume its complete snapshot. Payment, fulfillment, inventory, refund and email delivery optimizations were deliberately deferred rather than altering these correctness boundaries.

## Switch hardware correction

The shared blade now has an open stamped-frame treatment, elongated wafers, mechanical pivot arm and curved moving fingers rather than a solid rectangular board with wire-like orthogonal wipers. Terminal positions and both contact banks remain exact. `bladeMechanism` projects the actual supplied closed pairs; it contains no selector/contact table. All three/ five Trace and Explain positions remain distinct. P2/P4 fork to both actual adjacent throws on each bank.

Build is now fully selector-independent: fixed physical hardware, common-terminal distinction, solder identities and external conductors, without a state angle, closed contact overlays, engaged-lug rings or wipers. Its short lug labels are separate from terminal identity metadata. Deep references remain available in terminal accessibility labels, Inspector and Trace/Explain. `data-label-terminal` associates every short label with its exact authoritative reference.

The toggle adds a threaded collar and layered leaf-support treatment, with distinct contact-derived lever angles. Neck, bridge and paired output contacts remain authoritative. Build simplifies the paired output caption; Trace/Explain retain actual closed pairs. No additional Forge duplicate overlay is introduced.

Above-pot DPDT composition remains detached and unchanged electrically. Six terminal identities, two poles, physical actuator states, host associations and independent LP/SG splits remain intact. The shortened B-unused caption fits between mechanical supports. Pot and switch are never merged electrically. An accidental CSS selector from the previous pass that applied Trace wiper emphasis outside Trace was corrected. Keyboard focus now highlights blade/toggle/DPDT housings as well as existing metal parts.

No wider application shell, Hub hero, Follow the Signal or homepage redesign was performed.

## Retained duplication / deferred optimization

- Tool-specific Inspector, response and navigation adapters remain separate where their workflows differ. Their shared graph, hardware, routing and explanation authority remains common.
- Legacy local repositories, seed records, compatibility exports and low-level reference superswitch/pushpull artwork remain because historical fixtures/adapters can consume them. No uncertain asset or compatibility code was deleted.
- Electrical tools still have existing business-kit handoff dependencies. Further asynchronous separation needs a deliberate API milestone; this pass removes the unnecessary global empty-basket dependency without moving editable kit truth into static definitions.
- Public content and image blobs remain complete where current clients/generation need them. Future image storage/derivative migration needs explicit byte-preservation and Admin compatibility work.
- Scheduled generation/deployment still runs every five minutes. A durable remote content revision/change detector could skip unchanged scheduled deployments, but that requires a separately justified schema/manifest contract. No freshness tradeoff was introduced.
- Authenticated Admin lists and complete order snapshots remain uncached. Pagination/read models and email payload minimization need dedicated UI/transactional contracts.
- No runtime dependencies, frontend framework, speculative response physics, new switching architecture or unsupported public topology were introduced.

## Verification and limitations

`platform-efficiency-v1.mjs` compares 185 current supported graphs and physical conductor/solder classifications with the exact starting Git dependency closure. It also covers conductive/passive separation, fresh graph edits, public concurrency/isolation/failure retry, assembly filters, lazy/race-safe basket counts, retained native state/configuration DOM and the static-only workflow rule. `platform-loading-v1-dom.mjs` compares actual fixture request counts before/after without real network access.

Existing tests cover protected routing, junctions/crossovers, ground/shield, HSS, LP/SG independent and dual splits, three wiring styles, selector states, modes, configuration, projects/privacy, handoffs, response boundaries, Control Console, Tool Experience and responsive contracts at 320, 390, 768, 1024, 1400 and 1920. Commerce/public-repository tests are included because the header/storage envelope and public read boundary changed. Transactional backend code and production data remain untouched.

The original V3.1 test failed at the starting commit because it expected toggle contacts outside the shared renderer and omitted current blade solder labels. That obsolete test contract was reproduced on the exact starting checkpoint and updated within the changed switch boundary to assert one shared authoritative overlay, exact label-to-terminal metadata and Build solder labels. This was a pre-existing test expectation, not an electrical regression.

One comprehensive final relevant regression gate runs after implementation stabilizes, with the offline guard preloaded in every Node process/subprocess. Native fetch, HTTP/TLS and socket connections are blocked; only injected fixture transports may return data. An initial broad-gate continuation was rejected by automatic approval review for possible production network access; the guarded gate removes that access. Its results and canonical publication/deployment integrity are recorded in the completion report. Test baseline comparison requires the starting Git commit in local history; it copies only requested module dependencies into a temporary fixture and removes them afterwards.

No screenshots, browser installation, rendered profiling or visual acceptance claim is included. Luke owns rendered acceptance.

## Final isolated gate

The comprehensive 49-suite gate ran with native outbound sockets and fetch blocked (including child processes). 39 suites passed initially. The HSS DOM assertion expected the old moving Build lever; updated it to assert fixed Build hardware and active Trace/Explain mechanisms, then reran that focused suite successfully (all five scenarios). Final outcome: 40 passing suites, nine baseline-reproduced failures. Nine other failures reproduced at starting HEAD: routing-v3 (pre-existing shared visual segment), instrument-v25-dom and tool-experience-v3-dom (obsolete console selectors), signal-lab-v2-dom (unmocked fetch blocked), response-lab-v1 (missing location fixture), tool-experience-v3 (obsolete class assertion), wiring-presentation-v25-dom (obsolete Build labels/support expectations), orders (unavailable stock fixture), and p10g-catalogue-options (existing In use assertion). These are retained and reported rather than broadening this pass. Modern Control Console, Advanced Switching, Platform V2, Signal Lab core/V2.1, HSS electrical, current shared presentation, storefront and checkout/pricing boundaries passed. Rendered visual acceptance remains pending Luke.
