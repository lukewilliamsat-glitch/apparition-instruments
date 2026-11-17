-- Metadata-only projection from production PostgreSQL 17.6. Test harness only.
-- Never run this file against production; includes managed-role stubs and no production rows.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated,service_role;
create schema extensions;
create extension if not exists pgcrypto with schema extensions;
create sequence public.order_reference_seq;

create table public."admin_members" (
 "user_id" uuid not null,
 "created_at" timestamp with time zone default now() not null
);

create table public."aftercare_email_suppressions" (
 "email" text not null,
 "actor" uuid not null,
 "reason" text not null,
 "created_at" timestamp with time zone default clock_timestamp() not null
);

create table public."assemblies" (
 "id" text not null,
 "sku" text not null,
 "name" text not null,
 "category" text not null,
 "kind" text default 'assembly'::text not null,
 "active" boolean default true not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."assembly_bom" (
 "assembly_id" text not null,
 "component_id" text not null,
 "quantity" bigint not null,
 "position" integer not null
);

create table public."commerce_shipping" (
 "country" text not null,
 "standard_delivery_pence" integer not null,
 "free_delivery_threshold_pence" integer not null
);

create table public."commercial_destinations" (
 "scope" text not null,
 "scope_key" text not null,
 "destination_type" text default 'EBAY'::text not null,
 "url" text not null,
 "label" text default ''::text not null,
 "enabled" boolean default false not null,
 "paused_only" boolean default false not null
);

create table public."component_internal" (
 "component_id" text not null,
 "internal_unit_cost" integer,
 "supplier_details" jsonb default '{}'::jsonb not null,
 "private_notes" text default ''::text not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."components" (
 "id" text not null,
 "sku" text not null,
 "name" text not null,
 "category" text not null,
 "manufacturer" text default ''::text not null,
 "description" text default ''::text not null,
 "specs" jsonb default '{}'::jsonb not null,
 "product_content" jsonb default '{}'::jsonb not null,
 "active" boolean default true not null,
 "individually" boolean default false not null,
 "in_kits" boolean default false not null,
 "sale_price" integer,
 "kit_price" integer,
 "image" jsonb,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null,
 "kit_price_quantity" integer
);

create table public."inventory" (
 "component_id" text not null,
 "quantity" bigint default 0 not null,
 "stock_unit" text default 'item'::text not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."kit_definition_internal" (
 "assembly_id" text not null,
 "metadata" jsonb default '{}'::jsonb not null
);

create table public."kit_definitions" (
 "assembly_id" text not null,
 "assembly_kind" text default 'wiring-kit'::text not null,
 "family" text not null,
 "base_price" integer not null,
 "show_on_wiring_kits" boolean default false not null,
 "builder_enabled" boolean default false not null,
 "default_wiring_style" text not null,
 "defaults" jsonb default '{}'::jsonb not null,
 "builder_options" jsonb default '[]'::jsonb not null,
 "component_resolvers" jsonb default '[]'::jsonb not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."kit_permitted_components" (
 "assembly_id" text not null,
 "component_id" text not null
);

create table public."order_aftercare" (
 "order_id" uuid not null,
 "dispatch_at" timestamp with time zone not null,
 "due_date" date not null,
 "state" text default 'pending'::text not null,
 "history" jsonb default '[]'::jsonb not null,
 "updated_at" timestamp with time zone default clock_timestamp() not null
);

create table public."order_email_deliveries" (
 "id" uuid default gen_random_uuid() not null,
 "order_id" uuid not null,
 "kind" text not null,
 "source_event_id" text not null,
 "state" text default 'pending'::text not null,
 "claim_id" uuid,
 "attempts" integer default 0 not null,
 "created_at" timestamp with time zone default now() not null,
 "claimed_at" timestamp with time zone,
 "attempted_at" timestamp with time zone,
 "sent_at" timestamp with time zone,
 "failure_reason" text,
 "automatic_delivery_eligible" boolean default false not null,
 "external_requested_by" uuid,
 "recipient_email" text,
 "order_snapshot" jsonb,
 "resend_of" uuid,
 "operation_id" uuid,
 "resend_reason" text
);

create table public."order_financial_records" (
 "order_id" uuid not null,
 "revision" bigint not null,
 "document" jsonb not null,
 "order_basis_hash" text not null,
 "created_at" timestamp with time zone default clock_timestamp() not null,
 "updated_at" timestamp with time zone default clock_timestamp() not null,
 "updated_by" uuid not null
);

create table public."order_financial_requests" (
 "actor_id" uuid not null,
 "request_id" uuid not null,
 "order_id" uuid not null,
 "payload_hash" text not null,
 "result" jsonb,
 "created_at" timestamp with time zone default clock_timestamp() not null
);

create table public."order_financial_revisions" (
 "order_id" uuid not null,
 "revision" bigint not null,
 "actor_id" uuid not null,
 "request_id" uuid not null,
 "before_document" jsonb,
 "after_document" jsonb not null,
 "order_basis_hash" text not null,
 "recorded_at" timestamp with time zone default clock_timestamp() not null
);

create table public."orders" (
 "id" uuid default gen_random_uuid() not null,
 "reference" text default ('AI-'::text || lpad((nextval('order_reference_seq'::regclass))::text, 6, '0'::text)) not null,
 "request_id" uuid not null,
 "request_hash" text not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null,
 "status" text default 'pending'::text not null,
 "payment_status" text default 'unpaid'::text not null,
 "currency" text default 'GBP'::text not null,
 "subtotal_pence" bigint not null,
 "delivery_pence" bigint default 0 not null,
 "total_pence" bigint not null,
 "customer" jsonb not null,
 "delivery" jsonb not null,
 "items" jsonb not null,
 "stripe_checkout_session_id" text,
 "stripe_payment_intent_id" text,
 "paid_at" timestamp with time zone,
 "fulfillment_applied_at" timestamp with time zone,
 "status_history" jsonb default '[]'::jsonb not null,
 "confirmation_email_status" text default 'pending'::text not null,
 "confirmation_email_sent_at" timestamp with time zone,
 "confirmation_email_last_attempt_at" timestamp with time zone,
 "confirmation_email_failure" text,
 "confirmation_email_claim_id" uuid,
 "confirmation_email_attempts" integer default 0 not null,
 "refunded_pence" bigint default 0 not null,
 "latest_refund_at" timestamp with time zone,
 "dispatch_details" jsonb default '{}'::jsonb not null,
 "owner_user_id" uuid,
 "sales_channel" text default 'WEBSITE'::text not null,
 "external_reference" text,
 "external_reference_key" text generated always as (lower(btrim(external_reference))) stored,
 "order_date" date,
 "internal_notes" text default ''::text not null
);

create table public."partial_refund_reviews" (
 "id" uuid default gen_random_uuid() not null,
 "order_id" uuid not null,
 "refunded_pence" bigint not null,
 "refund_at" timestamp with time zone not null,
 "admin_user_id" uuid not null,
 "reviewed_at" timestamp with time zone default now() not null
);

create table public."site_operations" (
 "id" boolean default true not null,
 "desired_state" text default 'OPEN'::text not null,
 "customer_title" text default 'Orders are temporarily paused'::text not null,
 "customer_message" text default 'You can browse and save your basket. Checkout will return when orders reopen.'::text not null,
 "internal_reason" text default ''::text not null,
 "pause_from" timestamp with time zone,
 "resume_at" timestamp with time zone,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null,
 "updated_by" uuid
);

create table public."stripe_refund_events" (
 "event_id" text not null,
 "refund_id" text not null,
 "order_id" uuid not null,
 "event_type" text not null,
 "processed_at" timestamp with time zone default now() not null
);

create table public."stripe_refunds" (
 "refund_id" text not null,
 "order_id" uuid not null,
 "payment_intent_id" text not null,
 "amount_pence" bigint not null,
 "status" text not null,
 "refund_created_at" timestamp with time zone not null,
 "observed_at" timestamp with time zone not null,
 "last_event_id" text not null
);

create table public."stripe_webhook_events" (
 "event_id" text not null,
 "order_id" uuid not null,
 "event_type" text not null,
 "processed_at" timestamp with time zone default now() not null
);

create table public."transactional_email_activation" (
 "singleton" boolean default true not null,
 "enabled" boolean default false not null,
 "activated_at" timestamp with time zone
);

alter table public."admin_members" add constraint "admin_members_pkey" PRIMARY KEY (user_id);

alter table public."aftercare_email_suppressions" add constraint "aftercare_email_suppressions_email_check" CHECK (((email = lower(btrim(email))) AND ((length(email) >= 3) AND (length(email) <= 254))));

alter table public."aftercare_email_suppressions" add constraint "aftercare_email_suppressions_pkey" PRIMARY KEY (email);

alter table public."aftercare_email_suppressions" add constraint "aftercare_email_suppressions_reason_check" CHECK (((length(btrim(reason)) >= 5) AND (length(btrim(reason)) <= 1000)));

alter table public."assemblies" add constraint "assemblies_id_check" CHECK (((length(id) >= 1) AND (length(id) <= 120)));

alter table public."assemblies" add constraint "assemblies_id_kind_key" UNIQUE (id, kind);

alter table public."assemblies" add constraint "assemblies_kind_check" CHECK ((kind = ANY (ARRAY['assembly'::text, 'wiring-kit'::text])));

alter table public."assemblies" add constraint "assemblies_name_check" CHECK (((length(name) >= 1) AND (length(name) <= 300)));

alter table public."assemblies" add constraint "assemblies_pkey" PRIMARY KEY (id);

alter table public."assemblies" add constraint "assemblies_sku_check" CHECK (((length(sku) >= 1) AND (length(sku) <= 80)));

alter table public."assemblies" add constraint "assemblies_sku_key" UNIQUE (sku);

alter table public."assembly_bom" add constraint "assembly_bom_pkey" PRIMARY KEY (assembly_id, "position");

alter table public."assembly_bom" add constraint "assembly_bom_position_check" CHECK (("position" >= 0));

alter table public."assembly_bom" add constraint "assembly_bom_quantity_check" CHECK (((quantity >= 1) AND (quantity <= '9007199254740991'::bigint)));

alter table public."commerce_shipping" add constraint "commerce_shipping_country_check" CHECK ((country = 'GB'::text));

alter table public."commerce_shipping" add constraint "commerce_shipping_free_delivery_threshold_pence_check" CHECK ((free_delivery_threshold_pence > 0));

alter table public."commerce_shipping" add constraint "commerce_shipping_pkey" PRIMARY KEY (country);

alter table public."commerce_shipping" add constraint "commerce_shipping_standard_delivery_pence_check" CHECK ((standard_delivery_pence >= 0));

alter table public."commercial_destinations" add constraint "commercial_destinations_check" CHECK (((scope <> 'STOREFRONT'::text) OR (scope_key = '*'::text)));

alter table public."commercial_destinations" add constraint "commercial_destinations_destination_type_check" CHECK ((destination_type = 'EBAY'::text));

alter table public."commercial_destinations" add constraint "commercial_destinations_label_check" CHECK ((length(label) <= 100));

alter table public."commercial_destinations" add constraint "commercial_destinations_pkey" PRIMARY KEY (scope, scope_key);

alter table public."commercial_destinations" add constraint "commercial_destinations_scope_check" CHECK ((scope = ANY (ARRAY['PRODUCT'::text, 'SKU'::text, 'FAMILY'::text, 'CATEGORY'::text, 'STOREFRONT'::text])));

alter table public."commercial_destinations" add constraint "commercial_destinations_scope_key_check" CHECK ((((length(scope_key) >= 1) AND (length(scope_key) <= 160)) AND (scope_key !~ '[[:cntrl:]]'::text)));

alter table public."commercial_destinations" add constraint "commercial_destinations_url_check" CHECK (((length(url) <= 2000) AND (url ~ '^https://(www\.)?ebay\.(co\.uk|com)/(itm|str)/[A-Za-z0-9_%-]+(/?[A-Za-z0-9_./%?=&+-]*)?$'::text) AND (url !~ '(%0[adAD]|%5[cC]|%23)'::text)));

alter table public."component_internal" add constraint "component_internal_internal_unit_cost_check" CHECK ((internal_unit_cost >= 0));

alter table public."component_internal" add constraint "component_internal_pkey" PRIMARY KEY (component_id);

alter table public."component_internal" add constraint "component_internal_supplier_details_check" CHECK ((jsonb_typeof(supplier_details) = 'object'::text));

alter table public."components" add constraint "components_category_check" CHECK (((length(category) >= 1) AND (length(category) <= 100)));

alter table public."components" add constraint "components_id_check" CHECK (((length(id) >= 1) AND (length(id) <= 120)));

alter table public."components" add constraint "components_kit_price_check" CHECK ((kit_price >= 0));

alter table public."components" add constraint "components_kit_price_quantity_check" CHECK ((kit_price_quantity >= 1));

alter table public."components" add constraint "components_name_check" CHECK (((length(name) >= 1) AND (length(name) <= 300)));

alter table public."components" add constraint "components_pkey" PRIMARY KEY (id);

alter table public."components" add constraint "components_product_content_check" CHECK ((jsonb_typeof(product_content) = 'object'::text));

alter table public."components" add constraint "components_sale_price_check" CHECK ((sale_price >= 0));

alter table public."components" add constraint "components_sku_check" CHECK (((length(sku) >= 1) AND (length(sku) <= 80)));

alter table public."components" add constraint "components_sku_key" UNIQUE (sku);

alter table public."components" add constraint "components_specs_check" CHECK ((jsonb_typeof(specs) = 'object'::text));

alter table public."inventory" add constraint "inventory_pkey" PRIMARY KEY (component_id);

alter table public."inventory" add constraint "inventory_quantity_check" CHECK (((quantity >= 0) AND (quantity <= '9007199254740991'::bigint)));

alter table public."inventory" add constraint "inventory_stock_unit_check" CHECK ((stock_unit = ANY (ARRAY['item'::text, 'm'::text, 'g'::text])));

alter table public."kit_definition_internal" add constraint "kit_definition_internal_metadata_check" CHECK ((jsonb_typeof(metadata) = 'object'::text));

alter table public."kit_definition_internal" add constraint "kit_definition_internal_pkey" PRIMARY KEY (assembly_id);

alter table public."kit_definitions" add constraint "kit_definitions_assembly_kind_check" CHECK ((assembly_kind = 'wiring-kit'::text));

alter table public."kit_definitions" add constraint "kit_definitions_base_price_check" CHECK ((base_price >= 0));

alter table public."kit_definitions" add constraint "kit_definitions_builder_options_check" CHECK ((jsonb_typeof(builder_options) = 'array'::text));

alter table public."kit_definitions" add constraint "kit_definitions_component_resolvers_check" CHECK ((jsonb_typeof(component_resolvers) = 'array'::text));

alter table public."kit_definitions" add constraint "kit_definitions_defaults_check" CHECK ((jsonb_typeof(defaults) = 'object'::text));

alter table public."kit_definitions" add constraint "kit_definitions_family_check" CHECK ((family ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text));

alter table public."kit_definitions" add constraint "kit_definitions_family_key" UNIQUE (family);

alter table public."kit_definitions" add constraint "kit_definitions_pkey" PRIMARY KEY (assembly_id);

alter table public."kit_permitted_components" add constraint "kit_permitted_components_pkey" PRIMARY KEY (assembly_id, component_id);

alter table public."order_aftercare" add constraint "order_aftercare_history_check" CHECK ((jsonb_typeof(history) = 'array'::text));

alter table public."order_aftercare" add constraint "order_aftercare_pkey" PRIMARY KEY (order_id);

alter table public."order_aftercare" add constraint "order_aftercare_state_check" CHECK ((state = ANY (ARRAY['pending'::text, 'claimed'::text, 'sent'::text, 'failed'::text, 'unknown'::text, 'handled'::text, 'skipped'::text])));

alter table public."order_email_deliveries" add constraint "external_dispatch_snapshot" CHECK (((external_requested_by IS NULL) OR ((kind = ANY (ARRAY['dispatched'::text, 'aftercare'::text])) AND (recipient_email IS NOT NULL) AND (order_snapshot IS NOT NULL))));

alter table public."order_email_deliveries" add constraint "order_email_deliveries_attempts_check" CHECK ((attempts >= 0));

alter table public."order_email_deliveries" add constraint "order_email_deliveries_check" CHECK ((((state = 'pending'::text) AND (claim_id IS NULL) AND (attempts = 0)) OR ((state = 'claimed'::text) AND (claim_id IS NOT NULL)) OR ((state = ANY (ARRAY['sent'::text, 'failed'::text, 'unknown'::text])) AND (claim_id IS NOT NULL) AND (attempts > 0))));

alter table public."order_email_deliveries" add constraint "order_email_deliveries_kind_check" CHECK ((kind = ANY (ARRAY['order_confirmed'::text, 'in_production'::text, 'ready_to_dispatch'::text, 'dispatched'::text, 'full_refund'::text, 'aftercare'::text])));

alter table public."order_email_deliveries" add constraint "order_email_deliveries_operation_id_key" UNIQUE (operation_id);

alter table public."order_email_deliveries" add constraint "order_email_deliveries_order_id_kind_source_event_id_key" UNIQUE (order_id, kind, source_event_id);

alter table public."order_email_deliveries" add constraint "order_email_deliveries_pkey" PRIMARY KEY (id);

alter table public."order_email_deliveries" add constraint "order_email_deliveries_state_check" CHECK ((state = ANY (ARRAY['pending'::text, 'claimed'::text, 'sent'::text, 'failed'::text, 'unknown'::text])));

alter table public."order_email_deliveries" add constraint "resend_audit_check" CHECK (((resend_of IS NULL) OR ((operation_id IS NOT NULL) AND ((length(btrim(resend_reason)) >= 5) AND (length(btrim(resend_reason)) <= 1000)) AND (external_requested_by IS NOT NULL) AND (recipient_email IS NOT NULL) AND (order_snapshot IS NOT NULL))));

alter table public."order_financial_records" add constraint "order_financial_records_document_check" CHECK (((jsonb_typeof(document) = 'object'::text) AND ((document ->> 'policyVersion'::text) = 'marketplace-contribution-v2'::text) AND (octet_length(convert_to((document)::text, 'UTF8'::name)) <= 32768)));

alter table public."order_financial_records" add constraint "order_financial_records_order_basis_hash_check" CHECK ((order_basis_hash ~ '^[a-f0-9]{64}$'::text));

alter table public."order_financial_records" add constraint "order_financial_records_pkey" PRIMARY KEY (order_id);

alter table public."order_financial_records" add constraint "order_financial_records_revision_check" CHECK (((revision >= 1) AND (revision <= 1000000000)));

alter table public."order_financial_requests" add constraint "order_financial_requests_payload_hash_check" CHECK ((payload_hash ~ '^[a-f0-9]{64}$'::text));

alter table public."order_financial_requests" add constraint "order_financial_requests_pkey" PRIMARY KEY (actor_id, request_id);

alter table public."order_financial_revisions" add constraint "order_financial_revisions_actor_id_request_id_key" UNIQUE (actor_id, request_id);

alter table public."order_financial_revisions" add constraint "order_financial_revisions_pkey" PRIMARY KEY (order_id, revision);

alter table public."orders" add constraint "orders_check" CHECK ((total_pence = (subtotal_pence + delivery_pence)));

alter table public."orders" add constraint "orders_check1" CHECK (((refunded_pence >= 0) AND (refunded_pence <= total_pence)));

alter table public."orders" add constraint "orders_confirmation_email_status_check" CHECK ((confirmation_email_status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'unknown'::text, 'legacy'::text])));

alter table public."orders" add constraint "orders_currency_check" CHECK ((currency = 'GBP'::text));

alter table public."orders" add constraint "orders_customer_check" CHECK ((jsonb_typeof(customer) = 'object'::text));

alter table public."orders" add constraint "orders_delivery_check" CHECK ((jsonb_typeof(delivery) = 'object'::text));

alter table public."orders" add constraint "orders_delivery_pence_check" CHECK (((delivery_pence >= 0) AND (delivery_pence <= 1000000000)));

alter table public."orders" add constraint "orders_dispatch_details_check" CHECK ((jsonb_typeof(dispatch_details) = 'object'::text));

alter table public."orders" add constraint "orders_external_identity_check" CHECK ((((sales_channel = 'WEBSITE'::text) AND (external_reference IS NULL) AND (order_date IS NULL)) OR ((sales_channel <> 'WEBSITE'::text) AND (external_reference IS NOT NULL) AND ((length(btrim(external_reference)) >= 1) AND (length(btrim(external_reference)) <= 150)) AND (order_date IS NOT NULL))));

alter table public."orders" add constraint "orders_items_check" CHECK (((jsonb_typeof(items) = 'array'::text) AND ((jsonb_array_length(items) >= 1) AND (jsonb_array_length(items) <= 10))));

alter table public."orders" add constraint "orders_payment_status_check" CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'partially_refunded'::text, 'refunded'::text])));

alter table public."orders" add constraint "orders_pkey" PRIMARY KEY (id);

alter table public."orders" add constraint "orders_reference_key" UNIQUE (reference);

alter table public."orders" add constraint "orders_request_id_key" UNIQUE (request_id);

alter table public."orders" add constraint "orders_sales_channel_check" CHECK ((sales_channel = ANY (ARRAY['WEBSITE'::text, 'EBAY'::text, 'DIRECT'::text, 'OTHER'::text])));

alter table public."orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_production'::text, 'ready_to_dispatch'::text, 'dispatched'::text, 'completed'::text, 'cancelled'::text])));

alter table public."orders" add constraint "orders_status_history_check" CHECK ((jsonb_typeof(status_history) = 'array'::text));

alter table public."orders" add constraint "orders_stripe_checkout_session_id_key" UNIQUE (stripe_checkout_session_id);

alter table public."orders" add constraint "orders_stripe_payment_intent_id_key" UNIQUE (stripe_payment_intent_id);

alter table public."orders" add constraint "orders_subtotal_pence_check" CHECK (((subtotal_pence >= 0) AND (subtotal_pence <= 1000000000)));

alter table public."partial_refund_reviews" add constraint "partial_refund_reviews_order_id_refunded_pence_refund_at_key" UNIQUE (order_id, refunded_pence, refund_at);

alter table public."partial_refund_reviews" add constraint "partial_refund_reviews_pkey" PRIMARY KEY (id);

alter table public."partial_refund_reviews" add constraint "partial_refund_reviews_refunded_pence_check" CHECK ((refunded_pence > 0));

alter table public."site_operations" add constraint "site_operations_check" CHECK ((((desired_state = 'OPEN'::text) AND (pause_from IS NULL) AND (resume_at IS NULL)) OR ((desired_state = 'ORDERS_PAUSED'::text) AND (pause_from IS NOT NULL) AND ((resume_at IS NULL) OR (resume_at > pause_from)))));

alter table public."site_operations" add constraint "site_operations_customer_message_check" CHECK (((length(customer_message) >= 1) AND (length(customer_message) <= 1000)));

alter table public."site_operations" add constraint "site_operations_customer_title_check" CHECK (((length(customer_title) >= 1) AND (length(customer_title) <= 160)));

alter table public."site_operations" add constraint "site_operations_desired_state_check" CHECK ((desired_state = ANY (ARRAY['OPEN'::text, 'ORDERS_PAUSED'::text])));

alter table public."site_operations" add constraint "site_operations_id_check" CHECK (id);

alter table public."site_operations" add constraint "site_operations_internal_reason_check" CHECK ((length(internal_reason) <= 2000));

alter table public."site_operations" add constraint "site_operations_pkey" PRIMARY KEY (id);

alter table public."stripe_refund_events" add constraint "stripe_refund_events_event_type_check" CHECK ((event_type = ANY (ARRAY['refund.created'::text, 'refund.updated'::text, 'refund.failed'::text])));

alter table public."stripe_refund_events" add constraint "stripe_refund_events_pkey" PRIMARY KEY (event_id);

alter table public."stripe_refunds" add constraint "stripe_refunds_amount_pence_check" CHECK ((amount_pence > 0));

alter table public."stripe_refunds" add constraint "stripe_refunds_pkey" PRIMARY KEY (refund_id);

alter table public."stripe_refunds" add constraint "stripe_refunds_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'requires_action'::text, 'succeeded'::text, 'failed'::text, 'canceled'::text])));

alter table public."stripe_webhook_events" add constraint "stripe_webhook_events_event_type_check" CHECK ((event_type = ANY (ARRAY['checkout.session.completed'::text, 'checkout.session.async_payment_succeeded'::text])));

alter table public."stripe_webhook_events" add constraint "stripe_webhook_events_pkey" PRIMARY KEY (event_id);

alter table public."transactional_email_activation" add constraint "transactional_email_activation_check" CHECK (((enabled AND (activated_at IS NOT NULL)) OR ((NOT enabled) AND (activated_at IS NULL))));

alter table public."transactional_email_activation" add constraint "transactional_email_activation_pkey" PRIMARY KEY (singleton);

alter table public."transactional_email_activation" add constraint "transactional_email_activation_singleton_check" CHECK (singleton);

alter table public."admin_members" add constraint "admin_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."aftercare_email_suppressions" add constraint "aftercare_email_suppressions_actor_fkey" FOREIGN KEY (actor) REFERENCES auth.users(id);

alter table public."assembly_bom" add constraint "assembly_bom_assembly_id_fkey" FOREIGN KEY (assembly_id) REFERENCES assemblies(id) ON DELETE CASCADE;

alter table public."assembly_bom" add constraint "assembly_bom_component_id_fkey" FOREIGN KEY (component_id) REFERENCES components(id);

alter table public."component_internal" add constraint "component_internal_component_id_fkey" FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE;

alter table public."inventory" add constraint "inventory_component_id_fkey" FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE;

alter table public."kit_definition_internal" add constraint "kit_definition_internal_assembly_id_fkey" FOREIGN KEY (assembly_id) REFERENCES kit_definitions(assembly_id) ON DELETE CASCADE;

alter table public."kit_definitions" add constraint "kit_definitions_assembly_id_assembly_kind_fkey" FOREIGN KEY (assembly_id, assembly_kind) REFERENCES assemblies(id, kind) ON DELETE CASCADE;

alter table public."kit_permitted_components" add constraint "kit_permitted_components_assembly_id_fkey" FOREIGN KEY (assembly_id) REFERENCES kit_definitions(assembly_id) ON DELETE CASCADE;

alter table public."kit_permitted_components" add constraint "kit_permitted_components_component_id_fkey" FOREIGN KEY (component_id) REFERENCES components(id);

alter table public."order_aftercare" add constraint "order_aftercare_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id);

alter table public."order_email_deliveries" add constraint "order_email_deliveries_external_requested_by_fkey" FOREIGN KEY (external_requested_by) REFERENCES auth.users(id);

alter table public."order_email_deliveries" add constraint "order_email_deliveries_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id);

alter table public."order_email_deliveries" add constraint "order_email_deliveries_resend_of_fkey" FOREIGN KEY (resend_of) REFERENCES order_email_deliveries(id);

alter table public."order_financial_records" add constraint "order_financial_records_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

alter table public."order_financial_revisions" add constraint "order_financial_revisions_order_id_fkey" FOREIGN KEY (order_id) REFERENCES order_financial_records(order_id) ON DELETE RESTRICT;

alter table public."orders" add constraint "orders_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public."partial_refund_reviews" add constraint "partial_refund_reviews_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES auth.users(id);

alter table public."partial_refund_reviews" add constraint "partial_refund_reviews_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id);

alter table public."site_operations" add constraint "site_operations_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);

alter table public."stripe_refund_events" add constraint "stripe_refund_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id);

alter table public."stripe_refund_events" add constraint "stripe_refund_events_refund_id_fkey" FOREIGN KEY (refund_id) REFERENCES stripe_refunds(refund_id);

alter table public."stripe_refunds" add constraint "stripe_refunds_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id);

alter table public."stripe_webhook_events" add constraint "stripe_webhook_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id);

CREATE UNIQUE INDEX assemblies_sku_folded_key ON public.assemblies USING btree (lower(sku));

CREATE UNIQUE INDEX components_sku_folded_key ON public.components USING btree (lower(sku));

CREATE UNIQUE INDEX order_email_original_unique ON public.order_email_deliveries USING btree (order_id, kind) WHERE (resend_of IS NULL);

CREATE UNIQUE INDEX orders_external_identity_unique ON public.orders USING btree (sales_channel, external_reference_key) WHERE (sales_channel <> 'WEBSITE'::text);

set check_function_bodies=off;

CREATE OR REPLACE FUNCTION public.command63_finance_actor()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare actor uuid:=auth.uid();begin if actor is null or not exists(select 1 from public.admin_members m where m.user_id=actor) then raise exception 'Admin membership required' using errcode='42501';end if;return actor;end;$function$;

CREATE OR REPLACE FUNCTION public.command63_finance_basis(p_order orders)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
 select encode(sha256(convert_to(jsonb_build_object('items',p_order.items,'currency',p_order.currency,'subtotal',p_order.subtotal_pence,'delivery',p_order.delivery_pence,'total',p_order.total_pence,'channel',p_order.sales_channel,'payment',p_order.payment_status,'refund',p_order.refunded_pence,'refund_at',p_order.latest_refund_at)::text,'UTF8')),'hex');
$function$;

CREATE OR REPLACE FUNCTION public.command63_finance_evidence(p_state jsonb, p_source jsonb, p_excluded boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare state text:=public.command63_finance_text(p_state,30,true);
begin
 if p_excluded and state='excluded' then return;end if;
 if state not in ('unknown','estimated','confirmed') then raise exception 'Unsupported financial evidence state' using errcode='22023';end if;
 perform public.command63_finance_text(p_source,300,state='confirmed');
end;$function$;

CREATE OR REPLACE FUNCTION public.command63_finance_keys(p_object jsonb, p_allowed text[])
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
begin
 if jsonb_typeof(p_object) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_object) k where not(k=any(p_allowed))) then
  raise exception 'Unsupported financial object or field' using errcode='22023';
 end if;
end;$function$;

CREATE OR REPLACE FUNCTION public.command63_finance_number(p_value jsonb, p_nullable boolean DEFAULT false, p_signed boolean DEFAULT false, p_micro boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare v numeric; ceiling numeric:=case when p_micro then 100000000000000 else 1000000000000 end;
begin
 if p_value is null or p_value='null'::jsonb then if p_nullable then return null;end if;raise exception 'Financial amount is required' using errcode='22023';end if;
 if jsonb_typeof(p_value)<>'number' or (p_value#>>'{}')!~'^-?[0-9]+$' then raise exception 'Financial amounts require integer minor units' using errcode='22023';end if;
 v:=(p_value#>>'{}')::numeric;
 if v>ceiling or v<(case when p_signed then -ceiling else 0 end) then raise exception 'Financial amount outside supported range' using errcode='22023';end if;
 return v::bigint;
end;$function$;

CREATE OR REPLACE FUNCTION public.command63_finance_text(p_value jsonb, p_max integer, p_required boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare v text; units integer;
begin
 if p_value is null or p_value='null'::jsonb then if p_required then raise exception 'Financial evidence text is required' using errcode='22023';end if;return null;end if;
 if jsonb_typeof(p_value)<>'string' then raise exception 'Financial text must be a string' using errcode='22023';end if;
 v:=p_value#>>'{}';
 -- Match JavaScript/HTML UTF-16 length, including supplementary characters.
 units:=length(v)+length(regexp_replace(v,U&'[^\+010000-\+10FFFF]','','g'));
 if units>p_max or p_required and length(btrim(v))=0 then raise exception 'Financial text exceeds its limit or is blank' using errcode='22023';end if;
 return v;
end;$function$;

CREATE OR REPLACE FUNCTION public.command63_finance_validate(p_document jsonb, p_items jsonb, p_currency text)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare row jsonb; original jsonb; fee jsonb; cost jsonb; i integer:=0; ids text[]:='{}'; refs text[]:='{}'; ref text; category text; k text; method text; state text; n numeric; q bigint; unit numeric; line_discount numeric; products numeric:=0; cogs numeric:=0; known_cogs boolean:=true; order_discount numeric:=0; postage numeric; actual numeric; pass numeric; seller_gross numeric; fees numeric:=0; fulfilment numeric:=0; refunds numeric:=0; adjustments numeric:=0; return_credit numeric:=0; seller_tax numeric:=0; rate numeric; fee_amount numeric; base numeric; source text; stock_basis text;
begin
 perform public.command63_finance_keys(p_document,array['policyVersion','currency','paymentBreakdownBasis','actualPaidMinor','postageMinor','marketplaceTaxMinor','marketplaceTaxState','marketplaceTaxSource','discount','lines','fees','feesComplete','costs','tax','adjustments','settlement','returnCostCredit','provenance']);
 if octet_length(convert_to(p_document::text,'UTF8'))>32768 or p_document->>'policyVersion' is distinct from 'marketplace-contribution-v2' or p_document->>'currency' is distinct from p_currency or p_currency<>'GBP' or coalesce(p_document->>'paymentBreakdownBasis','') not in ('customer_gross','seller_net','unreviewed') then raise exception 'Financial version, currency, amount basis or size mismatch' using errcode='22023';end if;
 if jsonb_typeof(p_document->'lines') is distinct from 'array' or jsonb_array_length(p_document->'lines') not between 1 and 10 or jsonb_array_length(p_document->'lines')<>jsonb_array_length(p_items) then raise exception 'Financial lines must retain the existing order identities' using errcode='22023';end if;
 for row in select value from jsonb_array_elements(p_document->'lines') loop
  perform public.command63_finance_keys(row,array['id','label','productId','quantity','unitPriceMinor','priceBasis','discountMinor','unitCostMicro','costState','costSource','costProvenance']);original:=p_items->i;
  if row->>'id' is distinct from 'line-'||i::text or row->>'productId' is distinct from coalesce(original->>'productId',original#>>'{snapshot,componentId}',original#>>'{snapshot,assemblyId}','') then raise exception 'Financial line identity changed' using errcode='22023';end if;
  perform public.command63_finance_text(row->'label',500,false);q:=public.command63_finance_number(row->'quantity');
  if q not between 1 and 99 or q::text is distinct from original->>'quantity' then raise exception 'Financial edits cannot change sold stock quantities' using errcode='22023';end if;
  unit:=public.command63_finance_number(row->'unitPriceMinor');line_discount:=public.command63_finance_number(coalesce(row->'discountMinor','0'::jsonb));
  if coalesce(row->>'priceBasis','') not in ('net','before_discount') or unit*q>1000000000000 or row->>'priceBasis'='before_discount' and line_discount>unit*q then raise exception 'Invalid financial selling-price basis' using errcode='22023';end if;
  products:=products+unit*q-case when row->>'priceBasis'='before_discount' then line_discount else 0 end;
  perform public.command63_finance_evidence(row->'costState',row->'costSource');n:=public.command63_finance_number(row->'unitCostMicro',true,false,true);
  if n is null or row->>'costState'='unknown' then known_cogs:=false;else cogs:=cogs+round(n*q/10000);end if;
  if row?'costProvenance' and row->'costProvenance'<>'null'::jsonb then
   cost:=row->'costProvenance';perform public.command63_finance_keys(cost,array['basis','purchaseReference','acquiredAt','originalCurrency','originalUnitCostMicro','gbpPerOriginalRateMicro','exchangeRateSource','notes']);stock_basis:=public.command63_finance_text(cost->'basis',40,true);
   if stock_basis not in ('unknown','current_estimate','assembly_estimate','historical_snapshot','manual_evidenced') or row->>'costState'='confirmed' and stock_basis in ('unknown','current_estimate','assembly_estimate') then raise exception 'Current reference costs cannot be confirmed historical COGS' using errcode='22023';end if;
   perform public.command63_finance_text(cost->'purchaseReference',300,false);perform public.command63_finance_text(cost->'notes',1000,false);source:=public.command63_finance_text(cost->'acquiredAt',10,false);if source is not null and source<>'' then if source!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid acquisition date' using errcode='22023';end if;perform source::date;end if;
   source:=public.command63_finance_text(cost->'originalCurrency',3,false);if source is not null and source not in ('GBP','EUR','USD') then raise exception 'Unsupported historical acquisition currency' using errcode='22023';end if;
   perform public.command63_finance_number(cost->'originalUnitCostMicro',true,false,true);n:=public.command63_finance_number(cost->'gbpPerOriginalRateMicro',true,false,true);
   if source in ('EUR','USD') and (n is null or n<=0) then raise exception 'Historical exchange-rate provenance is required' using errcode='22023';end if;
   perform public.command63_finance_text(cost->'exchangeRateSource',300,source in ('EUR','USD'));
  end if;
  i:=i+1;
 end loop;
 perform public.command63_finance_keys(p_document->'discount',array['kind','minor','percentage']);method:=p_document#>>'{discount,kind}';
 if method not in ('none','manual','percent','included') or method is null then raise exception 'Unsupported order discount' using errcode='22023';end if;
 if method in ('manual','included') then n:=public.command63_finance_number(coalesce(p_document#>'{discount,minor}','0'::jsonb));if method='manual' then order_discount:=n;end if;end if;
 if method='percent' then source:=public.command63_finance_text(p_document#>'{discount,percentage}',24,true);if source!~'^[0-9]+([.][0-9]{1,4})?$' or source::numeric>100 then raise exception 'Invalid discount percentage' using errcode='22023';end if;order_discount:=round(products*source::numeric/100);end if;
 if order_discount>products or products>1000000000000 or cogs>1000000000000 then raise exception 'Financial line totals exceed supported bounds' using errcode='22023';end if;products:=products-order_discount;
 postage:=public.command63_finance_number(p_document->'postageMinor');actual:=public.command63_finance_number(p_document->'actualPaidMinor',true);pass:=public.command63_finance_number(p_document->'marketplaceTaxMinor',true);perform public.command63_finance_evidence(p_document->'marketplaceTaxState',p_document->'marketplaceTaxSource');
 if products+postage>1000000000000 or pass>actual or p_document->>'paymentBreakdownBasis'='customer_gross' and pass>products+postage then raise exception 'Invalid gross payment/pass-through amounts' using errcode='22023';end if;
 seller_gross:=case when actual is not null then actual-coalesce(pass,0) when p_document->>'paymentBreakdownBasis'='customer_gross' then products+postage-coalesce(pass,0) else products+postage end;
 if jsonb_typeof(p_document->'fees') is distinct from 'array' or jsonb_array_length(p_document->'fees')>50 or jsonb_typeof(p_document->'feesComplete') is distinct from 'boolean' then raise exception 'Invalid financial fee collection' using errcode='22023';end if;
 for fee in select value from jsonb_array_elements(p_document->'fees') loop
  perform public.command63_finance_keys(fee,array['id','category','direction','method','actualMinor','amountMinor','percentage','base','baseMinor','state','source','chargeReference','includes','reverses']);ref:=public.command63_finance_text(fee->'id',120,true);
  if ref=any(ids) then raise exception 'Duplicate financial fee identity' using errcode='22023';end if;ids:=array_append(ids,ref);
  category:=public.command63_finance_text(fee->'category',30,true);method:=public.command63_finance_text(fee->'method',20,true);
  if category not in ('marketplace','payment','advertising','conversion','regulatory','other') or coalesce(fee->>'direction','') not in ('charge','credit') or method not in ('fixed','percentage') then raise exception 'Unsupported financial fee type' using errcode='22023';end if;
  perform public.command63_finance_evidence(fee->'state',fee->'source');fee_amount:=public.command63_finance_number(fee->'actualMinor',true);n:=public.command63_finance_number(fee->'amountMinor',true);base:=public.command63_finance_number(fee->'baseMinor',true);
  source:=public.command63_finance_text(fee->'percentage',24,false);if source is not null and source<>'' and (source!~'^[0-9]+([.][0-9]{1,4})?$' or source::numeric>1000) then raise exception 'Invalid fee estimate percentage' using errcode='22023';end if;
  if fee_amount is null and method='fixed' then fee_amount:=n;end if;
  if fee_amount is null and method='percentage' and source is not null and source<>'' then
   if coalesce(fee->>'base','') not in ('products','seller_gross','custom') then raise exception 'Choose an explicit fee percentage base' using errcode='22023';end if;
   base:=case fee->>'base' when 'products' then products when 'seller_gross' then seller_gross else base end;if base is null then raise exception 'Custom fee base is missing' using errcode='22023';end if;fee_amount:=round(base*source::numeric/100);
  end if;
  if fee_amount>1000000000000 then raise exception 'Fee estimate exceeds supported bounds' using errcode='22023';end if;
  if fee->>'state'<>'unknown' and fee_amount is not null then fees:=fees+fee_amount*case when fee->>'direction'='credit' then -1 else 1 end;end if;
  ref:=public.command63_finance_text(fee->'chargeReference',150,false);if ref is not null and ref<>'' then ref:=lower(btrim(ref));if ref='' or ref=any(refs) then raise exception 'Duplicate marketplace charge reference' using errcode='22023';end if;refs:=array_append(refs,ref);end if;
  if fee?'includes' then if jsonb_typeof(fee->'includes')<>'array' or jsonb_array_length(fee->'includes')>5 then raise exception 'Invalid combined fee inclusions' using errcode='22023';end if;
   if (select count(*) from jsonb_array_elements_text(fee->'includes'))<>(select count(distinct value) from jsonb_array_elements_text(fee->'includes')) then raise exception 'Duplicate combined fee inclusion' using errcode='22023';end if;
   for k in select value from jsonb_array_elements_text(fee->'includes') loop
    if k=category or k not in ('marketplace','payment','advertising','conversion','regulatory','other') or exists(select 1 from jsonb_array_elements(p_document->'fees') other where other->>'id'<>fee->>'id' and other->>'category'=k and other->>'direction'='charge') then raise exception 'Combined marketplace fee would double-count a charge' using errcode='22023';end if;
   end loop;
  end if;
  ref:=public.command63_finance_text(fee->'reverses',120,false);if ref is not null and ref<>'' and (fee->>'direction'<>'credit' or not exists(select 1 from jsonb_array_elements(p_document->'fees') other where other->>'id'=ref and other->>'direction'='charge')) then raise exception 'Fee reversal must identify its original charge' using errcode='22023';end if;
 end loop;
 perform public.command63_finance_keys(p_document->'costs',array['shipping','packaging','other','labour']);
 foreach k in array array['shipping','packaging','other','labour'] loop
  cost:=p_document->'costs'->k;if k='labour' and (cost is null or cost->>'state'='excluded') then continue;end if;
  perform public.command63_finance_keys(cost,array['minor','state','source']);perform public.command63_finance_evidence(cost->'state',cost->'source');n:=public.command63_finance_number(cost->'minor',true);if n is not null and cost->>'state'<>'unknown' then fulfilment:=fulfilment+n;end if;
 end loop;
 perform public.command63_finance_keys(p_document->'tax',array['state','minor','source']);state:=p_document#>>'{tax,state}';if coalesce(state,'') not in ('unreviewed','not_applicable','confirmed') then raise exception 'Seller tax review is required' using errcode='22023';end if;
 n:=public.command63_finance_number(p_document#>'{tax,minor}',state<>'confirmed');perform public.command63_finance_text(p_document#>'{tax,source}',300,state='confirmed');if state='confirmed' then seller_tax:=n;end if;
 if jsonb_typeof(p_document->'adjustments') is distinct from 'array' or jsonb_array_length(p_document->'adjustments')>50 then raise exception 'Invalid financial adjustments' using errcode='22023';end if;ids:='{}';
 for row in select value from jsonb_array_elements(p_document->'adjustments') loop
  perform public.command63_finance_keys(row,array['id','kind','minor','state','source']);ref:=public.command63_finance_text(row->'id',120,true);if ref=any(ids) then raise exception 'Duplicate adjustment identity' using errcode='22023';end if;ids:=array_append(ids,ref);
  if coalesce(row->>'kind','') not in ('refund','revenue') then raise exception 'Unsupported financial adjustment' using errcode='22023';end if;
  perform public.command63_finance_evidence(row->'state',row->'source');n:=public.command63_finance_number(row->'minor',false,row->>'kind'='revenue');if row->>'state'<>'unknown' then if row->>'kind'='refund' then refunds:=refunds+n;else adjustments:=adjustments+n;end if;end if;
 end loop;
 if p_document?'returnCostCredit' and p_document->'returnCostCredit'<>'null'::jsonb then row:=p_document->'returnCostCredit';perform public.command63_finance_keys(row,array['minor','state','source']);perform public.command63_finance_evidence(row->'state',row->'source');n:=public.command63_finance_number(row->'minor',true);if n is not null and row->>'state'<>'unknown' then return_credit:=n;end if;if known_cogs and return_credit>cogs then raise exception 'Return cost credit exceeds recorded COGS' using errcode='22023';end if;end if;
 if abs(fees)>1000000000000 or fulfilment>1000000000000 or refunds>1000000000000 or abs(adjustments)>1000000000000 or abs(seller_gross-refunds+adjustments-seller_tax)>1000000000000 or abs(cogs-return_credit+fees+fulfilment)>1000000000000 then raise exception 'Financial aggregate exceeds supported bounds' using errcode='22023';end if;
 if p_document?'settlement' and p_document->'settlement'<>'null'::jsonb then row:=p_document->'settlement';perform public.command63_finance_keys(row,array['minor','state','source','adjustmentMinor','adjustmentSource']);n:=public.command63_finance_number(row->'minor',true);if n is not null then perform public.command63_finance_evidence(row->'state',row->'source');base:=public.command63_finance_number(coalesce(row->'adjustmentMinor','0'::jsonb),false,true);perform public.command63_finance_text(row->'adjustmentSource',300,base<>0);if abs(seller_gross-refunds+adjustments-fees+base)>1000000000000 then raise exception 'Settlement exceeds supported bounds' using errcode='22023';end if;end if;end if;
 if p_document?'provenance' and p_document->'provenance'<>'null'::jsonb then row:=p_document->'provenance';perform public.command63_finance_keys(row,array['notes','reconciliationReference']);perform public.command63_finance_text(row->'notes',1000,false);perform public.command63_finance_text(row->'reconciliationReference',300,false);end if;
end;$function$;

CREATE OR REPLACE FUNCTION public.command63_financial_batch(p_order_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
 SET statement_timeout TO '5s'
AS $function$
declare actor uuid:=public.command63_finance_actor();r record;rows jsonb:='[]';used integer:=0;count integer:=0;truncated boolean:=false;item jsonb;
begin
 if p_order_ids is null or cardinality(p_order_ids)>50 or cardinality(p_order_ids)<>(select count(distinct id) from unnest(p_order_ids) id) then raise exception 'Use at most 50 distinct loaded order identities' using errcode='22023';end if;
 for r in select f.*,public.command63_finance_basis(o) as current_basis from public.order_financial_records f join public.orders o on o.id=f.order_id where f.order_id=any(p_order_ids) and o.sales_channel<>'WEBSITE' order by f.order_id loop
  item:=jsonb_build_object('orderId',r.order_id,'revision',r.revision,'document',r.document,'orderBasisMatches',r.order_basis_hash=r.current_basis,'updatedAt',r.updated_at);used:=used+octet_length(convert_to(item::text,'UTF8'));
  if used>196608 then truncated:=true;exit;end if;rows:=rows||jsonb_build_array(item);count:=count+1;
 end loop;
 return jsonb_build_object('version',1,'records',rows,'requested',cardinality(p_order_ids),'returned',count,'complete',not truncated,'truncated',truncated,'scope','Only the explicitly supplied loaded order identities. Missing financial records remain unknown.');
end;$function$;

CREATE OR REPLACE FUNCTION public.command63_financial_read(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
 SET lock_timeout TO '1s'
 SET statement_timeout TO '5s'
AS $function$
declare actor uuid:=public.command63_finance_actor();o public.orders%rowtype;f public.order_financial_records%rowtype;basis text;history jsonb;
begin
 select * into o from public.orders where id=p_order_id;if not found or o.sales_channel='WEBSITE' then raise exception 'Existing external order required' using errcode='22023';end if;basis:=public.command63_finance_basis(o);
 select * into f from public.order_financial_records where order_id=p_order_id;
 select coalesce(jsonb_agg(x order by x.revision desc),'[]'::jsonb) into history from(select revision,actor_id,recorded_at from public.order_financial_revisions where order_id=p_order_id order by revision desc limit 10)x;
 return jsonb_build_object('version',1,'orderId',p_order_id,'orderBasisHash',basis,'revision',coalesce(f.revision,0),'document',f.document,'savedOrderBasisHash',f.order_basis_hash,'orderBasisMatches',f.order_basis_hash is null or f.order_basis_hash=basis,'updatedAt',f.updated_at,'updatedBy',f.updated_by,'history',history);
end;$function$;

CREATE OR REPLACE FUNCTION public.command63_financial_save(p_order_id uuid, p_expected_revision bigint, p_order_basis_hash text, p_request_id uuid, p_document jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
 SET lock_timeout TO '1s'
 SET statement_timeout TO '5s'
AS $function$
declare actor uuid:=public.command63_finance_actor();o public.orders%rowtype;f public.order_financial_records%rowtype;r public.order_financial_requests%rowtype;digest text;basis text;v_result jsonb;prior jsonb;inserted integer;next_revision bigint;
begin
 if p_request_id is null or p_order_id is null or p_expected_revision is null or p_expected_revision not between 0 and 999999999 or p_order_basis_hash is null or p_order_basis_hash!~'^[a-f0-9]{64}$' or p_document is null or octet_length(convert_to(p_document::text,'UTF8'))>32768 then raise exception 'Invalid financial mutation identity or bounds' using errcode='22023';end if;
 digest:=encode(sha256(convert_to(jsonb_build_object('order',p_order_id,'expectedRevision',p_expected_revision,'orderBasis',p_order_basis_hash,'document',p_document)::text,'UTF8')),'hex');
 insert into public.order_financial_requests(actor_id,request_id,order_id,payload_hash) values(actor,p_request_id,p_order_id,digest) on conflict(actor_id,request_id) do nothing;get diagnostics inserted=row_count;
 if inserted=0 then
  select * into r from public.order_financial_requests where actor_id=actor and request_id=p_request_id for update;
  if r.payload_hash is distinct from digest or r.order_id is distinct from p_order_id then raise exception 'Financial request identity was reused with different inputs' using errcode='22023';end if;
  if r.result is null then raise exception 'Financial request outcome is unresolved' using errcode='40001';end if;
  return r.result||jsonb_build_object('idempotent',true);
 end if;
 select * into o from public.orders where id=p_order_id for share;
 if not found or o.sales_channel='WEBSITE' then raise exception 'Existing external order required' using errcode='22023';end if;
 perform public.command63_finance_validate(p_document,o.items,o.currency);basis:=public.command63_finance_basis(o);
 select * into f from public.order_financial_records where order_id=p_order_id for update;
 if basis<>p_order_basis_hash then v_result:=jsonb_build_object('version',1,'outcome','order-conflict','orderId',p_order_id,'requestId',p_request_id,'revision',coalesce(f.revision,0),'orderBasisHash',basis);
 elsif f.order_id is not null and f.revision<>p_expected_revision or f.order_id is null and p_expected_revision<>0 then v_result:=jsonb_build_object('version',1,'outcome','conflict','orderId',p_order_id,'requestId',p_request_id,'revision',coalesce(f.revision,0),'orderBasisHash',basis);
 elsif f.order_id is not null and f.document=p_document and f.order_basis_hash=basis then v_result:=jsonb_build_object('version',1,'outcome','committed','unchanged',true,'orderId',p_order_id,'requestId',p_request_id,'revision',f.revision,'orderBasisHash',basis,'updatedAt',f.updated_at,'updatedBy',actor,'document',f.document);
 else
  if f.order_id is null then
   insert into public.order_financial_records(order_id,revision,document,order_basis_hash,updated_by) values(p_order_id,1,p_document,basis,actor) on conflict(order_id) do nothing returning * into f;get diagnostics inserted=row_count;
   if inserted=0 then select * into f from public.order_financial_records where order_id=p_order_id for update;v_result:=jsonb_build_object('version',1,'outcome','conflict','orderId',p_order_id,'requestId',p_request_id,'revision',f.revision,'orderBasisHash',basis);else next_revision:=1;prior:=null;end if;
  else
   prior:=f.document;next_revision:=f.revision+1;
   update public.order_financial_records set revision=next_revision,document=p_document,order_basis_hash=basis,updated_at=clock_timestamp(),updated_by=actor where order_id=p_order_id and revision=p_expected_revision returning * into f;
   if not found then raise exception 'Financial revision changed' using errcode='40001';end if;
  end if;
  if v_result is null then
   insert into public.order_financial_revisions(order_id,revision,actor_id,request_id,before_document,after_document,order_basis_hash) values(p_order_id,next_revision,actor,p_request_id,prior,p_document,basis);
   v_result:=jsonb_build_object('version',1,'outcome','committed','unchanged',false,'orderId',p_order_id,'requestId',p_request_id,'revision',next_revision,'orderBasisHash',basis,'updatedAt',f.updated_at,'updatedBy',actor,'document',p_document);
  end if;
 end if;
 update public.order_financial_requests set result=v_result||jsonb_build_object('idempotent',false) where actor_id=actor and request_id=p_request_id;
 return v_result||jsonb_build_object('idempotent',false);
end;$function$;

CREATE OR REPLACE FUNCTION public.command63_financial_status(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
declare actor uuid:=public.command63_finance_actor();r public.order_financial_requests%rowtype;
begin select * into r from public.order_financial_requests where actor_id=actor and request_id=p_request_id;
 if not found or r.result is null then return jsonb_build_object('version',1,'outcome','unresolved','requestId',p_request_id);end if;
 return r.result||jsonb_build_object('idempotent',true);end;$function$;

CREATE OR REPLACE FUNCTION public.aftercare_state(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; a public.order_aftercare%rowtype; dispatch_at timestamptz; due date; eligible boolean; blocked text; saved_email text; suppressed boolean; route text; ledger jsonb;
begin
 select * into o from public.orders where id=p_order_id;
 if not found then raise exception 'Order unavailable' using errcode='22023';end if;
 select * into a from public.order_aftercare where order_id=o.id;
 dispatch_at:=public.aftercare_dispatch_at(o.status_history);
 due:=coalesce(a.due_date,(dispatch_at at time zone 'Europe/London')::date+7);
 eligible:=o.status in ('dispatched','completed') and dispatch_at is not null and dispatch_at<=clock_timestamp()
  and o.payment_status in ('paid','partially_refunded') and o.paid_at is not null and o.fulfillment_applied_at is not null
  and (o.payment_status<>'partially_refunded' or exists(select 1 from public.partial_refund_reviews where order_id=o.id and refunded_pence=o.refunded_pence and refund_at=o.latest_refund_at));
 if not coalesce(eligible,false) then blocked:='A paid, dispatched order with a valid recorded dispatch date and current refund review is required.';end if;
 if a.order_id is not null and a.dispatch_at is distinct from dispatch_at then eligible:=false;blocked:='Dispatch history changed. Review the existing aftercare record; a second follow-up is not created.';end if;
 saved_email:=lower(btrim(coalesce(o.customer->>'email','')));
 suppressed:=exists(select 1 from public.aftercare_email_suppressions where aftercare_email_suppressions.email=saved_email)
  or coalesce(o.customer->>'aftercare_opt_out','false')='true' or coalesce(o.customer->>'do_not_contact','false')='true';
 route:=case when o.sales_channel in ('WEBSITE','DIRECT') and public.external_dispatch_recipient_allowed(saved_email,o.sales_channel) and not suppressed then 'email' else 'manual' end;
 if suppressed then blocked:='Aftercare email suppressed: respect the customer contact preference.';
 elsif route='manual' then blocked:=case when o.sales_channel='EBAY' then 'Copy an order-related support draft and send manually through the eBay order conversation. Aftercare relay sending is disabled.' else 'No verified direct email route. Handle through the existing order communication channel.' end;end if;
 select coalesce(jsonb_agg(to_jsonb(d) order by created_at,id),'[]'::jsonb) into ledger from public.order_email_deliveries d where order_id=o.id and kind='aftercare';
 -- eBay/other drafts expose no underlying buyer email or delivery address.
 if o.sales_channel not in ('WEBSITE','DIRECT') then o.customer:=o.customer-'email';o.delivery:='{}'::jsonb;end if;
 return jsonb_build_object('order',to_jsonb(o),'followup',case when a.order_id is null then null else to_jsonb(a) end,'dispatchAt',dispatch_at,'defaultDue',(dispatch_at at time zone 'Europe/London')::date+7,'dueDate',due,'eligible',coalesce(eligible,false),'route',route,'suppressed',suppressed,'policy','order-support-v1/manual-ebay-v1','notice',blocked,'deliveries',ledger);
end;
$function$;

CREATE OR REPLACE FUNCTION public.apply_order_inventory(p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare item jsonb; part jsonb; wanted record; quantity_needed bigint;
 required_stock jsonb:='{}'::jsonb; component_id text; item_quantity bigint;
begin
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'quantity') !~ '^[1-9][0-9]*$' then
   raise exception 'Invalid saved Order quantity' using errcode='22023'; end if;
  item_quantity:=(item->>'quantity')::bigint;
  if item->>'type' in ('kit','assembly') then
   if jsonb_typeof(item->'snapshot'->'stockRequirements')<>'array' then
    raise exception 'Kit has no validated physical requirements' using errcode='22023'; end if;
   for part in select value from jsonb_array_elements(item->'snapshot'->'stockRequirements') loop
    component_id:=part->>'componentId';
    if component_id is null or (part->>'quantity') !~ '^[1-9][0-9]*$' then
     raise exception 'Invalid kit physical requirement' using errcode='22023'; end if;
    quantity_needed:=(part->>'quantity')::bigint*item_quantity;
    required_stock:=jsonb_set(required_stock,array[component_id],
     to_jsonb(coalesce((required_stock->>component_id)::bigint,0)+quantity_needed),true);
   end loop;
  elsif item->>'type'='component' then
   component_id:=item->>'productId';
   if component_id is null or component_id='' then
    raise exception 'Component identity is missing from Order' using errcode='22023'; end if;
   required_stock:=jsonb_set(required_stock,array[component_id],
    to_jsonb(coalesce((required_stock->>component_id)::bigint,0)+item_quantity),true);
  else
   raise exception 'Unsupported Order item' using errcode='22023';
  end if;
 end loop;
 if required_stock='{}'::jsonb then raise exception 'Order has no physical requirements' using errcode='22023'; end if;
 -- Conditional UPDATE locks each stock row. A failed update rolls back every prior deduction.
 for wanted in select key,value from jsonb_each_text(required_stock) order by key loop
  update public.inventory inventory_row set quantity=inventory_row.quantity-wanted.value::bigint,updated_at=now()
   where inventory_row.component_id=wanted.key and inventory_row.quantity>=wanted.value::bigint;
  if not found then raise exception 'Insufficient stock for paid Order; manual fulfilment required' using errcode='22023'; end if;
 end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.assert_store_accepting_orders()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare current_state jsonb;
begin
 -- Serialize DB initiation against manual configuration changes. Existing
 -- payment/webhook/fulfilment paths do not call this initiation-only guard.
 perform 1 from public.site_operations where id for share;
 current_state:=public.get_site_operations();
 if current_state is null then raise exception 'Store availability is temporarily unavailable' using errcode='P0001'; end if;
 if current_state->'store'->>'state'<>'OPEN' then
  raise exception 'Orders are temporarily paused' using errcode='P0001',detail=current_state->'store'->>'customer_message';
 end if;
 return current_state;
end $function$;

CREATE OR REPLACE FUNCTION public.create_external_order(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 actor uuid:=auth.uid(); existing public.orders%rowtype; saved public.orders%rowtype;
 request_uuid uuid; request_hash_value text; channel text; external_ref text; sale_date date;
 customer_name text; notes text; postage bigint; subtotal bigint:=0;
 input_item jsonb; stored_items jsonb:='[]'::jsonb; parts jsonb; requirements jsonb;
 component public.components%rowtype; assembly public.assemblies%rowtype;
 product_id text; item_type text; item_quantity int; unit_price bigint; product_name text; product_sku text; snapshot jsonb;
begin
 if actor is null or not exists(select 1 from public.admin_members where user_id=actor) then
  raise exception 'Admin membership required' using errcode='42501';
 end if;
 if p_request is null or jsonb_typeof(p_request)<>'object' or length(p_request::text)>30000
  or jsonb_typeof(p_request->'items') is distinct from 'array'
  or jsonb_array_length(p_request->'items') not between 1 and 10 then
  raise exception 'Add between 1 and 10 existing products' using errcode='22023';
 end if;
 if coalesce(p_request->>'requestId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  raise exception 'Invalid external order request identifier' using errcode='22023';
 end if;
 request_uuid:=(p_request->>'requestId')::uuid;
 channel:=p_request->>'channel';external_ref:=btrim(p_request->>'externalReference');
 if channel is null or channel not in ('EBAY','DIRECT','OTHER') or coalesce(length(external_ref),0) not between 1 and 150 then
  raise exception 'Choose an external sales channel and enter its order reference' using errcode='22023';
 end if;
 if coalesce(p_request->>'orderDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
  raise exception 'Enter the order date' using errcode='22023';
 end if;
 sale_date:=(p_request->>'orderDate')::date;
 if sale_date not between date '1900-01-01' and date '2100-12-31' then raise exception 'Invalid order date' using errcode='22023';end if;
 customer_name:=btrim(p_request->>'customerName');notes:=coalesce(btrim(p_request->>'notes'),'');
 if coalesce(length(customer_name),0) not between 1 and 150 or length(notes)>2000
  or coalesce(p_request->>'postagePence','') !~ '^[0-9]{1,10}$' then
  raise exception 'Enter the customer name and valid postage in pence' using errcode='22023';
 end if;
 postage:=(p_request->>'postagePence')::bigint;
 if postage>1000000000 then raise exception 'Postage exceeds the supported range' using errcode='22023';end if;
 request_hash_value:=md5((p_request-'requestId')::text);
 -- Serialize both retry identities before any catalogue reads or stock movements.
 perform pg_advisory_xact_lock(hashtextextended('external-request:'||request_uuid::text,0));
 perform pg_advisory_xact_lock(hashtextextended('external-sale:'||channel||':'||lower(external_ref),0));
 select * into existing from public.orders where request_id=request_uuid;
 if found then
  if existing.sales_channel<>channel or existing.external_reference_key<>lower(external_ref) or existing.request_hash<>request_hash_value then
   raise exception 'Order request identifier already used with different details' using errcode='23505';
  end if;
  return jsonb_build_object('id',existing.id,'reference',existing.reference,'duplicate',true);
 end if;
 select * into existing from public.orders where sales_channel=channel and external_reference_key=lower(external_ref);
 if found then raise exception 'An order already exists for this sales channel and external reference: %',existing.reference using errcode='23505';end if;
 for input_item in select value from jsonb_array_elements(p_request->'items') loop
  item_type:=input_item->>'type';product_id:=input_item->>'productId';
  if item_type is null or item_type not in ('component','assembly') or coalesce(length(product_id),0) not between 1 and 120
   or coalesce(input_item->>'quantity','') !~ '^[1-9][0-9]?$'
   or coalesce(input_item->>'unitPricePence','') !~ '^[0-9]{1,10}$' then
   raise exception 'Choose an existing product, quantity 1–99 and a valid agreed unit price' using errcode='22023';
  end if;
  item_quantity:=(input_item->>'quantity')::int;unit_price:=(input_item->>'unitPricePence')::bigint;
  if unit_price>1000000000 then raise exception 'Unit price exceeds the supported range' using errcode='22023';end if;
  if item_type='component' then
   select * into component from public.components where id=product_id and active and individually for share;
   if not found then raise exception 'Selected product is unavailable' using errcode='22023';end if;
   product_name:=coalesce(nullif(component.product_content->>'title',''),component.name);product_sku:=component.sku;
   snapshot:=jsonb_build_object('componentId',component.id,'sku',component.sku,'name',product_name,
    'manufacturer',component.manufacturer,'specification',component.specs,'description',component.description);
  else
   select * into assembly from public.assemblies where id=product_id and active for share;
   if not found then raise exception 'Selected assembly is unavailable' using errcode='22023';end if;
   -- Fixed BOM only: customer-configured kits are never inferred from a default.
   if assembly.kind='wiring-kit' then raise exception 'Configured wiring kits require their saved configuration and are not supported by manual External Orders V1' using errcode='22023';end if;
   perform 1 from public.assembly_bom where assembly_id=product_id order by component_id for share;
   perform 1 from public.components c join public.assembly_bom b on b.component_id=c.id where b.assembly_id=product_id order by c.id for share of c;
   if not exists(select 1 from public.assembly_bom where assembly_id=product_id)
    or exists(select 1 from public.assembly_bom b join public.components c on c.id=b.component_id where b.assembly_id=product_id and not c.active) then
    raise exception 'Assembly has no available fixed BOM' using errcode='22023';end if;
   select jsonb_agg(jsonb_build_object('componentId',b.component_id,'quantity',b.quantity) order by b.component_id),
    jsonb_agg(jsonb_build_object('componentId',b.component_id,'sku',c.sku,'name',c.name,'quantity',b.quantity) order by b.component_id)
    into requirements,parts from public.assembly_bom b join public.components c on c.id=b.component_id where b.assembly_id=product_id;
   product_name:=assembly.name;product_sku:=assembly.sku;
   snapshot:=jsonb_build_object('assemblyId',assembly.id,'sku',assembly.sku,'name',assembly.name,'stockRequirements',requirements,'components',parts);
  end if;
  subtotal:=subtotal+unit_price*item_quantity;
  stored_items:=stored_items||jsonb_build_array(jsonb_build_object('type',item_type,'productId',product_id,'sku',product_sku,
   'name',product_name,'quantity',item_quantity,'unitPrice',unit_price,'lineTotal',unit_price*item_quantity,'currency','GBP','snapshot',snapshot));
 end loop;
 if subtotal+postage>1000000000 then raise exception 'Order total exceeds the supported range' using errcode='22023';end if;
 insert into public.orders(request_id,request_hash,sales_channel,external_reference,order_date,internal_notes,
  subtotal_pence,delivery_pence,total_pence,customer,delivery,items,payment_status,paid_at,fulfillment_applied_at,
  confirmation_email_status,status_history)
 values(request_uuid,request_hash_value,channel,external_ref,sale_date,notes,subtotal,postage,subtotal+postage,
  jsonb_build_object('name',customer_name),'{}'::jsonb,stored_items,'paid',now(),now(),'legacy',
  jsonb_build_array(jsonb_build_object('status','pending','at',now(),'source','admin','actor',actor))) returning * into saved;
 perform public.apply_order_inventory(stored_items);
 return jsonb_build_object('id',saved.id,'reference',saved.reference,'duplicate',false);
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_guest_kit_order(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  order_data public.orders%rowtype;
  kit public.kit_definitions%rowtype;
  assembly public.assemblies%rowtype;
  input_item jsonb; snapshot jsonb; choice jsonb; part jsonb; requirement jsonb;
  component public.components%rowtype;
  item_index int; role_index int; role_name text; selected_id text;
  physical_quantity int; unit_price bigint; contribution bigint;
  baseline_price bigint; base_id text; expected_price bigint; subtotal bigint:=0;
  option_group jsonb; option_value jsonb; mapping_id text;
  saved_mapping boolean;
  expected_stock jsonb; supplied_stock jsonb;
  expected_lines jsonb; line jsonb; line_key text; line_price bigint;
  customer_name text; customer_email text; delivery_line text; postcode text; country text;
  safe_customer jsonb; safe_delivery jsonb; stored_items jsonb:='[]'::jsonb;
  request_uuid uuid; request_hash_value text;
  price_parts jsonb; shipping_price bigint; shipping_threshold bigint;
  part_stock bigint;
begin
 perform public.assert_store_accepting_orders();
 if p_request is null or jsonb_typeof(p_request)<>'object' or length(p_request::text)>250000
    or jsonb_typeof(p_request->'items')<>'array' or jsonb_array_length(p_request->'items') not between 1 and 10 then
  raise exception 'Order must contain between 1 and 10 items' using errcode='22023';
 end if;
 if (p_request->>'requestId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  raise exception 'Invalid order request identifier' using errcode='22023';
 end if;
 request_uuid:=(p_request->>'requestId')::uuid;
 request_hash_value:=md5((p_request-'requestId')::text);
 select * into order_data from public.orders where request_id=request_uuid;
 if found then
  if order_data.request_hash<>request_hash_value then raise exception 'Order request identifier already used' using errcode='22023'; end if;
  return jsonb_build_object('id',order_data.id,'reference',order_data.reference,'totalPence',order_data.total_pence,'paymentStatus',order_data.payment_status);
 end if;
 customer_name:=btrim(p_request->'customer'->>'name');customer_email:=btrim(p_request->'customer'->>'email');
 delivery_line:=btrim(p_request->'delivery'->>'line1');postcode:=btrim(p_request->'delivery'->>'postcode');country:=btrim(p_request->'delivery'->>'country');
 if p_request->>'checkoutMode'='stripe' then
  safe_customer:='{}'::jsonb;safe_delivery:=jsonb_build_object('country','GB');
 elsif coalesce(length(customer_name),0) not between 1 and 150 or coalesce(length(customer_email),0) not between 3 and 254
    or customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coalesce(length(delivery_line),0) not between 1 and 200 or coalesce(length(postcode),0) not between 1 and 32
    or coalesce(length(country),0) not between 1 and 100 then
  raise exception 'Customer name, email and delivery address are required' using errcode='22023';
 else
  safe_customer:=jsonb_build_object('name',customer_name,'email',customer_email);
  safe_delivery:=jsonb_build_object('line1',delivery_line,'postcode',postcode,'country',country);
 end if;
 for item_index in 0..jsonb_array_length(p_request->'items')-1 loop
  input_item:=p_request->'items'->item_index;snapshot:=input_item->'record';choice:=snapshot->'configuration';
  if input_item->>'product'='component' then
   if (input_item->>'quantity') !~ '^[1-9][0-9]?$' or (input_item->>'quantity')::int>99
      or coalesce(length(input_item->>'sku'),0) not between 1 and 80 then
    raise exception 'Invalid Component selection or quantity' using errcode='22023'; end if;
   select * into component from public.components
    where sku=input_item->>'sku' and active and individually and sale_price is not null and sale_price>0 for share;
   if not found then raise exception 'Selected Component is unavailable' using errcode='22023'; end if;
   select quantity into part_stock from public.inventory where component_id=component.id;
  if part_stock is null or part_stock<(input_item->>'quantity')::int then
    raise exception 'Selected Component stock is unavailable' using errcode='22023'; end if;
   unit_price:=component.sale_price;
   subtotal:=subtotal+unit_price*(input_item->>'quantity')::int;
   stored_items:=stored_items || jsonb_build_array(jsonb_build_object('type','component',
    'productId',component.id,'sku',component.sku,'name',component.name,
    'quantity',(input_item->>'quantity')::int,'unitPrice',unit_price,
    'lineTotal',unit_price*(input_item->>'quantity')::int,'currency','GBP',
    'snapshot',jsonb_build_object('id',component.id,'sku',component.sku,'name',component.name,
      'manufacturer',component.manufacturer,'specification',component.specs,'salePrice',unit_price)));
   continue;
  end if;
  if input_item->>'product'<>'les-paul' or jsonb_typeof(snapshot)<>'object' or jsonb_typeof(choice)<>'object'
    or snapshot->>'kitType'<>'les-paul' or snapshot->>'schemaVersion'<>'3'
    or jsonb_typeof(snapshot->'components')<>'array' or jsonb_array_length(snapshot->'components')<>6
    or jsonb_typeof(snapshot->'pricing'->'lines')<>'array' or jsonb_array_length(snapshot->'pricing'->'lines')<>9
    or jsonb_typeof(snapshot->'stockRequirements')<>'array'
    or jsonb_typeof(snapshot->'specification')<>'object'
    or (input_item->>'quantity') !~ '^[1-9][0-9]?$' or (input_item->>'quantity')::int>99 then
   raise exception 'Malformed configured kit snapshot' using errcode='22023';
  end if;
  select * into kit from public.kit_definitions where assembly_id=snapshot->>'kitDefinitionId' and family='les-paul' for share;
  select * into assembly from public.assemblies where id=kit.assembly_id for share;
  if kit.assembly_id is null or not (assembly.active and kit.builder_enabled) or snapshot->>'kitName'<>assembly.name
    or snapshot->'pricing'->>'currency'<>'GBP' then raise exception 'Kit is unavailable' using errcode='22023'; end if;
  if choice->>'wiring' not in ('modern','50s','60s') or choice->>'shaft' not in ('short','long')
    or choice->>'matching' not in ('standard','precision')
    or choice->>'caps' is null or choice->>'bleed' is null or choice->>'jack' is null or choice->>'selector' is null then
   raise exception 'Unsupported kit selection' using errcode='22023';
  end if;
  if choice->>'wiring'='50s' and choice->>'bleed'<>'none' then raise exception 'Treble bleed is unavailable with 50s wiring' using errcode='22023'; end if;
  for option_group in select value from jsonb_array_elements(kit.builder_options) loop
   if option_group->>'key' in ('pots','shaft') then
    select value into option_value from jsonb_array_elements(option_group->'values') where value->>'key'=choice->>(option_group->>'key') and value->>'enabled'='true';
    if option_value is null or option_group->>'enabled'<>'true' then raise exception 'Kit option is disabled' using errcode='22023'; end if;
   end if;
  end loop;
  select m->>'componentId' into base_id from jsonb_array_elements(kit.component_resolvers) r,
   lateral jsonb_array_elements(r->'mappings') m where r->>'key'='potentiometers'
   and m->'selection'->>'pots'=(select g->>'defaultValue' from jsonb_array_elements(kit.builder_options) g where g->>'key'='pots')
   and m->'selection'->>'shaft'=(select g->>'defaultValue' from jsonb_array_elements(kit.builder_options) g where g->>'key'='shaft') limit 1;
  select kit_price into baseline_price from public.components where id=base_id;
  if baseline_price is null then raise exception 'Kit baseline price is unavailable' using errcode='22023'; end if;
  price_parts:=jsonb_build_object('base',kit.base_price,'wiring',0,'shaft',0,'matching',nullif(kit.defaults->'configurationPricing'->'matching'->>(choice->>'matching'),'')::bigint);
  if price_parts->>'matching' is null or (price_parts->>'matching')::bigint<0 then raise exception 'Kit matching price is unavailable' using errcode='22023'; end if;
  for role_index in 0..5 loop
   requirement:=kit.defaults->'requirements'->role_index;
   role_name:=requirement->>'role';
   if role_name is distinct from (array['potentiometers','neckToneCapacitor','bridgeToneCapacitor','trebleBleeds','outputJack','selector'])[role_index+1]
      or (requirement->>'quantity') !~ '^[1-9][0-9]*$' then raise exception 'Invalid physical kit requirements' using errcode='22023'; end if;
   physical_quantity:=(requirement->>'quantity')::int;
   select value into part from jsonb_array_elements(snapshot->'components') where value->>'role'=role_name;
   if part is null or (select count(*) from jsonb_array_elements(snapshot->'components') where value->>'role'=role_name)<>1 then
    raise exception 'Incomplete physical kit configuration' using errcode='22023'; end if;
   if role_name='potentiometers' then
    select m->>'componentId' into mapping_id from jsonb_array_elements(kit.component_resolvers) r,
     lateral jsonb_array_elements(r->'mappings') m where r->>'key'='potentiometers'
     and m->'selection'->>'pots'=choice->>'pots' and m->'selection'->>'shaft'=choice->>'shaft' limit 1;
    saved_mapping:=found;
    selected_id:=part->>'componentId';
    if saved_mapping and mapping_id is distinct from selected_id then raise exception 'Potentiometer mapping does not match the kit' using errcode='22023'; end if;
   elsif role_name in ('neckToneCapacitor','bridgeToneCapacitor') then
    selected_id:=case when choice->>'caps'='mixed' then choice->>(case when role_name='neckToneCapacitor' then 'neckCap' else 'bridgeCap' end) else choice->>'caps' end;
   else
    selected_id:=choice->>(case role_name when 'trebleBleeds' then 'bleed' when 'outputJack' then 'jack' else 'selector' end);
    if selected_id='none' then selected_id:=null;physical_quantity:=0; end if;
   end if;
   if part->>'componentId' is distinct from selected_id or (part->>'quantity') !~ '^[0-9]+$'
     or (part->>'quantity')::int<>physical_quantity then raise exception 'Physical part or quantity differs from kit selection' using errcode='22023'; end if;
   if selected_id is not null then
    select * into component from public.components where id=selected_id and active and in_kits;
    if not found or not exists(select 1 from public.kit_permitted_components where assembly_id=kit.assembly_id and component_id=selected_id)
       or component.kit_price is null then raise exception 'Selected Component is unavailable' using errcode='22023'; end if;
    if component.category<>(case role_name when 'potentiometers' then 'potentiometers' when 'neckToneCapacitor' then 'capacitors' when 'bridgeToneCapacitor' then 'capacitors' when 'trebleBleeds' then 'treble-bleeds' when 'outputJack' then 'jacks' else 'switches' end) then
     raise exception 'Component category does not match its physical role' using errcode='22023'; end if;
    if role_name='potentiometers' and (component.manufacturer<>(choice->>'pots') or (component.specs->>'Shaft') !~* ('^' || (choice->>'shaft') || '( shaft)?$')
       or (component.specs->>'Resistance') !~* '^(500[[:space:]]*k(Ω|ohms?)?|500000[[:space:]]*(Ω|ohms?))$' or (component.specs->>'Taper') !~* 'audio|^a' or (component.specs->>'Type') !~* '^standard$') then
      raise exception 'Physical potentiometer does not match the selection' using errcode='22023'; end if;
    if role_name='potentiometers' and not saved_mapping and (select count(*) from public.components c join public.kit_permitted_components p on p.component_id=c.id and p.assembly_id=kit.assembly_id
      where c.active and c.in_kits and c.category='potentiometers' and c.manufacturer=choice->>'pots'
      and (c.specs->>'Shaft') ~* ('^' || (choice->>'shaft') || '( shaft)?$')
      and (c.specs->>'Resistance') ~* '^(500[[:space:]]*k(Ω|ohms?)?|500000[[:space:]]*(Ω|ohms?))$'
      and (c.specs->>'Taper') ~* 'audio|^a' and (c.specs->>'Type') ~* '^standard$')<>1 then
      raise exception 'Ambiguous physical potentiometer selection' using errcode='22023'; end if;
    if part->'component'->>'id'<>component.id or part->'component'->>'sku'<>component.sku
      or part->'component'->>'name'<>component.name or part->'component'->>'manufacturer'<>component.manufacturer
      or part->'component'->'specification'<>component.specs
      or part->'component'->>'kitPrice'<>component.kit_price::text then
     raise exception 'Component snapshot differs from current catalogue' using errcode='22023'; end if;
    unit_price:=component.kit_price;
   else unit_price:=null;end if;
   contribution:=case when physical_quantity=0 then 0 when role_name='potentiometers' then physical_quantity*(unit_price-baseline_price) else physical_quantity*unit_price end;
   if part->>'unitKitPrice' is distinct from unit_price::text or part->>'priceContribution' is distinct from contribution::text then
    raise exception 'Physical Component price was altered' using errcode='22023'; end if;
   price_parts:=price_parts || jsonb_build_object(role_name,contribution);
  end loop;
  -- Compare aggregate stock to the P06B snapshot. No stock is reserved or changed.
  select coalesce(jsonb_object_agg(component_id,quantity),'{}'::jsonb) into expected_stock from (
   select value->>'componentId' component_id,sum((value->>'quantity')::int) quantity
   from jsonb_array_elements(snapshot->'components') where value->>'componentId' is not null group by value->>'componentId'
  ) totals;
  select coalesce(jsonb_object_agg(component_id,quantity),'{}'::jsonb) into supplied_stock from (
   select value->>'componentId' component_id,sum((value->>'quantity')::int) quantity
   from jsonb_array_elements(snapshot->'stockRequirements') group by value->>'componentId'
  ) totals;
  if expected_stock<>supplied_stock or exists(select 1 from jsonb_array_elements(snapshot->'stockRequirements') v
    where v->>'componentId' is null or (v->>'quantity') !~ '^[1-9][0-9]*$') then
   raise exception 'Aggregate physical stock requirements are inconsistent' using errcode='22023'; end if;
  expected_lines:=jsonb_build_array('base','wiring','pots','shaft','matching','capacitors','bleed','jack','selector');
  expected_price:=kit.base_price;
  for role_index in 0..8 loop
   line:=snapshot->'pricing'->'lines'->role_index;line_key:=expected_lines->>role_index;
   line_price:=case line_key when 'pots' then (price_parts->>'potentiometers')::bigint
    when 'capacitors' then (price_parts->>'neckToneCapacitor')::bigint+(price_parts->>'bridgeToneCapacitor')::bigint
    when 'bleed' then (price_parts->>'trebleBleeds')::bigint
    when 'jack' then (price_parts->>'outputJack')::bigint
    when 'selector' then (price_parts->>'selector')::bigint
    else (price_parts->>line_key)::bigint end;
   if line->>'key'<>line_key or line->>'price' is distinct from line_price::text then raise exception 'Kit price breakdown differs from current prices' using errcode='22023'; end if;
   if line_key<>'base' then expected_price:=expected_price+line_price; end if;
  end loop;
  if snapshot->'pricing'->>'total' is distinct from expected_price::text or snapshot->'pricing'->>'basePrice' is distinct from kit.base_price::text
    or expected_price<0 or expected_price>1000000000 then raise exception 'Kit total differs from validated price' using errcode='22023'; end if;
  subtotal:=subtotal+expected_price*(input_item->>'quantity')::int;
  stored_items:=stored_items || jsonb_build_array(jsonb_build_object('type','kit','productId',assembly.id,'sku',assembly.sku,
    'name',assembly.name,'quantity',(input_item->>'quantity')::int,'unitPrice',expected_price,
    'lineTotal',expected_price*(input_item->>'quantity')::int,'currency','GBP','snapshot',snapshot));
 end loop;
 -- A forged request can repeat the same SKU on multiple lines; validate their combined stock.
 if exists(select 1 from (
   select value->>'productId' component_id,sum((value->>'quantity')::bigint) required
   from jsonb_array_elements(stored_items) where value->>'type'='component'
   group by value->>'productId'
  ) wanted left join public.inventory i on i.component_id=wanted.component_id
  where i.quantity is null or wanted.required>i.quantity) then
  raise exception 'Selected Component stock is unavailable' using errcode='22023'; end if;
 if subtotal>1000000000 then raise exception 'Order amount exceeds supported range' using errcode='22023'; end if;
 select standard_delivery_pence,free_delivery_threshold_pence into shipping_price,shipping_threshold
 from public.commerce_shipping shipping where shipping.country='GB';
 if shipping_price is null or shipping_threshold is null then raise exception 'UK shipping is unavailable' using errcode='22023'; end if;
 shipping_price:=case when subtotal>=shipping_threshold then 0 else shipping_price end;
 insert into public.orders(request_id,request_hash,subtotal_pence,delivery_pence,total_pence,customer,delivery,items,owner_user_id)
 values(request_uuid,request_hash_value,subtotal,shipping_price,subtotal+shipping_price,safe_customer,safe_delivery,stored_items,case when p_request->>'checkoutMode'='stripe' then nullif(p_request->>'ownerUserId','')::uuid else null end)
 returning * into order_data;
 return jsonb_build_object('id',order_data.id,'reference',order_data.reference,'totalPence',order_data.total_pence,'paymentStatus',order_data.payment_status);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_site_operations()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('server_time',statement_timestamp(),'store',jsonb_build_object(
 'desired_state',o.desired_state,'state',case when o.desired_state='ORDERS_PAUSED' and o.pause_from<=statement_timestamp() and (o.resume_at is null or statement_timestamp()<o.resume_at) then 'ORDERS_PAUSED' else 'OPEN' end,
 'customer_title',o.customer_title,'customer_message',o.customer_message,'pause_from',o.pause_from,'resume_at',o.resume_at,'updated_at',o.updated_at))
 from public.site_operations o where o.id;
$function$;

CREATE OR REPLACE FUNCTION public.aftercare_dispatch_at(p_history jsonb)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare e jsonb; candidate timestamptz; result timestamptz;
begin
 for e in select value from jsonb_array_elements(p_history) loop
  if e->>'status'='dispatched' and e->>'event_id' is not null and coalesce(e->>'type','')<>'fulfilment_correction' then
   begin
    if e->>'at' ~ '^\d{4}-\d{2}-\d{2}[T ][0-9:.]+(Z|[+-]\d{2}:\d{2})$' then
     candidate:=(e->>'at')::timestamptz;
     if isfinite(candidate) and (result is null or candidate>result) then result:=candidate;end if;
    end if;
   exception when invalid_datetime_format or datetime_field_overflow then null;
   end;
  end if;
 end loop;
 return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.external_dispatch_recipient_allowed(p_email text, p_channel text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select coalesce(length(p_email)<=254
  and p_email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$'
  and case when lower(split_part(p_email,'@',2))='members.ebay.com' then p_channel='EBAY'
   else lower(split_part(p_email,'@',2)) !~ '(members[.-]ebay|(^|[.])ebay[.])' end,false)
$function$;

CREATE OR REPLACE FUNCTION public.fulfil_paid_stripe_checkout(p_event_id text, p_event_type text, p_order_id uuid, p_reference text, p_session_id text, p_payment_intent_id text, p_amount bigint, p_currency text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 order_row public.orders%rowtype;
 item jsonb; part jsonb; wanted record; quantity_needed bigint;
 required_stock jsonb:='{}'::jsonb; component_id text; item_quantity bigint;
begin
 if p_event_id !~ '^evt_[A-Za-z0-9]{8,}$'
   or p_event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded')
   or p_session_id !~ '^cs_live_[A-Za-z0-9]{8,}$'
   or p_payment_intent_id !~ '^pi_[A-Za-z0-9]{8,}$'
   or p_reference !~ '^AI-[0-9]+$' or p_currency<>'gbp'
   or p_amount is null or p_amount<=0 then
  raise exception 'Invalid verified payment reference' using errcode='22023';
 end if;
 select * into order_row from public.orders where id=p_order_id for update;
 if not found or order_row.reference<>p_reference or order_row.stripe_checkout_session_id<>p_session_id
    or order_row.total_pence<>p_amount or order_row.currency<>'GBP' then
  raise exception 'Verified payment differs from its Order' using errcode='22023';
 end if;
 if order_row.payment_status in ('paid','partially_refunded','refunded') then
  if order_row.stripe_payment_intent_id is distinct from p_payment_intent_id
    or order_row.fulfillment_applied_at is null then
   raise exception 'Existing paid Order has different payment details' using errcode='22023';
  end if;
  insert into public.stripe_webhook_events(event_id,order_id,event_type)
    values(p_event_id,p_order_id,p_event_type) on conflict (event_id) do nothing;
  if (select order_id from public.stripe_webhook_events where event_id=p_event_id)<>p_order_id then
   raise exception 'Stripe event belongs to another Order' using errcode='22023'; end if;
  return 'already_paid';
 end if;
 if order_row.payment_status<>'unpaid' or order_row.status<>'pending'
    or exists(select 1 from public.stripe_webhook_events where event_id=p_event_id) then
  raise exception 'Stripe payment event cannot be processed' using errcode='22023'; end if;

 perform public.apply_order_inventory(order_row.items);
 update public.orders set payment_status='paid',stripe_payment_intent_id=p_payment_intent_id,
  paid_at=now(),fulfillment_applied_at=now(),updated_at=now() where id=p_order_id;
 insert into public.stripe_webhook_events(event_id,order_id,event_type)
  values(p_event_id,p_order_id,p_event_type);
 return 'paid';
end;
$function$;

CREATE OR REPLACE FUNCTION public.protect_automatic_email_eligibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if new.automatic_delivery_eligible is distinct from old.automatic_delivery_eligible then
  raise exception 'Email activation eligibility is immutable' using errcode='22023';
 end if;
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_automatic_email_eligibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare active boolean;
begin
 select enabled into active from public.transactional_email_activation where singleton=true for share;
 new.automatic_delivery_eligible := new.external_requested_by is null
  and exists(select 1 from public.orders where id=new.order_id and sales_channel='WEBSITE')
  and new.kind in ('in_production','ready_to_dispatch','dispatched','full_refund') and coalesce(active,false);
 return new;
end;
$function$;

set check_function_bodies=on;

CREATE TRIGGER protect_automatic_email_eligibility_before_update BEFORE UPDATE OF automatic_delivery_eligible ON public.order_email_deliveries FOR EACH ROW EXECUTE FUNCTION protect_automatic_email_eligibility();

CREATE TRIGGER set_automatic_email_eligibility_before_insert BEFORE INSERT ON public.order_email_deliveries FOR EACH ROW EXECUTE FUNCTION set_automatic_email_eligibility();

revoke all on public."admin_members" from public,anon,authenticated,service_role;

alter table public."admin_members" enable row level security;

grant SELECT on public."admin_members" to "authenticated";

grant SELECT on public."admin_members" to "service_role";

grant INSERT on public."admin_members" to "service_role";

grant UPDATE on public."admin_members" to "service_role";

grant DELETE on public."admin_members" to "service_role";

create policy "admin_members_self" on public."admin_members" as PERMISSIVE for SELECT to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));

revoke all on public."assemblies" from public,anon,authenticated,service_role;

alter table public."assemblies" enable row level security;

grant SELECT on public."assemblies" to "authenticated";

grant SELECT on public."assemblies" to "service_role";

grant INSERT on public."assemblies" to "authenticated";

grant INSERT on public."assemblies" to "service_role";

grant UPDATE on public."assemblies" to "authenticated";

grant UPDATE on public."assemblies" to "service_role";

grant DELETE on public."assemblies" to "authenticated";

grant DELETE on public."assemblies" to "service_role";

create policy "assemblies_admin_read" on public."assemblies" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

create policy "assemblies_admin_write" on public."assemblies" as PERMISSIVE for ALL to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid))))) with check ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

create policy "assemblies_public_read" on public."assemblies" as PERMISSIVE for SELECT to "anon","authenticated" using ((active AND (kind = 'wiring-kit'::text)));

revoke all on public."assembly_bom" from public,anon,authenticated,service_role;

alter table public."assembly_bom" enable row level security;

grant SELECT on public."assembly_bom" to "authenticated";

grant SELECT on public."assembly_bom" to "service_role";

grant INSERT on public."assembly_bom" to "authenticated";

grant INSERT on public."assembly_bom" to "service_role";

grant UPDATE on public."assembly_bom" to "authenticated";

grant UPDATE on public."assembly_bom" to "service_role";

grant DELETE on public."assembly_bom" to "authenticated";

grant DELETE on public."assembly_bom" to "service_role";

create policy "bom_admin" on public."assembly_bom" as PERMISSIVE for ALL to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid))))) with check ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

revoke all on public."commerce_shipping" from public,anon,authenticated,service_role;

alter table public."commerce_shipping" enable row level security;

grant SELECT on public."commerce_shipping" to "anon";

grant SELECT on public."commerce_shipping" to "authenticated";

grant SELECT on public."commerce_shipping" to "service_role";

grant INSERT on public."commerce_shipping" to "service_role";

grant UPDATE on public."commerce_shipping" to "service_role";

grant DELETE on public."commerce_shipping" to "service_role";

create policy "commerce_shipping_public_read" on public."commerce_shipping" as PERMISSIVE for SELECT to "anon","authenticated" using (true);

revoke all on public."component_internal" from public,anon,authenticated,service_role;

alter table public."component_internal" enable row level security;

grant SELECT on public."component_internal" to "authenticated";

grant SELECT on public."component_internal" to "service_role";

grant INSERT on public."component_internal" to "authenticated";

grant INSERT on public."component_internal" to "service_role";

grant UPDATE on public."component_internal" to "authenticated";

grant UPDATE on public."component_internal" to "service_role";

grant DELETE on public."component_internal" to "authenticated";

grant DELETE on public."component_internal" to "service_role";

create policy "component_internal_admin" on public."component_internal" as PERMISSIVE for ALL to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid))))) with check ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

revoke all on public."components" from public,anon,authenticated,service_role;

alter table public."components" enable row level security;

grant SELECT on public."components" to "authenticated";

grant SELECT on public."components" to "service_role";

grant INSERT on public."components" to "authenticated";

grant INSERT on public."components" to "service_role";

grant UPDATE on public."components" to "authenticated";

grant UPDATE on public."components" to "service_role";

grant DELETE on public."components" to "authenticated";

grant DELETE on public."components" to "service_role";

create policy "components_admin_delete" on public."components" as PERMISSIVE for DELETE to "authenticated" using (((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))) AND (NOT (EXISTS ( SELECT 1
   FROM assembly_bom b
  WHERE (b.component_id = components.id)))) AND (NOT (EXISTS ( SELECT 1
   FROM kit_permitted_components p
  WHERE (p.component_id = components.id)))) AND (NOT (EXISTS ( SELECT 1
   FROM kit_definitions k,
    LATERAL jsonb_each_text(COALESCE((k.defaults -> 'componentIds'::text), '{}'::jsonb)) v(key, value)
  WHERE (v.value = components.id)))) AND (NOT (EXISTS ( SELECT 1
   FROM kit_definitions k,
    LATERAL jsonb_array_elements(k.component_resolvers) r(value),
    LATERAL jsonb_array_elements((r.value -> 'mappings'::text)) m(value)
  WHERE ((m.value ->> 'componentId'::text) = components.id))))));

create policy "components_admin_insert" on public."components" as PERMISSIVE for INSERT to "authenticated" with check ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

create policy "components_admin_read" on public."components" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

create policy "components_admin_update" on public."components" as PERMISSIVE for UPDATE to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid))))) with check ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

create policy "components_public_read" on public."components" as PERMISSIVE for SELECT to "anon","authenticated" using ((active AND (individually OR in_kits)));

revoke all on public."inventory" from public,anon,authenticated,service_role;

alter table public."inventory" enable row level security;

grant SELECT on public."inventory" to "authenticated";

grant SELECT on public."inventory" to "service_role";

grant INSERT on public."inventory" to "authenticated";

grant INSERT on public."inventory" to "service_role";

grant UPDATE on public."inventory" to "authenticated";

grant UPDATE on public."inventory" to "service_role";

grant DELETE on public."inventory" to "authenticated";

grant DELETE on public."inventory" to "service_role";

create policy "inventory_admin" on public."inventory" as PERMISSIVE for ALL to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid))))) with check ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

create policy "inventory_public_availability" on public."inventory" as PERMISSIVE for SELECT to "anon","authenticated" using ((EXISTS ( SELECT 1
   FROM components c
  WHERE ((c.id = inventory.component_id) AND c.active AND (c.individually OR c.in_kits)))));

revoke all on public."kit_definitions" from public,anon,authenticated,service_role;

alter table public."kit_definitions" enable row level security;

grant SELECT on public."kit_definitions" to "authenticated";

grant SELECT on public."kit_definitions" to "service_role";

grant INSERT on public."kit_definitions" to "authenticated";

grant INSERT on public."kit_definitions" to "service_role";

grant UPDATE on public."kit_definitions" to "authenticated";

grant UPDATE on public."kit_definitions" to "service_role";

grant DELETE on public."kit_definitions" to "authenticated";

grant DELETE on public."kit_definitions" to "service_role";

create policy "kits_admin_read" on public."kit_definitions" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

create policy "kits_admin_write" on public."kit_definitions" as PERMISSIVE for ALL to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid))))) with check ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

create policy "kits_public_read" on public."kit_definitions" as PERMISSIVE for SELECT to "anon","authenticated" using (((show_on_wiring_kits OR builder_enabled) AND (EXISTS ( SELECT 1
   FROM assemblies a
  WHERE ((a.id = kit_definitions.assembly_id) AND a.active)))));

revoke all on public."kit_permitted_components" from public,anon,authenticated,service_role;

alter table public."kit_permitted_components" enable row level security;

grant SELECT on public."kit_permitted_components" to "anon";

grant SELECT on public."kit_permitted_components" to "authenticated";

grant SELECT on public."kit_permitted_components" to "service_role";

grant INSERT on public."kit_permitted_components" to "authenticated";

grant INSERT on public."kit_permitted_components" to "service_role";

grant UPDATE on public."kit_permitted_components" to "authenticated";

grant UPDATE on public."kit_permitted_components" to "service_role";

grant DELETE on public."kit_permitted_components" to "authenticated";

grant DELETE on public."kit_permitted_components" to "service_role";

create policy "permitted_admin_read" on public."kit_permitted_components" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

create policy "permitted_admin_write" on public."kit_permitted_components" as PERMISSIVE for ALL to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid))))) with check ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

create policy "permitted_public_read" on public."kit_permitted_components" as PERMISSIVE for SELECT to "anon","authenticated" using ((EXISTS ( SELECT 1
   FROM kit_definitions k
  WHERE (k.assembly_id = kit_permitted_components.assembly_id))));

revoke all on public."order_aftercare" from public,anon,authenticated,service_role;

alter table public."order_aftercare" enable row level security;

grant SELECT on public."order_aftercare" to "authenticated";

grant SELECT on public."order_aftercare" to "service_role";

grant INSERT on public."order_aftercare" to "service_role";

grant UPDATE on public."order_aftercare" to "service_role";

grant DELETE on public."order_aftercare" to "service_role";

create policy "aftercare_admin_read" on public."order_aftercare" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

revoke all on public."order_email_deliveries" from public,anon,authenticated,service_role;

alter table public."order_email_deliveries" enable row level security;

grant SELECT on public."order_email_deliveries" to "authenticated";

grant SELECT on public."order_email_deliveries" to "service_role";

grant INSERT on public."order_email_deliveries" to "service_role";

grant UPDATE on public."order_email_deliveries" to "service_role";

grant DELETE on public."order_email_deliveries" to "service_role";

create policy "admin_reads_order_email_deliveries" on public."order_email_deliveries" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

revoke all on public."order_financial_records" from public,anon,authenticated,service_role;

alter table public."order_financial_records" enable row level security;

grant SELECT on public."order_financial_records" to "authenticated";

create policy "order_financial_records_admin_read" on public."order_financial_records" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members m
  WHERE (m.user_id = ( SELECT auth.uid() AS uid)))));

revoke all on public."order_financial_requests" from public,anon,authenticated,service_role;

alter table public."order_financial_requests" enable row level security;

revoke all on public."order_financial_revisions" from public,anon,authenticated,service_role;

alter table public."order_financial_revisions" enable row level security;

grant SELECT on public."order_financial_revisions" to "authenticated";

create policy "order_financial_revisions_admin_read" on public."order_financial_revisions" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members m
  WHERE (m.user_id = ( SELECT auth.uid() AS uid)))));

revoke all on public."orders" from public,anon,authenticated,service_role;

alter table public."orders" enable row level security;

grant SELECT on public."orders" to "authenticated";

grant SELECT on public."orders" to "service_role";

grant INSERT on public."orders" to "service_role";

grant UPDATE on public."orders" to "service_role";

grant DELETE on public."orders" to "service_role";

create policy "orders_admin_read" on public."orders" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = ( SELECT auth.uid() AS uid)))));

revoke all on public."site_operations" from public,anon,authenticated,service_role;

alter table public."site_operations" enable row level security;

grant SELECT on public."site_operations" to "authenticated";

grant SELECT on public."site_operations" to "service_role";

create policy "operations_admin_read" on public."site_operations" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM admin_members
  WHERE (admin_members.user_id = auth.uid()))));

revoke all on public."transactional_email_activation" from public,anon,authenticated,service_role;

alter table public."transactional_email_activation" enable row level security;

grant SELECT on public."transactional_email_activation" to "service_role";

grant INSERT on public."transactional_email_activation" to "service_role";

grant UPDATE on public."transactional_email_activation" to "service_role";

grant DELETE on public."transactional_email_activation" to "service_role";

revoke all on function public."apply_order_inventory"(p_items jsonb) from public,anon,authenticated,service_role;

grant execute on function public."apply_order_inventory"(p_items jsonb) to service_role;

revoke all on function public."fulfil_paid_stripe_checkout"(p_event_id text, p_event_type text, p_order_id uuid, p_reference text, p_session_id text, p_payment_intent_id text, p_amount bigint, p_currency text) from public,anon,authenticated,service_role;

grant execute on function public."fulfil_paid_stripe_checkout"(p_event_id text, p_event_type text, p_order_id uuid, p_reference text, p_session_id text, p_payment_intent_id text, p_amount bigint, p_currency text) to service_role;

revoke all on function public."create_external_order"(p_request jsonb) from public,anon,authenticated,service_role;

grant execute on function public."create_external_order"(p_request jsonb) to authenticated;

grant execute on function public."create_external_order"(p_request jsonb) to service_role;

revoke all on function public."get_site_operations"() from public,anon,authenticated,service_role;

grant execute on function public."get_site_operations"() to anon;

grant execute on function public."get_site_operations"() to authenticated;

grant execute on function public."get_site_operations"() to service_role;

revoke all on function public."assert_store_accepting_orders"() from public,anon,authenticated,service_role;

grant execute on function public."assert_store_accepting_orders"() to service_role;

revoke all on function public."create_guest_kit_order"(p_request jsonb) from public,anon,authenticated,service_role;

grant execute on function public."create_guest_kit_order"(p_request jsonb) to service_role;

revoke all on function public."aftercare_state"(p_order_id uuid) from public,anon,authenticated,service_role;

grant execute on function public."aftercare_state"(p_order_id uuid) to service_role;

revoke all on function public."command63_finance_actor"() from public,anon,authenticated,service_role;

revoke all on function public."command63_finance_basis"(p_order orders) from public,anon,authenticated,service_role;

revoke all on function public."command63_financial_status"(p_request_id uuid) from public,anon,authenticated,service_role;

grant execute on function public."command63_financial_status"(p_request_id uuid) to authenticated;

revoke all on function public."command63_finance_text"(p_value jsonb, p_max integer, p_required boolean) from public,anon,authenticated,service_role;

revoke all on function public."command63_finance_keys"(p_object jsonb, p_allowed text[]) from public,anon,authenticated,service_role;

revoke all on function public."command63_finance_number"(p_value jsonb, p_nullable boolean, p_signed boolean, p_micro boolean) from public,anon,authenticated,service_role;

revoke all on function public."command63_finance_evidence"(p_state jsonb, p_source jsonb, p_excluded boolean) from public,anon,authenticated,service_role;

revoke all on function public."command63_finance_validate"(p_document jsonb, p_items jsonb, p_currency text) from public,anon,authenticated,service_role;

revoke all on function public."command63_financial_read"(p_order_id uuid) from public,anon,authenticated,service_role;

grant execute on function public."command63_financial_read"(p_order_id uuid) to authenticated;

revoke all on function public."command63_financial_batch"(p_order_ids uuid[]) from public,anon,authenticated,service_role;

grant execute on function public."command63_financial_batch"(p_order_ids uuid[]) to authenticated;

revoke all on function public."command63_financial_save"(p_order_id uuid, p_expected_revision bigint, p_order_basis_hash text, p_request_id uuid, p_document jsonb) from public,anon,authenticated,service_role;

grant execute on function public."command63_financial_save"(p_order_id uuid, p_expected_revision bigint, p_order_basis_hash text, p_request_id uuid, p_document jsonb) to authenticated;
