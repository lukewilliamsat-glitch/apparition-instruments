# Evidence index and completion protocol

Authorisation: owner-supplied AUTHORISATION 48 and the subsequent explicit owner approval to publish these eight sanitised metadata-only reports. No authority is inferred from historical reports. All times are UTC.

| Evidence | Identity / result |
| --- | --- |
| Exact source | [`2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`](https://github.com/lukewilliamsat-glitch/apparition-instruments/commit/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f) |
| Base tree | `eb2c9f1824602d19ed27f010cf080190a06c713e` |
| Workflow definition | [static.yml](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/.github/workflows/static.yml) |
| Generation/stamping sources | [product generator](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/scripts/generate-product-pages.mjs), [CMS generator](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/scripts/generate-hub-cms.mjs), [asset stamper](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/scripts/stamp-static-assets.mjs) |
| Pre-stamp engine manifest | [source manifest](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/dist/forge-pro/engine-manifest.json) |
| Run / job | [40175066908](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40175066908) / [121113848149](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40175066908/job/121113848149) |
| Original artifact | [12590914632](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40175066908/artifacts/12590914632); expiry 2026-10-26T08:02:50Z |
| Original ZIP / retained copy | SHA-256 `d358efe91b5db0b0845505afd91a3eaa079c4bc0aeaa9a331fe5916d4266e349`; independently equal |
| Retention verification | [Sanitised verification](RETENTION_RECEIPT.md); private destination/access identifiers omitted |
| Full file evidence | [423-row inventory](ARCHIVE_INVENTORY.md) |
| Offline safety | [integrity and bounds](INTEGRITY_VERIFICATION.md) |
| Provenance boundary | [workflow publication versus currently served bytes](RELEASE_PROVENANCE.md) |
| Release limitations | [rollback assessment](ROLLBACK_ASSESSMENT.md) |

No temporary download reference, private storage identifier or access detail is part of the public evidence. Original bytes remain private. The approved checkpoint adds exactly eight Markdown reports under `docs/operations/anchor/` to verified main; all 899 inherited source blobs remain unchanged. A previous publication attempt was rejected; the owner subsequently supplied explicit approval for sanitised documentation. All eight documents were reviewed and storage access details removed before this approved attempt. No archive retrieval is repeated.

Publication must be followed by independent GitHub reads of every document, comparison with the sanitised local bytes, verification of the final commit/tree/parent and a check that all 39 other existing branch heads remain unchanged. The final handover records the observed results and final commit identity. If publication is rejected again, stop without an alternative publishing route. The private original archive and prior evidence package must remain unchanged.

Mandatory sequencing for this mission and future multi-task authorisations:

**EXECUTE → VERIFY → PUBLISH → READ BACK → CONFIRM → CONTINUE.**

Gate A verified exact metadata before the single retrieval. Gate B preserved the hash-verified original and independently read it back before extensive inventory. Gate C completed safe inventory and provenance/rollback assessment. Gates D/E publish only these reports and independently verify them. Completion is declared only after those checks. A PARTIAL/BLOCKED task may be preserved honestly; only an explicitly authorised independent next task may then continue. Engineering publication grants no production authority. Gate G requires a separate scope before another project begins.

## Document integrity before publication

These SHA-256 values cover the seven companion UTF-8 Markdown files, including their final newlines. This index excludes its own digest to avoid recursion. Git object identity and full independent GitHub read-back also bind all eight documents.

| Document | Bytes | SHA-256 |
| --- | ---: | --- |
| [ARCHIVE_INVENTORY.md](ARCHIVE_INVENTORY.md) | 54189 | `894ed3e291d2d5a675a6f7829f1afa08f99aa2315ad3fa698c178a726800d298` |
| [ARTIFACT_IDENTITY.md](ARTIFACT_IDENTITY.md) | 1981 | `ac74f80c343de8b1f1f68f0ae7e23d2ff80f09ef9204bef4dcbc348e4565a079` |
| [INTEGRITY_VERIFICATION.md](INTEGRITY_VERIFICATION.md) | 3512 | `f51c8a992d2f0bf070db1d8aa4637abd1f506a0c9b2b54e6df2045fa28cc37b4` |
| [README.md](README.md) | 3886 | `06f7eb7ebc8fb379df174e882af329f811b78d5f5cb755f231e0c4909bfcc90b` |
| [RELEASE_PROVENANCE.md](RELEASE_PROVENANCE.md) | 3888 | `7ab1fd270837e17ed04e62ff1dec36b9602704a62478bb76e18d73685c5b7705` |
| [RETENTION_RECEIPT.md](RETENTION_RECEIPT.md) | 1733 | `383775253d86459381379255983b6c3163b47279c9da72a7221b738c0bdaf018` |
| [ROLLBACK_ASSESSMENT.md](ROLLBACK_ASSESSMENT.md) | 4208 | `4e75451dfa9d6d98e3781ecd6fb8e43e49de2de1ea5381a5b5a6b9488e4f4a3b` |
