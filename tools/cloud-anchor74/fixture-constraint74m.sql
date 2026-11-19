-- All objects and values in this fixture are fictional.
CREATE TABLE public.anchor_m_acl_extra(x bigint);
GRANT SELECT ON public.anchor_m_acl_extra TO authenticated;
REVOKE SELECT ON public.anchor_m_acl_extra FROM authenticated;
CREATE SEQUENCE public.anchor_m_seq_extra;
GRANT USAGE ON SEQUENCE public.anchor_m_seq_extra TO authenticated;
REVOKE USAGE ON SEQUENCE public.anchor_m_seq_extra FROM authenticated;

CREATE TYPE public.anchor_m_colour AS ENUM ('ember', 'shade');
CREATE DOMAIN public.anchor_m_text AS text CHECK (length(VALUE) < 100);
CREATE FUNCTION public.anchor_m_first(int) RETURNS int LANGUAGE sql IMMUTABLE RETURN $1;
CREATE FUNCTION public.anchor_m_other(int) RETURNS int LANGUAGE sql IMMUTABLE RETURN $1 + 1;
CREATE TABLE public.anchor_m_ref(id int PRIMARY KEY, alternate int UNIQUE);
CREATE TABLE public.anchor_m_ref_alt(id int PRIMARY KEY);
CREATE TABLE "public"."anchor m; table" (
  id int, alt int, quantity int, caption text, colour public.anchor_m_colour, noted public.anchor_m_text,
  ext extensions.citext, span int4range,
  CONSTRAINT anchor_m_pk PRIMARY KEY (id,alt),
  CONSTRAINT anchor_m_unique UNIQUE (alt),
  CONSTRAINT anchor_m_fk FOREIGN KEY (quantity) REFERENCES public.anchor_m_ref (id)
    ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT anchor_m_exclude EXCLUDE USING gist (span WITH &&),
  CONSTRAINT "anchor m; check" CHECK (quantity > 0),
  CONSTRAINT anchor_m_function CHECK (public.anchor_m_first(quantity) >= 0),
  CONSTRAINT anchor_m_cast CHECK (quantity::bigint > 0::bigint),
  CONSTRAINT anchor_m_collate CHECK (caption COLLATE "C" <> 'fixture; private marker'),
  CONSTRAINT anchor_m_enum CHECK (colour <> 'ember'::public.anchor_m_colour),
  CONSTRAINT anchor_m_extension CHECK (ext OPERATOR(extensions.<>) 'x'::extensions.citext),
  CONSTRAINT anchor_m_domain CHECK (noted <> 'x'::public.anchor_m_text) NO INHERIT
);
ALTER TABLE "public"."anchor m; table"
  ADD CONSTRAINT anchor_m_no_validation CHECK (id > 0) NO INHERIT NOT VALID;
