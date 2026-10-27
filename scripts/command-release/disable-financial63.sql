-- Exact non-destructive rollback. This never deletes recorded financial evidence.
-- Run only under the approved project/operation gate, in one transaction.
begin;
set local statement_timeout='5s';
set local lock_timeout='1s';
revoke execute on function public.command63_financial_save(uuid,bigint,text,uuid,jsonb) from authenticated;
commit;
