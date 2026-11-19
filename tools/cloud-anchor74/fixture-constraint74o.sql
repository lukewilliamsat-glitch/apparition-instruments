-- Fictional CHECK expressions exercise escapes and extended protocol.
CREATE TABLE public.anchor_o_fictional (
  rule_text text, second_text text, qty int, range_nums int[],
  "odd""identifier" text,
  CONSTRAINT anchor_o_regex CHECK (rule_text ~ '^demo\d+$'),
  CONSTRAINT anchor_o_literal CHECK (rule_text <> E'synthetic\\anchor'),
  CONSTRAINT anchor_o_any CHECK (qty = ANY(ARRAY[11,22])),
  CONSTRAINT anchor_o_all CHECK (qty <> ALL(ARRAY[33,44])),
  CONSTRAINT anchor_o_nested CHECK ((CASE WHEN qty > 0 THEN (range_nums[1]) ELSE 0 END) >= 0),
  CONSTRAINT anchor_o_quoted CHECK ("odd""identifier" <> 'demo''quoted')
);
CREATE COLLATION public.anchor_o_collation FROM pg_catalog."C";
