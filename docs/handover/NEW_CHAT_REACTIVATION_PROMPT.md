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
7. `docs/signal-forge/V1_CONTRACT.md`

Treat the handover files as project context, not as a substitute for verifying current source/live state.

## 3. Current checkpoint

P11 is complete. P12 Signal Forge V1 is active, with Circuit Forge as its customer-facing experience. Read `LATEST_STATE.md` and current `main` for the latest workbench, shared routing and visual-semantic checkpoints; never infer a final SHA from this prompt. Luke owns rendered acceptance. Do not repeat completed P11 work or start a new Signal Forge slice without a specific brief.

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
- P11F tool-to-commerce exact matching and guarded catalogue deletion: COMPLETE. P11 overall is closed.

## 6. Signal Forge

P12 Signal Forge V1 is underway. Circuit Forge currently uses the shared component/terminal graph and renderer also consumed by the Wiring Diagram Generator. The current implementation and acceptance boundary are recorded in `LATEST_STATE.md` and `docs/signal-forge/V1_CONTRACT.md`.

Core vision:

**Design it → understand it → order it → receive measured components → build it → verify it.**

Important decisions are canonicalised under `docs/signal-forge/`.

Do not reduce Signal Forge to hard-coded guitar diagrams. Templates such as Les Paul, Stratocaster, Telecaster and PRS Custom 24 are starting configurations over a composable circuit model. Wiring visuals distinguish real junctions from crossings and support interactive path highlighting. Guided Build Mode and measured physical component instances remain later scope.

The free product should remain genuinely useful for design, understanding, wiring, product matching and Apparition-kit installation. Future paid capability should focus on advanced depth, persistence, scale and professional workflows rather than paywalling basic education or commerce-enabling functionality.

## 7. First response in this new chat

After reading the files and verifying `main`, give Luke a concise continuity confirmation containing:

- current verified GitHub HEAD;
- whether the handover files were found/read;
- current P11/P12 state as evidenced by the repository;
- current Signal Forge implementation and visual-acceptance status;
- confirmation that the Signal Forge contract and planning documents are present;
- the safest immediate next action.

Do not modify anything until Luke confirms the next action.

---

End of reactivation prompt.
