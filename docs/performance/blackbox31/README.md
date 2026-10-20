# BLACKBOX 31 — inactive static-image release candidate

Authorisation 31, 20 October 2026. Base: `2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f`, tree `eb2c9f1824602d19ed27f010cf080190a06c713e`. Engineering branch: `engineering/blackbox31-static-image-rc`. No main merge, deployment, workflow dispatch or production service access.

## Result
A complete isolated path is implemented: synthetic image capture → exact content-addressed assets and manifest → durable local Git archive → verified ordinary/rollback assembly → lightweight public metadata → strict browser resolver → actual repository/card/detail/basket consumers and product generator. Public source metadata, pricing, stock, kit fields and specifications remain intact. Missing/stale/corrupt images yield the existing placeholder, never an unreviewed photograph or automatic embedded-image download.

The production configuration `dist/backend/image-delivery-config.mjs` is byte-for-byte unchanged with `enabled:false`. The generator's no-argument path remains legacy. No live publishing workflow was installed. This candidate is not production acceptance or authority to deploy.

## Evidence
25 focused synthetic scenarios, six existing regression suites and six inherited process-network-denial probes pass under Node 24.19.0. Existing dependencies were reused without installation. Node 22 and real-browser/CDN cache acceptance remain unverified. DOM checks are fixture acceptance, not visual or mobile-browser certification.

- [Integration contract](INTEGRATION.md)
- [Recovered component reconciliation](RECONCILIATION.md)
- [Risks and production gates](RISKS_AND_RELEASE_GATES.md)
- [Deployment prerequisites and rollback](DEPLOYMENT_AND_ROLLBACK.md)
- [Synthetic measurements](MEASUREMENTS.md)
- [Executed test evidence](TEST_RESULTS.json)
- [Original frozen source fingerprints](REUSE_PROVENANCE.json)
- [Scope/preservation evidence](PRESERVATION.json)

For a cloud runner with existing dependencies and Node, the isolated command is `python3 tests/run-blackbox31.py /absolute/path/to/node`. It compiles the reviewed seccomp launcher using existing cc, sanitises the environment and blocks sockets/children before tests. No owner installation is required. No package install, backend access or deployment follows from that command.

## Next approval
Approve a separate non-deploying Node 22/cloud-browser acceptance pass for this exact candidate. Browser process isolation must be demonstrated before fixture loading. Keep production access, SQL, real image capture, archive writes, Pages publication and adapter activation excluded. Separately approve a tightly bounded post-reset backend-view verification before considering production prerequisites satisfied.

