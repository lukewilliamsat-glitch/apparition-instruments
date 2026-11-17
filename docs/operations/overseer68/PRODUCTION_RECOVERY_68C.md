# ANCHOR production recovery gate

**68C: not passed.** Production Supabase project `acdxpxvksvdwfajntzfx` is healthy in `eu-west-1`, on the Free plan, PostgreSQL 17.6. The connected project tools do not expose backup listing, a native database session, or secure backup storage. No provider restore point or logical archive has been verified. Cloudflare's current application rollback is verified as `2433ee1f-5623-4c3c-8327-a90a968c545c` at `f277e1ec0f5ab4fb8630ad48ebf1efa81a7d8877`; it is not a database backup.

## Capture and verify a restore point

1. First check production **Database → Backups**. If a managed restore point is actually available, record the project ref, backup ID or provider recovery timestamp, UTC time, completed status, the verified restore window, retention and recovery access. Prefer an isolated provider restore where available and authorised. A listed backup is not a completed recovery rehearsal. Do not start an in-place production restore. Supabase does not provide automatic daily backups on Free.
2. Otherwise use the supported [Supabase CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) workflow. Use an owner-controlled single-user workstation, a private encrypted working volume outside any repository or sync folder, a current Supabase CLI v3 with certificate forwarding for remote dumps, and Docker, and a current PostgreSQL 17 client. Get the verified production connection settings and CA from Supabase. Use the direct endpoint where reachable or the **session** pooler on port 5432, with [certificate and hostname validation](https://supabase.com/docs/guides/database/psql). Keep credentials in the owner's local secure input path, without shell history, transcripts, debug logging or shared terminal recordings. Do not reset production credentials for the release.
3. Run the following from a new private encrypted folder, with `$ProdDb` set privately on that workstation to the dashboard URI, including `sslmode=verify-full` and the CA path. The PowerShell wrapper stops on the first failure. Pause schema/role and provider configuration changes across the capture. The data export has its own consistent PostgreSQL snapshot; the separate schema, role and migration-history exports are not a joint atomic snapshot. Record start and completion UTC and exclude stale artifacts.

   ```powershell
   $DbTarget = $null
   if (-not [uri]::TryCreate($ProdDb, [UriKind]::Absolute, [ref]$DbTarget)) {
     throw 'Load the production database URI privately first.'
   }
   $DbUser = $DbTarget.UserInfo.Split(':')[0]
   $Direct = $DbTarget.Host -eq 'db.acdxpxvksvdwfajntzfx.supabase.co' -and $DbUser -eq 'postgres'
   $Session = $DbTarget.Host.EndsWith('.pooler.supabase.com') -and $DbUser -eq 'postgres.acdxpxvksvdwfajntzfx'
   if ($DbTarget.Scheme -notin @('postgresql','postgres') -or $DbTarget.Port -ne 5432 -or
       $DbTarget.AbsolutePath -ne '/postgres' -or -not ($Direct -or $Session) -or
       $DbTarget.Query -notmatch '[?&]sslmode=verify-full(&|$)' -or
       $DbTarget.Query -notmatch '[?&]sslrootcert=[^&]+') {
     throw 'Expected production direct/session PostgreSQL on 5432 with full certificate verification.'
   }
   function Save-AnchorDump([string]$Name, [string[]]$Options = @()) {
     if (Test-Path -LiteralPath $Name) { throw "Use an empty capture folder: $Name" }
     & supabase db dump "--remote=$ProdDb" --file $Name @Options
     if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $Name) -or (Get-Item -LiteralPath $Name).Length -eq 0) {
       throw "Capture failed: $Name. Keep all output private."
     }
   }
   try {
     Save-AnchorDump 'roles.sql' @('--role-only')
     Save-AnchorDump 'schema.sql'
     Save-AnchorDump 'data.sql' @('--data-only','--use-copy','--exclude','storage.buckets_vectors','--exclude','storage.vector_indexes')
     Save-AnchorDump 'history_schema.sql' @('--schema','supabase_migrations')
     Save-AnchorDump 'history_data.sql' @('--schema','supabase_migrations','--data-only','--use-copy')
     Get-FileHash -Algorithm SHA256 roles.sql,schema.sql,data.sql,history_schema.sql,history_data.sql
   } finally {
     Remove-Variable ProdDb,DbTarget -ErrorAction SilentlyContinue
   }
   ```

   The vector Storage exclusions are from the provider's migration guide. Confirm they contain no needed data before accepting the export. Keep a private member digest manifest with the capture. Encrypt the sealed archive to a verified owner recovery key before copying it off the encrypted working volume. Keep the recovery key separately, test decryptability and hash verification from the retained copy, and use access limited to recovery operators. Suggested retention: 30 days for pre-release copies and at least two verified generations, subject to the company's retention policy. Never send the dump, credentials, customer rows or decrypted logs to chat, CI, static hosting, or ordinary shared storage.
4. Compare catalogues using [RECOVERY_SCOPE_68C.sql](./RECOVERY_SCOPE_68C.sql) and review the dump privately. Confirm both application schemas (`public` and `forge_private`), catalogue, stock, Orders and fulfilment, BLACK LEDGER and financial revisions, Site Operations, existing Aftercare history, Admin membership, `auth` dependencies, grants/RLS/triggers/constraints/functions, sequences, and migration history. Confirm all custom Auth and Storage policies are captured separately if filtered by the CLI. In the current read-only source inventory, Storage has a bucket but no rows in `storage.objects`; repeat the check at capture time. Bucket metadata is distinct from object bytes. Review Cron, pg_net, Realtime, and Vault separately; preserve job and publication definitions and secret references in owner-controlled configuration records. Vault entries may depend on provider key material and must not be assumed usable after restore.
5. Rehearse on a disposable, isolated Supabase/PostgreSQL 17 recovery stack with compatible Auth, Storage and extensions. Disable network egress from the recovery instance; do not enable Cron, webhooks, SMTP, Stripe, scheduled jobs or public access. Do not use the existing synthetic staging project. Use the provider's role/schema/data restore procedure, suppressing application triggers for data import only inside the isolated restore transaction, with clean-state and error-stop assertions. Restore migration history and managed-schema customisations in the documented order. Compare baseline and restored counts, required object identities, Admin-only access, foreign keys and sequence positions. Check representative joins for an order, inventory, a financial record and its revisions without printing row contents. Repeat from sealed bytes and record success, exceptions, recovery time and the exact target/tool versions. A hash or SQL header alone is not restoration evidence.
6. Record a **metadata-only** receipt: production project ref; capture ID and UTC window; archive SHA-256; coverage and explicit gaps; encryption/access/retention confirmation; isolated restore result, timestamp and verified checks. Keep archive paths, logs, and legitimate data private. If a required restore check remains unproven, keep the migration gate closed.

The database archive does not back up Storage object bytes, deployed Edge Function code or secrets, Auth/JWT/provider configuration, SMTP and eBay relay settings, Stripe endpoints, DNS, or Cloudflare configuration. Record the deployed source versions and required configuration identities separately. An isolated recovery must use fresh non-production secrets, never live provider endpoints. Validate Auth and revoke or rotate sessions and credentials as appropriate for the controlled recovery, not as part of routine backup.

## Release and recovery

After the receipt passes, capture the current canonical app and deployed checkout/Aftercare backend identities before any change. Check live schema markers, migration history and grants. Verify the four authorised hashes and apply only their exact bytes, recording each result. Delivery and Aftercare have independent order-table dependencies; apply Order Date Correction before ECLIPSE to ship and verify their accepted combined reporting path. Deploy compatible legacy checkout only after the Delivery SQL verifies with no active rates. Keep the Aftercare DB mode `off` and SMTP feature flag disabled. With those settings, the accepted direct transport returns an unavailable response before rendering or sending; preserve only the clearly disabled surface and manual fallback. Do not enable a flag just to check production. Preserve the live Operations overlay. Build production only from the current complete application package and accepted source delta; exclude fixture files.

For ordinary frontend defects, use the immediate verified Cloudflare rollback first. For Delivery, restore legacy calculation for new orders and retain persisted amounts/configuration history. For Aftercare, leave both send gates off and preserve history. Roll back Order Date Correction and ECLIPSE UI independently while retaining schema, genuine corrections, financial revisions and applied cost snapshots. Prefer a reviewed forward correction when schema or data requires repair.

Never overwrite the production database as a routine rollback. If restore is necessary, restore separately, establish the post-backup transaction delta, and reconcile newer orders, payments/refunds, dispatch and stock movements, messages and financial revisions before any cutover. Preserve unique provider IDs and idempotency, and check balances, webhook reconciliation, checkout defaults, site state and admin access before opening traffic. Retain the old database/deployment until recovery is validated.

## Deferred Aftercare checks

Under a subsequent focused approval, verify in the provider's signed-in configuration that the authenticated SMTP account is permitted to send as `luke@apparitioninstruments.co.uk`; do not disclose credentials. First send one internal message to a verified owner-controlled inbox and check the exact sender and receipt. Then run one permitted eBay relay test against an eligible saved order and consenting recipient. Separate SMTP acceptance from confirmed relay delivery. Stop on a failure or uncertain outcome; do not retry blindly. Keep manual copy and the eBay order conversation available.
