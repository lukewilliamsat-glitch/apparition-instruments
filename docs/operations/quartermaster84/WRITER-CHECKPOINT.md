# QUARTERMASTER writer engineering checkpoint

24 November 2026. Isolated only. The live production release remains the 84B read-only observation deck.

## Tested source and evidence

- Isolated source [336d2158eca4946b54d912f795d793e659442306](https://github.com/lukewilliamsat-glitch/apparition-instruments/tree/336d2158eca4946b54d912f795d793e659442306/tests/quartermaster84w), protected from deployment by the engineering-only workflow. [Actions run 45385730487](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/45385730487) passed PostgreSQL 17 and Chromium. Local PostgreSQL 17.12 also passed.
- Exact isolated SHA-256 pins. Core SQL `e403818bb73283f4871b9d2fb2baca9f5e980f376e5dd729bcecd12c077a1026`. Context and SKU SQL `7e2fa0016326144de6884984181637c231e7e3cf47a5f934ce3a0b3627a8d241`. UI overlay `65ffe320574328aa999c6012ba990c74114e16f35431b3e1bce82503349e4f0e`. The SQL reuses exact accepted Stage A and 84B definitions and the historical private receipt and completion routines. Its gate and synthetic principals are isolated.
- Three real PostgreSQL backends observed lock waits for last-unit allocation, same-order reserve, duplicate release and completion, and competition with a refund or dispatch. The acceptance covers a stale generation and revision, repeated counts, release then re-reservation, one packaged stock movement and exact cost, current partial refund approval, separate postage values, physical component stock preservation, and unchanged historical financial revisions. The known uncertain-command read returns only the original authenticated actor's bounded result.
- Chromium desktop and 390 px mobile verified the isolated order overlay, order-return navigation, the generation-aware request, disabled state, locked state after unconfirmed submission and UI cleanup. The underlying browser response comes from fixtures. The transport rejects the production backend and production JWT issuer before sending requests. The protected owner walkthrough accepted earlier used the separate 84B-P fixture. Neither exercise is a production writer acceptance.
- [Owner print proofs](https://chatgpt.com/library?file_id=libfile_2b36395af1908191a28c1aacfaec6a70&account_id=personal) use the accepted label generator's component, acquisition batch, matched set and packaging layouts. The PDF pages are 50 × 50 mm at actual size. The proof ZIP includes SVG and 300 dpi PNGs. The digital radius stayed inside the required 21 mm. Approve actual circular roll output on the M2 separately.

## Proposed roles

| Capability | Permitted scope |
| --- | --- |
| Packing operator | Explicit staff entitlement and existing Admin membership. Bounded order context, reserve, confirm saved picks, complete, release, inspect own request outcomes. |
| Packaging purchaser | Explicit entitlement and Admin membership. Create bounded SKU metadata at zero quantity and record an audited supplier receipt into packaging stock. |
| Postage evidence recorder | Explicit entitlement and Admin membership. Record actual postage evidence once for a completed pack. Existing Orders fulfilment and finance approval remain separate. |
| Admin without staff entitlement | Existing 84B read-only review. |
| Non-Admin, anonymous, service-role client | Workshop RPC execution denied or membership rejected as applicable. No direct private table access. |
| Release operator | Protected operational state transition and role provisioning through an independently reviewed authority. |

## Remaining writer release conditions

1. Produce a reviewed staging overlay compatible with its pre-existing Commerce schema. Bind its real Admin identity, exact staff seats and fixture supplier directory. Replace the supplier-ID rehearsal control with an approved bounded IRONCLAD supplier selector. Exercise packaging receipt and actual postage on a genuine signed-in staging account.
2. Integrate the writer overlay into the existing Admin with the 84B review retained for observe. Produce a sealed cumulative static artifact and exact writer migration with prerequisite fingerprints and a separately reviewed real rollout guard. The isolated rehearsal gate intentionally differs from the production singleton. Recheck both DOMINION and the 84B review against any drain-compatible mode schema.
3. Complete the ECLIPSE / OMNISCIENCE handoff through their existing authority. Keep packaging actual, postage estimate and postage actual separately sourced. Preserve append-only financial revisions and prohibit silent posting from packing. Current isolation proves the 84B cost projection and preservation of existing revisions.
4. Review in-flight recovery before activation. Freeze new receipts, reservations and picks, reconcile physical work and durable request outcomes, then permit only the reviewed drain actions. Preserve completed packs, movements, assigned batches, postage evidence and historical finance. Do not release physically used packaging until a named operator reconciles it. Verify zero unresolved reservations before disabling the writer and restoring known-good static bytes if needed.
5. Bind the exact final SQL, manifest, workflow, writer roles, canonical 84B baseline and static recovery artifact to a future release request. Keep schema/static publication and writer activation as explicit separate gates. Physical label testing gates only a print release.

## Smallest next authorisation

Authorise one **protected staging writer integration** after the exact stage-only migration, synthetic fixture seed, cumulative stage preview artifact, project/host bindings, staff roles and rollback hashes are attached. Target Supabase `prwmowexhonguvtiywsy` and the existing protected preview project `apparition-phoenix-preview`, with a stage-specific alias and no other application bindings. Keep customer data, production credentials, provider actions and production deployments out of scope.

Proposed later production authorisation. After genuine staging Admin and owner workshop acceptance, submit one pinned writer schema and one sealed static artifact against verified 84B deployment `3d31097e-0418-4547-bdb0-bd9f7ce91b6e`, initially retaining observe. Submit a separate activation gate with named staff authorities, exact one-row mode transition, protected writer endpoint permissions and a proven drain plan. Keep UNITY, provider integrations and label printing outside that release unless explicitly authorised.
