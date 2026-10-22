-- DISPOSABLE OFFLINE FIXTURE ONLY. NOT A PRODUCTION MIGRATION.
-- Creates only a fresh isolated namespace/roles in an empty throwaway cluster.
\set ON_ERROR_STOP on
CREATE ROLE ic_owner NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE ic_alice NOLOGIN;
CREATE ROLE ic_bob NOLOGIN;
CREATE ROLE ic_reader NOLOGIN;
CREATE ROLE ic_stranger NOLOGIN;
CREATE ROLE ic_anon NOLOGIN;
CREATE SCHEMA ironclad_fixture AUTHORIZATION ic_owner;
REVOKE ALL ON SCHEMA ironclad_fixture FROM PUBLIC;
SET ROLE ic_owner;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE ironclad_fixture.principals (
 role_name name PRIMARY KEY, subject text UNIQUE NOT NULL,
 enabled boolean NOT NULL DEFAULT true, expires_at timestamptz NOT NULL,
 can_read boolean NOT NULL, can_write boolean NOT NULL,
 inventory_write boolean NOT NULL DEFAULT false, cost_write boolean NOT NULL DEFAULT false
);
CREATE TABLE ironclad_fixture.products (
 id text PRIMARY KEY CHECK(id ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$'),
 body jsonb NOT NULL CHECK(jsonb_typeof(body)='object'),
 revision integer NOT NULL CHECK(revision BETWEEN 1 AND 2147483646),
 source_image text NOT NULL
);
CREATE UNIQUE INDEX products_sku_unique ON ironclad_fixture.products(lower(body->>'sku'));
CREATE TABLE ironclad_fixture.inventory (
 component_id text PRIMARY KEY REFERENCES ironclad_fixture.products(id) ON DELETE RESTRICT,
 quantity bigint NOT NULL CHECK(quantity BETWEEN 0 AND 9007199254740991),
 stock_unit text NOT NULL CHECK(stock_unit IN ('item','m','g'))
);
CREATE TABLE ironclad_fixture.internal_cost (
 component_id text PRIMARY KEY REFERENCES ironclad_fixture.products(id) ON DELETE RESTRICT,
 unit_cost integer CHECK(unit_cost BETWEEN 0 AND 2147483647)
);
CREATE TABLE ironclad_fixture.operations (
 actor text NOT NULL, operation_id text NOT NULL,
 product_id text NOT NULL REFERENCES ironclad_fixture.products(id) ON DELETE RESTRICT,
 command jsonb NOT NULL, result jsonb NOT NULL,
 PRIMARY KEY(actor,operation_id)
);
CREATE TABLE ironclad_fixture.audit (
 actor text NOT NULL, operation_id text NOT NULL,
 product_id text NOT NULL REFERENCES ironclad_fixture.products(id) ON DELETE RESTRICT,
 before_state jsonb NOT NULL, after_state jsonb NOT NULL,
 before_cost integer, after_cost integer,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor,operation_id),
 FOREIGN KEY(actor,operation_id) REFERENCES ironclad_fixture.operations(actor,operation_id) DEFERRABLE INITIALLY DEFERRED
);
-- FORCE RLS plus a non-login owner: client roles have no table grants or policies.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['principals','products','inventory','internal_cost','operations','audit'] LOOP
  EXECUTE format('ALTER TABLE ironclad_fixture.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE ironclad_fixture.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY owner_only ON ironclad_fixture.%I TO ic_owner USING (true) WITH CHECK (true)',t);
 END LOOP;
END $$;
CREATE FUNCTION ironclad_fixture.reject_history_change() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 RAISE EXCEPTION '[IMMUTABLE] Receipt and audit history cannot be changed';
END $$;
CREATE TRIGGER immutable_operations BEFORE UPDATE OR DELETE ON ironclad_fixture.operations FOR EACH ROW EXECUTE FUNCTION ironclad_fixture.reject_history_change();
CREATE TRIGGER immutable_operations_truncate BEFORE TRUNCATE ON ironclad_fixture.operations FOR EACH STATEMENT EXECUTE FUNCTION ironclad_fixture.reject_history_change();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON ironclad_fixture.audit FOR EACH ROW EXECUTE FUNCTION ironclad_fixture.reject_history_change();
CREATE TRIGGER immutable_audit_truncate BEFORE TRUNCATE ON ironclad_fixture.audit FOR EACH STATEMENT EXECUTE FUNCTION ironclad_fixture.reject_history_change();
CREATE FUNCTION ironclad_fixture.record_for(p_id text) RETURNS jsonb
LANGUAGE sql SET search_path=pg_catalog AS $$
 SELECT p.body || jsonb_build_object('id',p.id,'revision','sim-'||p.revision,'stock',i.quantity,'stockUnit',i.stock_unit,'imageInfo',jsonb_build_object('kind','unloaded'))
 FROM ironclad_fixture.products p JOIN ironclad_fixture.inventory i ON i.component_id=p.id WHERE p.id=p_id;
$$;
CREATE FUNCTION ironclad_fixture.read_product(p_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb; BEGIN
 IF NOT EXISTS (SELECT 1 FROM ironclad_fixture.principals WHERE role_name=session_user AND enabled AND expires_at>clock_timestamp() AND can_read) THEN RAISE EXCEPTION '[PERMISSION] Product read denied'; END IF;
 SELECT ironclad_fixture.record_for(p_id) INTO result;
 IF result IS NULL THEN RAISE EXCEPTION '[MISSING] Product unavailable'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION ironclad_fixture.mutate(c jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE principal ironclad_fixture.principals; old ironclad_fixture.products; inv ironclad_fixture.inventory;
 prior ironclad_fixture.operations; k text; v jsonb; b jsonb; n numeric; new_stock bigint;
 op text; product_id text; expected integer; result jsonb; before_value jsonb; old_cost integer; new_cost integer;
BEGIN
 -- Authority is the authenticated DB login role, never an actor/capability in c or a caller GUC.
 SELECT * INTO principal FROM ironclad_fixture.principals WHERE role_name=session_user AND enabled AND expires_at>clock_timestamp() AND can_read AND can_write FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION '[PERMISSION] Product write denied'; END IF;
 IF c IS NULL OR jsonb_typeof(c)<>'object' OR octet_length(c::text)>12000 OR EXISTS(SELECT 1 FROM jsonb_object_keys(c) x WHERE x NOT IN ('protocol','operationId','id','expectedRevision','patch','inventory','internalCost')) THEN RAISE EXCEPTION '[VALIDATION] Invalid envelope'; END IF;
 IF jsonb_typeof(c->'id') IS DISTINCT FROM 'string' OR jsonb_typeof(c->'operationId') IS DISTINCT FROM 'string' OR jsonb_typeof(c->'expectedRevision') IS DISTINCT FROM 'string' OR c->>'protocol' IS DISTINCT FROM 'command04-v1' OR coalesce(c->>'operationId','') !~ '^(command02-op-[1-9][0-9]{0,15}|ironclad-op-[a-zA-Z0-9-]{1,80})$' OR coalesce(c->>'id','') !~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$' OR coalesce(c->>'expectedRevision','') !~ '^sim-[1-9][0-9]{0,9}$' THEN RAISE EXCEPTION '[VALIDATION] Invalid identities'; END IF;
 n:=substring(c->>'expectedRevision' FROM 5)::numeric;
 IF n>=2147483647 THEN RAISE EXCEPTION '[VALIDATION] Invalid revision'; END IF;
 expected:=n::integer; op:=c->>'operationId'; product_id:=c->>'id';
 IF NOT (c ? 'patch' OR c ? 'inventory' OR c ? 'internalCost') THEN RAISE EXCEPTION '[VALIDATION] Empty mutation'; END IF;
 IF c ? 'inventory' AND NOT principal.inventory_write OR c ? 'internalCost' AND NOT principal.cost_write THEN RAISE EXCEPTION '[PERMISSION] Separate write capability required'; END IF;
 -- Same actor/operation serializes even across products. Hash collision only serializes unrelated work.
 PERFORM pg_advisory_xact_lock(hashtextextended(principal.subject||':'||op,0));
 SELECT * INTO prior FROM ironclad_fixture.operations WHERE actor=principal.subject AND operation_id=op;
 IF FOUND THEN
  IF prior.command<>c THEN RAISE EXCEPTION '[IDEMPOTENCY] Operation content changed'; END IF;
  RETURN prior.result;
 END IF;
 SELECT * INTO old FROM ironclad_fixture.products WHERE id=product_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION '[MISSING] Product unavailable'; END IF;
 IF old.revision<>expected THEN RAISE EXCEPTION '[CONFLICT] Newer product revision'; END IF;
 SELECT * INTO inv FROM ironclad_fixture.inventory WHERE component_id=product_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION '[MISSING] Inventory unavailable'; END IF;
 SELECT unit_cost INTO old_cost FROM ironclad_fixture.internal_cost WHERE component_id=product_id FOR UPDATE;
 before_value:=ironclad_fixture.record_for(product_id); b:=old.body;
 IF c ? 'patch' THEN
  IF jsonb_typeof(c->'patch')<>'object' OR c->'patch'='{}'::jsonb THEN RAISE EXCEPTION '[VALIDATION] Invalid product patch'; END IF;
  FOR k,v IN SELECT * FROM jsonb_each(c->'patch') LOOP
   IF k IN ('name','sku','description','series','reference') THEN
    IF jsonb_typeof(v)<>'string' OR length(v#>>'{}')>(CASE k WHEN 'sku' THEN 80 WHEN 'description' THEN 5000 ELSE 300 END) OR k IN ('name','sku') AND btrim(v#>>'{}')='' THEN RAISE EXCEPTION '[VALIDATION] Invalid text'; END IF;
    v:=to_jsonb(btrim(v#>>'{}'));
    IF k IN ('series','reference') THEN
     IF v='""'::jsonb THEN b:=jsonb_set(b,'{specs}',(b->'specs')-(CASE k WHEN 'series' THEN 'Series' ELSE 'Reference' END));
     ELSE b:=jsonb_set(b,ARRAY['specs',CASE k WHEN 'series' THEN 'Series' ELSE 'Reference' END],v); END IF;
    ELSE b:=jsonb_set(b,ARRAY[k],v); END IF;
   ELSIF k IN ('salePrice','kitPrice','kitPriceQuantity') THEN
    IF v<>'null'::jsonb THEN
     IF jsonb_typeof(v)<>'number' OR v::text !~ '^[0-9]+$' THEN RAISE EXCEPTION '[VALIDATION] Integer pence/quantity required'; END IF;
     n:=(v::text)::numeric;
     IF n>2147483647 OR k='kitPriceQuantity' AND n<1 THEN RAISE EXCEPTION '[VALIDATION] Monetary/quantity bound'; END IF;
    END IF;
    b:=jsonb_set(b,ARRAY[k],v);
   ELSIF k IN ('active','individually','inKits') THEN
    IF jsonb_typeof(v)<>'boolean' THEN RAISE EXCEPTION '[VALIDATION] Boolean required'; END IF;
    b:=jsonb_set(b,ARRAY[k],v);
   ELSE RAISE EXCEPTION '[VALIDATION] Protected or unsupported field';
   END IF;
  END LOOP;
 END IF;
 new_stock:=inv.quantity;
 IF c ? 'inventory' THEN
  v:=c->'inventory';
  IF jsonb_typeof(v)<>'object' OR (SELECT array_agg(x ORDER BY x) FROM jsonb_object_keys(v) x)<>ARRAY['expectedQuantity','mode','value'] OR coalesce(v->>'mode','') NOT IN ('set','adjust') OR jsonb_typeof(v->'value') IS DISTINCT FROM 'number' OR jsonb_typeof(v->'expectedQuantity') IS DISTINCT FROM 'number' OR coalesce(v->>'value','') !~ '^-?[0-9]+$' OR coalesce(v->>'expectedQuantity','') !~ '^[0-9]+$' THEN RAISE EXCEPTION '[VALIDATION] Explicit inventory contract required'; END IF;
  IF (v->>'expectedQuantity')::numeric<>inv.quantity THEN RAISE EXCEPTION '[CONFLICT] Inventory changed'; END IF;
  n:=CASE v->>'mode' WHEN 'set' THEN (v->>'value')::numeric ELSE inv.quantity+(v->>'value')::numeric END;
  IF n<0 OR n>9007199254740991 OR abs((v->>'value')::numeric)>9007199254740991 THEN RAISE EXCEPTION '[VALIDATION] Invalid stock'; END IF;
  new_stock:=n::bigint;
 END IF;
 IF c ? 'internalCost' AND c->'internalCost'<>'null'::jsonb THEN
  v:=c->'internalCost';
  IF jsonb_typeof(v)<>'number' OR v::text !~ '^[0-9]+$' OR (v::text)::numeric>2147483647 THEN RAISE EXCEPTION '[VALIDATION] Private cost bound'; END IF;
 END IF;
 -- Product, inventory, private cost, receipt and audit are one SQL transaction.
 UPDATE ironclad_fixture.products SET body=b,revision=revision+1 WHERE id=product_id;
 IF c ? 'inventory' THEN UPDATE ironclad_fixture.inventory SET quantity=new_stock WHERE component_id=product_id; END IF;
 IF c ? 'internalCost' THEN
  UPDATE ironclad_fixture.internal_cost SET unit_cost=CASE WHEN c->'internalCost'='null'::jsonb THEN NULL ELSE (c->>'internalCost')::integer END WHERE component_id=product_id;
  IF NOT FOUND THEN RAISE EXCEPTION '[MISSING] Private cost unavailable'; END IF;
 END IF;
 result:=jsonb_build_object('applied',true,'operationId',op,'record',ironclad_fixture.record_for(product_id));
 INSERT INTO ironclad_fixture.operations VALUES(principal.subject,op,product_id,c,result);
 SELECT unit_cost INTO new_cost FROM ironclad_fixture.internal_cost WHERE component_id=product_id;
 INSERT INTO ironclad_fixture.audit(actor,operation_id,product_id,before_state,after_state,before_cost,after_cost) VALUES(principal.subject,op,product_id,before_value,ironclad_fixture.record_for(product_id),old_cost,new_cost);
 RETURN result;
END $$;
CREATE FUNCTION ironclad_fixture.operation_status(p_operation text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor_id text; r jsonb; BEGIN
 SELECT subject INTO actor_id FROM ironclad_fixture.principals WHERE role_name=session_user AND enabled AND expires_at>clock_timestamp() AND can_read;
 IF NOT FOUND THEN RAISE EXCEPTION '[PERMISSION] Reconciliation denied'; END IF;
 SELECT result INTO r FROM ironclad_fixture.operations WHERE actor=actor_id AND operation_id=p_operation;
 -- Absence is unknown, never proof that an in-flight or interrupted command was not applied.
 RETURN CASE WHEN r IS NULL THEN jsonb_build_object('status','unknown') ELSE jsonb_build_object('status','committed','result',r) END;
END $$;
RESET ROLE;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ironclad_fixture FROM PUBLIC;
GRANT USAGE ON SCHEMA ironclad_fixture TO ic_alice,ic_bob,ic_reader,ic_stranger,ic_anon;
GRANT EXECUTE ON FUNCTION ironclad_fixture.read_product(text),ironclad_fixture.mutate(jsonb),ironclad_fixture.operation_status(text) TO ic_alice,ic_bob,ic_reader,ic_stranger;
-- No application role receives direct table, sequence, ownership, helper or DDL privileges.
