# Release provenance — three separate claims

| Claim | Result and evidence |
| --- | --- |
| Verified original archive bytes | PASS: GitHub-reported ZIP size/digest independently matched; retained copy matches; complete file inventory verified twice |
| Verified workflow publication request | PASS: successful scheduled run explicitly bound artifact `12590914632` to source `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`; deployment action reported success |
| Verified currently active served payload | UNKNOWN / NOT TESTED: no live-site retrieval; available evidence does not identify today's served bytes independently |

Source: [run 40175066908](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40175066908), [job 121113848149](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40175066908/job/121113848149), [artifact 12590914632](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40175066908/artifacts/12590914632), [workflow at exact source](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/.github/workflows/static.yml).

| UTC 25 October 2026 | Observed job-log evidence |
| --- | --- |
| 08:02:30 | Scheduled run started on main `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` |
| 08:02:47.5069481 | Generated 9 authoritative public product pages |
| 08:02:48.4736343 | Generated 1 effective public News article |
| 08:02:49.3878949 | Validated and generated 31 published CMS articles |
| 08:02:49.6738029 | Stamped 269 static files for the exact source commit |
| 08:02:50 | Upload action tarred `./dist`; its log lists 538 paths; every one of the 423 archived file paths is present in that listing |
| 08:02:51.7082207 | Uploaded ZIP digest equals `d358efe91b5db0b0845505afd91a3eaa079c4bc0aeaa9a331fe5916d4266e349` |
| 08:02:52.1321272 | Final upload: github-pages, 20,301,705 bytes, ID 12590914632 |
| 08:02:52.5984721 | Pages request includes artifact ID 12590914632 and `pages_build_version` equal to the source commit |
| 08:02:53.3108413 | Deployment creation reported; log-reported ID is the source commit string |
| 08:03:17.1233900 | Deployment action: reported success |
| 08:03:17.5149453 | Environment URL evaluated to the configured custom-domain root; not fetched by ANCHOR |

All generation, verification/stamping, upload and deployment job steps have success conclusions. The run predates this mission; ANCHOR did not start, retry or modify it. The current workflow still has main-push, manual and daily `0 3 * * *` UTC triggers and an unconditional CMS-generation step. Its obsolete fifteen-minute comment remains an inherited documentation inconsistency. No schedule or permission was changed.

A read-only deployment-collection request was rejected by the GitHub interface as an unsupported endpoint. Therefore no independent deployment-object ID, environment-protection state, active custom-domain association or current served-byte association is claimed. The logged deployment ID must not be confused with the run ID or artifact ID. No browser/site/backend fallback was attempted.

The source `dist` tree has 416 files. The artifact has 146 byte-identical source files, 269 changed source-path files, eight build-added files and one removed source path (`products/sbe-600/index.html`). Added files are six product image PNGs, the generated CDE-715P-600 page and the effective News article. This demonstrates why a source ZIP alone is not the generated publication baseline; it does not authorize restoring removed product records.

The successful historical generation is evidence of that build's success, not provider quota recovery, current catalogue health, schema compatibility, current stock accuracy or permission acceptance. DAWNBREAKER remains HOLD and public catalogue status remains UNTESTED BY ASSISTANT.
