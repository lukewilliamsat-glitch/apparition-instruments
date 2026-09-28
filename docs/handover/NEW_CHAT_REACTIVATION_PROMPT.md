# Apparition Instruments — new-chat reactivation prompt

Copy the block below into a fresh ChatGPT development chat.

---

# APPARITION INSTRUMENTS — CONTINUITY REACTIVATION

We are continuing the existing LIVE Apparition Instruments webstore and technical-tool project from a previous ChatGPT/Astra development conversation that reached its maximum chat length.

Do **not** start development or make changes immediately.

## 1. Canonical sources

Use the connected GitHub repository:

- Repository: `lukewilliamsat-glitch/apparition-instruments`
- Branch: `main`
- Production site: `https://apparitioninstruments.co.uk/`
- Production backend: connected Supabase project

GitHub `main` is authoritative for application source. Production Supabase is authoritative for live business data.

First verify the current GitHub `main` HEAD. Do not assume a SHA from this prompt is still current.

## 2. Read the continuity records before doing anything

Read these files from current GitHub `main`, in this order:

1. `docs/handover/LATEST_STATE.md`
2. `docs/handover/APPARITION_CURRENT_HANDOVER.md`
3. `docs/signal-forge/README.md`
4. `docs/signal-forge/ARCHITECTURE.md`
5. `docs/signal-forge/ROADMAP.md`
6. `docs/signal-forge/DECISIONS.md`

Treat the handover files as project context, not as a substitute for verifying current source/live state.

## 3. Immediate historical state

The last known major application implementation checkpoint before the chat handover was P11E/F at:

`9fb4f2c68e94562c5a06b6f0ab24117f48e5a626`

After P11E/F, Signal Forge planning documentation was added. A narrow P11 cleanup correction also appeared after P11E/F, including clarification of manufacturer dependency counts in Catalogue Settings. The handover files record the exact sequence and any uncertainty around the interrupted cleanup pass.

Do not blindly rerun that cleanup. Reconcile what is already present on `main`, what was deployed/tested, and only finish demonstrably outstanding work.

## 4. Working style / safety

Luke prefers focused, economical, usage-optimised passes.

- Verify `main` before each implementation pass.
- Inspect only relevant surfaces.
- Do not perform broad architecture audits unless explicitly requested.
- Do not repeat rendered/browser visual reviews that Luke has already accepted.
- Preserve unrelated behaviour and approved visual design.
- Use targeted regression tests.
- Do not create Orders, payments, refunds, Auth users, Contact submissions, customer emails or inventory mutations unless Luke explicitly authorises the relevant live action.
- Never weaken Supabase RLS or expose privileged credentials.
- Do not manufacture/replay lifecycle events merely for testing.
- Report start/final SHA, files/scope, migrations/functions, tests, deployment verification, production mutation status and any manual checks not performed.

Luke intentionally prefers a single final golden-path live Order test rather than repeatedly placing test Orders.

## 5. Completed major phases

- P09 customer account / Order ownership / Order Detail / customer invoices / Order-aware support / unpaid-order exposure closure: COMPLETE.
- P10 storefront/product experience / Frozen Reference / Product Detail / structured catalogue data / catalogue dictionaries / fitment / rich kit choices / storefront closure: COMPLETE.
- P11A-D crawlable product architecture / product SEO / sitemap / categories / internal links: COMPLETE.
- P11E product content and trust: COMPLETE.
- P11F tool-to-commerce exact matching and guarded catalogue deletion: COMPLETE at the last recorded major checkpoint, subject to reconciling the narrow cleanup activity recorded in `LATEST_STATE.md`.

## 6. Signal Forge

Signal Forge is a future flagship Apparition platform, not the immediate production priority unless Luke explicitly switches workstreams.

Core vision:

**Design it → understand it → order it → receive measured components → build it → verify it.**

Important decisions are canonicalised under `docs/signal-forge/`.

Do not reduce Signal Forge to hard-coded guitar diagrams. Templates such as Les Paul, Stratocaster, Telecaster and PRS Custom 24 are starting configurations over a composable circuit model. Wiring visuals must distinguish real junctions from crossings and eventually support interactive path highlighting and guided Build Mode. Apparition-supplied physical component instances may eventually carry measured values into a customer's saved circuit.

The free product should remain genuinely useful for design, understanding, wiring, product matching and Apparition-kit installation. Future paid capability should focus on advanced depth, persistence, scale and professional workflows rather than paywalling basic education or commerce-enabling functionality.

## 7. First response in this new chat

After reading the files and verifying `main`, give Luke a concise continuity confirmation containing:

- current verified GitHub HEAD;
- whether the handover files were found/read;
- current P11 status as evidenced by the repository;
- whether any interrupted cleanup remains genuinely outstanding;
- confirmation that the Signal Forge planning documents are present;
- the safest immediate next action.

Do not modify anything until Luke confirms the next action.

---

End of reactivation prompt.