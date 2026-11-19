# CLOUD ANCHOR 74R: recovery acceptance and release handover

19 November 2026 · **Accept the retained V2 recovery point for its established PostgreSQL scope.** This closes the offline recovery verification gate. It is not a production rollback instruction or proof of application-level recovery. Release A is next, subject to its existing execution-time checks. No production operation was performed by 74R.

## Independently retrieved receipt

[GitHub-rendered restore summary](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44524518530#summary-135561448166); [restore job](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/44524518530/job/135561448166).

```json
{
  "status": "passed",
  "capture_run": "44349292200",
  "restore_run": "44524518530",
  "proof_version": 2,
  "restore_profile": "v2-constraint-native-2",
  "checks": [
    "admin_acl", "columns", "constraints", "core_extensions", "counts",
    "functions", "indexes", "joins", "policies", "relations",
    "role_memberships", "schemas", "sequences", "triggers"
  ],
  "equivalent_relation_default_acls": "4",
  "equivalent_native_check_rules": "3",
  "restored_utc": "2026-11-19T12:31:02+00:00"
}
```

This is the complete rendered receipt. The runner's fuller intermediate JSON was cleaned up as designed and was not published as an artifact. Independently matched the exact 14-group list to the source, read job/approval metadata and logs, and checked vault metadata. The manual first attempt ran at approved SHA `4b7441484feb5d2f4ae290e74ceff7ba14038bd6` via protected tag `cloud-anchor74p-evidence-approved` (active ruleset 27638279 with creation, update, deletion and non-fast-forward rules and no bypass actors). GitHub recorded owner approval for `cloud-anchor74-restore`. Source check, independent retrieval, offline restore, receipt validation and cleanup steps all succeeded.

V2 capture 44349292200 · release 450267164 · asset 764153555 · `backup.age` · 10,888,074 bytes · SHA-256 `60301a77c0cec89f000b7f605a065006b40139c5aabe35ce7d386aa6f59ba4cd`. The approved workflow binds capture and archive metadata to an exact commitment. Its successful job independently retrieved ciphertext, verified length and digest, decrypted and checked sealed members, restored offline, and checked the receipt against archive, capture, run and proof profile before publishing the summary. 74R verified those controls and retained metadata; no new download or decryption was performed.

## Why recovery passed

The 74M production receipt attempt had four proven ACL equivalences, two proven CHECK equivalences and a third unresolved CHECK. This execution proves four default ACL equivalences and all three native CHECK equivalences. Default ACLs are resolved by PostgreSQL and compared with grantor/grantee, privileges and grant options intact. The classified native engine introduced in 74O and exercised by 74P uses a fenced single statement via the extended protocol, supports more literal/quote forms and compares bound expression trees, dependency identities, column bindings, inheritance and independently checked validation without validating table rows. No residual witness was required. The successful receipt does not identify the old failure path. Broader lexical support is a plausible explanation; there is no evidence to identify a specific quote, escape or CHECK expression. No proof group was waived.

## Suitability, freshness and continuity

The capture run began at 16:37:05 GMT on 18 November; its capture job logged the seal at 16:38:46 GMT. The recovery point was therefore about 20 hours old at verification. That is a historical point-in-time backup; its age at cutover will be greater. Available workflow/release evidence is not a transaction journal and does not establish the count or value of orders, payments, refunds, stock movements, ledger entries or fulfilment changes since capture. Do not infer zero intervening changes. No new provider/account transaction call, production DB query or mutation was performed for this assessment.

Owner commercial position under 74R: limited loss of recent stock and order records at current scale is tolerable, subject to appropriate reconciliation. This applies to the business risk of reconstructing records, not permission to lose, charge, refund or fulfil orders twice. Before the release, record the capture cut-off and use already available Admin/provider evidence to note intervening paid orders, payments/refunds, dispatches and stock/ledger adjustments; carry unresolved items forward for owner review. Prefer application/Edge rollback or forward correction for an additive release. If actual recovery is ever needed, pause affected writes under separate authority, reconcile Stripe and eBay references against order/payment state, reconcile stock with receipts and physical counts, and confirm fulfilment and ledger entries before reopening. Keep sensitive records private and preserve audit history.

Proportionate planning targets: daily encrypted copies when the backup cadence is implemented (nominal 24-hour recovery-point target; separately reconcile paid activity), and same-business-day recovery for core ordering/Admin as an initial target to time in rehearsal. Capture before material risky changes where already appropriate. These are planning targets, not measured guarantees, new release gates, or requirements for paid infrastructure.

Covered PostgreSQL scopes: public, forge_private, auth, storage metadata and supabase_migrations, plus password-free role metadata and reviewed extension handling. V2 does not independently seal the original partition/inheritance graph. Storage bytes, excluded vector/foreign data, provider settings, secrets, auth signing/configuration, Edge runtime, Cloudflare/frontend, and Stripe/eBay/email continuity are not proved. Counts and joins are not exact equality of all business values. Offline success does not certify a live Supabase cutover or application availability.

## Release readiness

| Release | Decision and existing remaining checks |
| --- | --- |
| A: OVERSEER and ECLIPSE | **Next.** Reuse [69B rehearsal/runbook](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/43a7c0ab2a1546b2cb7fffadc82613a02a109c7d/docs/operations/release69b/README.md) and its [manifest](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/43a7c0ab2a1546b2cb7fffadc82613a02a109c7d/tests/release69b/manifest.json). The four 68C fingerprints match the held source: Delivery 20261117092035, Aftercare 20261117092047, Order Date 20261117095412 and ECLIPSE 20261117102331. Execution-time checks remain: canonical live app and Edge, deployed migration state, checkout/inventory/finance contracts, actual tariff, immediate app/compatible Edge rollback and the intervening activity note. Keep live Aftercare and new rates inactive and preserve existing transactional mail/webhooks. Then execute the already approved exact sequence with targeted acceptance. |
| B: Full IRONCLAD | Exact atomic package verified at SHA-256 `04ec507549545b31946aaef827e54201a8fec15c806f10f0fd217ea22fe49c90`. Before execution, verify the actual post-A or separately approved independent baseline, expected Commerce/IRONCLAD schema state and four legacy function fingerprints, appropriate static variant, fresh intervening activity review and new immediate application rollback. Apply as one transaction. Confirm no physical stock movement, history or permission regression. |
| C: OMNISCIENCE | Exact migration 20261117162718_omniscience74_v1.sql at source a1d9e41fd4443f92f050c013c7bb1b70fa67568c independently hashed to `f73d9b68df1eb8bd4a251d29ec58df1941132a4549d80c79e1790260fd9ea6be`. Existing [release checkpoint](https://github.com/lukewilliamsat-glitch/apparition-instruments/blob/a1d9e41fd4443f92f050c013c7bb1b70fa67568c/docs/operations/leviathan74/README.md) requires live BLACK LEDGER and finance function compatibility, index lock assessment against current order volume, exact canonical composition and independent Cloudflare rollback. No new business feature or provider integration is needed to clear these gates. |

The shortest route to A is one release-specific preflight and an immediate rollback capture/read-back, then the previously approved unchanged four migrations, compatible Edge and guarded static publication in order. Keep existing tariff and Aftercare controls. 74R grants no execution. Stop if preflight differs materially or rollback cannot be verified. Do not stop for architectural redesign or a repeat recovery rehearsal.

## Deferred roadmap, not release blockers

1. **Next recovery engineering:** daily independently held encrypted logical exports, custody verification and a compact inventory of provider configuration and external services.
2. **Next rehearsal:** add private critical-value checks and role/access smoke tests to native transactional restore, then a provider-compatible application drill with outbound sinks and measured recovery/reconciliation time. Preserve 74P prototype and audit at `4b7441484feb5d2f4ae290e74ceff7ba14038bd6`; any contract change needs independent review and owner acceptance.
3. **Later, if justified:** streamline protected execution using a proven live reviewer rehearsal; retain current controls, review runner dependencies and the checkout Node runtime warning. Decide on managed recovery only if measured needs or order volume call for it. No controller activation or infrastructure change under 74R.
