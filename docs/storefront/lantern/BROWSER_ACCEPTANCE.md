# Genuine browser acceptance — BLOCKED

No Chrome run or screenshot was captured for LANTERN. Browser version, screenshot dimensions/hashes, CI run, artifact ID and expiry are **not applicable / null**, not pending invented evidence. Text execution evidence is retained in Git at [TEST_RESULTS.json](TEST_RESULTS.json).

Fresh environment checks found no google-chrome, google-chrome-stable, chromium or chromium-browser executable, nor the checked standard Chrome/Playwright browser paths. `unshare -n -- true` exits 1: `unshare: unshare failed: Operation not permitted`. No browser download, connected privileged browser session or relaxed isolation was used.

## Existing CI assessment

The established harness workflows were inspected read-only:

| Workflow / pinned source | Relevant constraints |
| --- | --- |
| `command04-acceptance.yml` / `20002c45933a7f24b08f6d5f0199a7fc8fa1a282` | Push and job restricted to frozen COMMAND04; hosted Chrome, Node 22.20.0 and sudo network/mount/PID namespace harness |
| `command04a-nocturne.yml` / `993108aa7d65ac204ef54a7018a85f5c783813fd` | Push/path/job restricted to frozen NOCTURNE; same isolation pattern; original PNG artifact retention |
| `spectre35-hero.yml` / `4f09bd5b4d5109df6028a8dc0d00468512d9af1c` | Push/path/job restricted to frozen SPECTRE; hosted Chrome and network namespace harness |
| `static.yml` / production base | Production Pages deployment, scheduled backend generation, pages/id-token write permissions; unsuitable and not invoked |

The safe harnesses have no manual dispatch and do not admit `engineering/raven-lantern`. LANTERN inherits only the production workflow. Running those established harnesses would require altering workflow configuration or moving frozen branches; Authorisation 45's final authority prohibits workflow changes. No workflow was added, edited, repurposed, dispatched or triggered. There is no eligible existing CI route within this authority.

The production workflow's unchanged daily `0 3 * * *` schedule can independently invoke backend product/Operations generation. That pre-existing background exposure was not disabled or tested; LANTERN makes no claim that provider usage is zero outside this mission. Its comment mentions 15 minutes but the actual cron is daily at 03:00 UTC. DAWNBREAKER recovery gates and remaining egress uncertainty persist.

## Required acceptance still open

| Viewport | Native route journeys | Keyboard/focus | Enlarged text/reachability | Status announcements |
| --- | --- | --- | --- | --- |
| 390px | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| 768px | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| 1024px | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| 1440px | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| 1920px | NOT RUN | NOT RUN | NOT RUN | NOT RUN |

Next authorised verification should use a branch-only isolated Chrome runner, prove negative controls before fixture startup, execute all four complete routes against fictional responses and retain/read back genuine evidence. It must also test late initialisation, the independent Operations handoff, empty rendering and successful original flows. Historical screenshots are not substitutes. No comprehensive accessibility certification is claimed.
