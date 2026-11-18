-- Synthetic only: force explicit ACLs that express the built-in defaults.
CREATE TABLE public.final_acl (id bigint);
GRANT SELECT ON public.final_acl TO authenticated;
REVOKE SELECT ON public.final_acl FROM authenticated;
CREATE SEQUENCE public.final_seq;
GRANT USAGE ON SEQUENCE public.final_seq TO authenticated;
REVOKE USAGE ON SEQUENCE public.final_seq FROM authenticated;
CREATE VIEW public.final_view AS SELECT id FROM public.final_acl;

CREATE TABLE auth.final_parent(id bigint PRIMARY KEY);
INSERT INTO auth.final_parent VALUES (1);
CREATE TABLE public.final_partition (
  bucket int, parent_id bigint,
  CONSTRAINT final_partition_check CHECK (bucket >= 0),
  CONSTRAINT final_partition_fk FOREIGN KEY(parent_id) REFERENCES auth.final_parent(id)
    DEFERRABLE INITIALLY DEFERRED
) PARTITION BY RANGE(bucket);
CREATE TABLE public.final_partition_a PARTITION OF public.final_partition FOR VALUES FROM (0) TO (100);
CREATE TABLE public.final_partition_b (LIKE public.final_partition INCLUDING CONSTRAINTS);
ALTER TABLE public.final_partition ATTACH PARTITION public.final_partition_b FOR VALUES FROM (100) TO (200);
INSERT INTO public.final_partition VALUES (1, 1), (101, 1);

CREATE TABLE public.final_inh (v integer, CONSTRAINT final_inh_check CHECK (v >= 0));
CREATE TABLE public.final_inh_child (CONSTRAINT final_local_check CHECK (v <> 42) NO INHERIT)
  INHERITS(public.final_inh);
INSERT INTO public.final_inh_child VALUES (1);

CREATE TABLE public.final_not_valid (id bigint, parent_id bigint, value int);
-- The historical row deliberately violates the two unvalidated constraints.
INSERT INTO public.final_not_valid VALUES (1, 999, -1);
ALTER TABLE public.final_not_valid ADD CONSTRAINT final_nv_check CHECK (value >= 0) NOT VALID;
ALTER TABLE public.final_not_valid ADD CONSTRAINT final_nv_fk FOREIGN KEY(parent_id)
  REFERENCES auth.final_parent(id) NOT VALID;
ALTER TABLE public.final_not_valid ADD CONSTRAINT final_nv_valid_rows CHECK (id > 0) NOT VALID;
