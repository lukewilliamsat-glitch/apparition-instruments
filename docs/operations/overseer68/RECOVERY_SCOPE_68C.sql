-- Read only. Run on the source and the isolated restore. Do not share raw backup data.
WITH relations AS (
  SELECT n.nspname AS schema_name,
    count(*) FILTER (WHERE c.relkind IN ('r','p')) AS tables,
    count(*) FILTER (WHERE c.relkind = 'S') AS sequences,
    count(*) FILTER (WHERE c.relrowsecurity) AS rls_tables
  FROM pg_namespace n LEFT JOIN pg_class c ON c.relnamespace = n.oid
  WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
  GROUP BY n.nspname
)
SELECT jsonb_build_object(
  'database', current_database(),
  'version', current_setting('server_version'),
  'scopes', (SELECT jsonb_agg(to_jsonb(r) ORDER BY schema_name) FROM relations r WHERE tables > 0 OR sequences > 0),
  'extensions', (SELECT jsonb_agg(jsonb_build_object('name', extname, 'version', extversion) ORDER BY extname) FROM pg_extension),
  'storageBucketsPresent', EXISTS (SELECT 1 FROM storage.buckets),
  'storageObjectsPresent', EXISTS (SELECT 1 FROM storage.objects),
  'managedAuthStoragePolicyCount', (SELECT count(*) FROM pg_policies WHERE schemaname IN ('auth','storage')),
  'customManagedTriggerCount', (
    SELECT count(*) FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace target ON target.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace source ON source.oid = p.pronamespace
    WHERE NOT t.tgisinternal AND target.nspname IN ('auth','storage')
      AND source.nspname NOT IN ('auth','storage','pg_catalog')
  )
) AS recovery_scope;
