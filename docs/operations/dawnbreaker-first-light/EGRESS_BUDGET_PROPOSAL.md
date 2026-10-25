# Proposed egress safety policy — NOT APPROVED FOR SPENDING

**Planning only. Current discretionary live-test authority: zero requests / zero bytes.** The historic Free-plan 5 GB allowance is a reference, not a fresh verified balance. All numeric recommendations below require explicit owner approval, current provider evidence and a separately approved exact operation/transport. If provider units differ, recompute before approval.

| Proposed control | Conservative candidate |
| --- | --- |
| Allowance arithmetic convention | 5,000,000,000 bytes (decimal 5 GB) for policy illustration only; provider unit/accounting definition remains unverified |
| Minimum protected reserve | 4,500,000,000 bytes, 90% of illustrative allowance, protected from discretionary experiments; no guarantee this covers a full cycle of normal traffic |
| Cycle discretionary investigation maximum | 5,000,000 bytes (0.1%); remaining 495,000,000 bytes are uncertainty headroom, not permission for extra experiments |
| Individual public preflight response | Historical immutable acceptance cap 65,536 application-body bytes; not a hard wire/billing cap |
| One complete public preflight experiment | At most three sequential GETs; 131,072 accepted body bytes aggregate; no retries, redirects, pagination, assets or probe requests |
| Planning contingency ledger debit | Reserve 1,000,000 bytes against discretionary budget before one attempt; retain until reliable accounting reconciles it. This is a risk allowance, not a proved maximum transferable/billable amount |
| Further attempts | None automatically. No repeated experiment merely because the illustrative cycle budget remains |
| Freshness proposal | Owner observation within 60 minutes; meter as-of time and maximum known lag also within 60 minutes. Unknown/longer lag freezes discretionary execution pending a new bounded risk decision |

The current remaining allowance must be explicitly reported, usable under cleared enforcement, and exceed the protected reserve plus all pending experiments and agreed background-traffic allowance. If normal visitors/scheduled generation plausibly consume the remaining margin before reliable metering, stop discretionary work. Ordinary traffic has priority; the reserve does not restrict or certify the storefront itself.

## Five different byte quantities

1. **Provider-billed egress:** provider-defined category, encoding, project/organisation attribution, allowance and lag; only fresh provider evidence can substantiate it.
2. **Network transfer:** encoded response body plus transport effects/overshoot; headers/TLS/proxies and cancellation affect what is sent/received.
3. **Application JSON:** decoded/accepted bytes measured by the reader; caps reject content but cannot reverse bytes already transferred.
4. **GitHub artifact storage:** archive retention/download in GitHub infrastructure, not Supabase catalogue bandwidth.
5. **Third-party CDN/static-host bytes:** separate provider/service accounting; moving image delivery does not prove identical saved Supabase charges.

Do not add/subtract these as if equivalent. `Accept-Encoding: identity` is a request, not proof until the response is checked. Compression, streamed/buffered data, abort behaviour and non-200 bodies require the exact reviewed transport. A strict total billed-byte guarantee is not available from the historical logical acceptance caps; if that guarantee is required, execution is BLOCKED until a separately reviewed mechanism/contract exists.

## Execution gates, logging and stop policy

Before any later experiment: fresh Phase A evidence, explicit numeric budget decision, exact immutable plan/hash or new approved successor, transport/version/timeout/cancellation evidence, background-exposure decision and operation-specific consent. No credentials in chat/Git/command arguments; no privileged session reuse.

Log only approval reference, plan/transport identity, UTC start/end, attempts/status, declared encoding/content length, observed accepted/encoded counts where measurable, row counts, cancellation/validation outcomes and uncertainty. Do not retain keys, raw successful/rejected records, member data, images, headers containing secrets or private storage details. A failed response or timeout still consumes the reserved ledger debit; it never authorises a retry.

Stop immediately on HTTP/type/encoding/size/row/identity/consistency/deadline failure, quota warning/restriction, unknown lag, uncertain cancellation, unexpected background build, reserve breach, evidence mismatch or sensitive output. Cancel remaining requests; assess offline. If metering lags, keep the pessimistic pending debit and assume unaccounted background usage. No additional attempt until reporting has advanced beyond the prior experiment and the agreed lag window, and owner review accepts residual attribution uncertainty. An immediate zero meter delta is not zero cost.

Unknown current allowance/remaining, unknown reporting freshness and undecided schedule exposure currently block all live spending. Temporarily pause experiments rather than provider services; schedule suspension requires separate authority. This policy does not approve real schema inspection, application builds, image capture, health polling or deployment.

Basis: historical runbook and source exposure described in EGRESS_EXPOSURE.md and WORKFLOW_EXPOSURE.md. The immutable future preflight remains a separate approval; no numeric proposal silently amends it.
