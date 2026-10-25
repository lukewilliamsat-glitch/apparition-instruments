# Exact artifact identity — Gate A

Fresh GitHub metadata was checked before the sole retrieval. All owner-specified identity fields matched; no alternate artifact was searched for or substituted.

| Field | Expected and observed |
| --- | --- |
| Repository / repository ID | `lukewilliamsat-glitch/apparition-instruments` / `1383011149` |
| Run / attempt / event | `40175066908` / `1` / `schedule` |
| Run result | completed / success |
| Workflow | `.github/workflows/static.yml`, run number 340 |
| Artifact ID / name | `12590914632` / `github-pages` |
| ZIP size | 20,301,705 bytes |
| Digest | `sha256:d358efe91b5db0b0845505afd91a3eaa079c4bc0aeaa9a331fe5916d4266e349` |
| Artifact creation / update | 2026-10-25T08:02:51Z |
| Original artifact expiry | 2026-10-26T08:02:50Z |
| Expired flag at inspection | false |
| Source branch / commit | `main` / `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f` |
| Source tree | `eb2c9f1824602d19ed27f010cf080190a06c713e` |

Sources: [run](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40175066908), [artifact](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/40175066908/artifacts/12590914632), [exact source workflow](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f/.github/workflows/static.yml). Metadata corroborates identity; independent byte verification is in [INTEGRITY_VERIFICATION.md](INTEGRITY_VERIFICATION.md).

The bounded operation was one invocation of the exact artifact download, followed by one streaming materialization of its delivered file reference. Neither stage was retried. There was no second GitHub artifact retrieval. A 22 MiB acceptance limit (23,068,672 bytes), 64 KiB chunks, a 45-second socket timeout and a 60-second delivery bound were configured; the observed ZIP was below the limit. The delivery reference was temporary and was not treated as retention. No signed URL is published.
