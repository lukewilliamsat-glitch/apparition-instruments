import {readFileSync} from 'node:fs';
import {emailPreviewDatabase} from './email-preview-database.mjs';
export async function aftercareDatabase(){
 const result=await emailPreviewDatabase();
 await result.db.exec(readFileSync(new URL('../../supabase/migrations/20261008143829_customer_aftercare_giga_v1.sql',import.meta.url),'utf8'));
 await result.db.exec('grant select on public.admin_members to authenticated;alter table public.admin_members enable row level security;create policy admin_members_self on public.admin_members for select to authenticated using(user_id=auth.uid());');
 await result.db.exec('grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;');
 return result;
}
