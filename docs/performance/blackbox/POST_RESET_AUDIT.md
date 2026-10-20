# BLACKBOX — post-reset measurement protocol

Authorisation 29A · 20 October 2026 · documentation-only research.

Derived from the preserved [original assessment](BLACKBOX_GITHUB_ASSESSMENT_2026-10-20.md) and [unchanged research evidence](RESEARCH_EVIDENCE.json). Findings distinguish VERIFIED source, SYNTHETIC tests, HISTORICAL measurements, DERIVED models and UNKNOWN production usage. No new production measurements or test reruns were performed for publication.

## 6. Narrow post-reset measurement plan — approval required
Do not execute merely because 24 October arrives. Obtain explicit authorisation for this bounded read-only exercise.

1. Review existing service-level usage exports for the billing period and daily 27 September–2 October window. Request counts, bytes, decimal/binary units, cached/uncached categories and retention gaps must be recorded separately. Do not download customer rows, request bodies or secrets. Dashboard/log access is outside this mission.
2. At the then-current main, review source and allowlist at most three public GETs with no automatic retry, no redirect following and no generator execution:
   - Filtered catalogue metadata using the exact generator projection **minus image**, with limit=20.
   - catalogue_delivery_v2 selecting id,image_identity only, matching generator filters, with limit=20. Run once: its digest expression hashes stored image values and may be computationally expensive despite the small response.
   - catalogue_options with the generator's explicit fields and limit=100.
3. Hard budget: no more than three application HTTP requests total, at most 32 KiB decoded per response / 96 KiB aggregate, at most 64 KiB aggregate encoded body, 15-second timeout each, no retries. Stop on 402/401/403, schema mismatch, redirect, cap breach or unexpected row-limit saturation. Count encoded and decoded streams separately; do not call auto-decompressed length “wire bytes.” Header-declared length alone is not proof.
4. Never select image, select=*, customer/order fields or privileged resources. Use only the existing intended public key. Do not invoke email or checkout, authenticate, browse the site, dispatch Actions or activate adapters.
5. Compare row IDs and supported identity formats with preserved inventory, and record any drift without rewriting data. Schema and payload success are not permission/RLS certification.
6. Correlate existing anonymised endpoint/status/client-class counts with the new small measurements. Hash any actor identifiers with a private rotating salt; omit IPs, emails, tokens and payloads from public research evidence. Do not equate a GitHub run with a successful full response.
7. If compressed legacy bytes are still required, request a separate one-response image-bearing measurement approval with its own explicit multi-megabyte budget. It is deliberately excluded here.
8. Only after attribution, approve one small implementation milestone. No automatic Gate B, SQL, image extraction, workflow edit, deployment or restart of Atlas follows from measurement approval.

Pass: three or fewer allowlisted requests within budgets, valid image-free schemas, no forbidden endpoint, a documented service/log coverage gap statement and a revised ranking. Fail: stop, preserve diagnostics and ask for the specific additional authority required.

## Authorisation 29A clarification
This protocol remains unexecuted and unauthorised. Publishing its description is not approval to run it. Do not auto-run on 24 October. A separate explicit BLACKBOX 30 approval should specify any usage-dashboard or anonymised log-summary access alongside the three application requests; exclude customer payloads and credentials from public evidence.

