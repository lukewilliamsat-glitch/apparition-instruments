CREATE EXTENSION citext WITH SCHEMA extensions;
CREATE TABLE auth.v2_parent (id bigint PRIMARY KEY);
CREATE UNLOGGED TABLE public.v2_item (
  id uuid DEFAULT extensions.uuid_generate_v4(),
  parent_id bigint REFERENCES auth.v2_parent(id),
  code extensions.citext DEFAULT 'synthetic',
  value integer DEFAULT 1 CONSTRAINT v2_positive CHECK (value > 0)
);
CREATE INDEX v2_idx ON public.v2_item(code) WHERE value > 0;
ALTER TABLE public.v2_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_policy ON public.v2_item FOR SELECT TO authenticated, anon USING (value > 0);
GRANT SELECT ON public.v2_item TO PUBLIC, authenticated, anon;
GRANT SELECT (value) ON public.v2_item TO authenticated WITH GRANT OPTION;
CREATE VIEW public.v2_view AS SELECT i.code FROM public.v2_item i JOIN auth.v2_parent p ON i.parent_id=p.id;
CREATE FUNCTION public.v2_fn(val extensions.citext) RETURNS extensions.citext LANGUAGE sql AS $$ SELECT $1 $$;
GRANT EXECUTE ON FUNCTION public.v2_fn(extensions.citext) TO anon, authenticated;
INSERT INTO auth.v2_parent VALUES (1);
INSERT INTO public.v2_item(parent_id) VALUES (1);
ALTER DATABASE postgres SET search_path TO public, extensions, auth;
