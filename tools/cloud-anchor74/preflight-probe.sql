-- Use psql with the production session-pooler endpoint, port 5432,
-- sslmode=verify-full and the workflow's trusted Supabase CA.
-- This does not export a snapshot or read business records.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT jsonb_build_object(
  'readOnly',current_setting('transaction_read_only'),
  'ssl',(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),
  'objects',(SELECT count(*) FROM storage.objects),
  'vectorBuckets',(SELECT count(*) FROM storage.buckets_vectors),
  'vectorIndexes',(SELECT count(*) FROM storage.vector_indexes),
  'externalTables',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind='f' AND n.nspname IN ('public','forge_private','auth','storage','supabase_migrations')));
ROLLBACK;
