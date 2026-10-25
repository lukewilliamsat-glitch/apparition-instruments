# Accepted source adoption

Sources and remote branch heads match the checkpoints supplied in Authorisation51. No frozen branch was changed. Main is the composition base; this is selected source adoption, not a cumulative branch merge.

| Source | Adoption and boundary |
| --- | --- |
| COMMAND01 `3b84871ccb338296b52b4fe3fe350be17284d235` | Model/filtering/controller/view structure adopted from cumulative NOCTURNE source. Added explicit read-only port type; fixed document-local option construction and generalised fixture wording/import paths. No filtering/pricing semantics change. |
| COMMAND02 `048824545c1fc3655778bc7cca22bc6f2e1bc447` | Draft/schema/review behaviour follows in editor checkpoint; no legacy save wiring. |
| COMMAND03 `2c2d629a6194506d34c2fbbcce4742fceee94488` | Session generations, capability distinctions, stale-response rejection, no token/error leakage and unknown-outcome principles carried into the Admin read boundary. Original bridge is deliberately fixture-only and not relabelled as live authentication. |
| COMMAND04 `20002c45933a7f24b08f6d5f0199a7fc8fa1a282` / tested `24d7232b13de2cea3c43a892ec433a8ae5322a7e` | Preserved future transactional contract. No fixture SQL or synthetic actor/session_user mapping imported into production. |
| NOCTURNE `993108aa7d65ac204ef54a7018a85f5c783813fd` / presentation `1bbe60fd216a412eed7349c8d79acdd50a94931e` | Accepted workspace DOM composition adopted into the real Admin main, replacing prototype header/sidebar with the existing Admin shell. Responsive styling/editor presentation follow. Owner UI sign-off remains open. |

`SOURCE_MAP.json` records exact source/adoption hashes; final checkpoint refreshes hashes after deliberate presentation adaptation. ARCHIVIST COMMAND_REGISTER, INTEGRATION_DEPENDENCIES and MIGRATION_REGISTER were read from `faa860df58901a1c4ebbf7cba5b3677b3fd6bafc`. Deployed schema and every legacy writer remain separate gates.
