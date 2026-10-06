import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),admin='10000000-0000-4000-8000-000000000001';
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;create table public.admin_members(user_id uuid);grant select on public.admin_members to authenticated;
create function public.create_guest_kit_order(jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare request_hash_value text;owner_user_id uuid;
begin
 return '{}'::jsonb;
end $$;
insert into auth.users values('${admin}');insert into public.admin_members values('${admin}');`);
await db.exec(readFileSync('supabase/migrations/20261004174609_site_operations_v1.sql','utf8'));
await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${admin}',false);`);
const input={slug:'fixture-priority-zero',title:'Fixture only',excerpt:'Isolated excerpt',body:'Isolated body',category:'NEWS',status:'PUBLISHED',priority:0,announcement:true,dismissible:true,publication_at:null,expires_at:null,cta_url:null,cta_label:null};
const saved=(await db.query('select public.save_news_post($1::jsonb) as post',[JSON.stringify(input)])).rows[0].post;assert.equal(saved.priority,0);assert.equal(saved.status,'PUBLISHED');
for(const priority of [-1,101])await assert.rejects(db.query('select public.save_news_post($1::jsonb)',[JSON.stringify({...input,id:saved.id,expected_updated_at:saved.updated_at,priority})]),e=>e.code==='23514');
await db.exec('reset role;set role anon;');const posts=(await db.query('select * from public.public_news()')).rows;assert.equal(posts.length,1);assert.equal(posts[0].priority,0);assert.equal(posts[0].title,input.title);await assert.rejects(db.query('select public.save_news_post($1::jsonb)',[JSON.stringify(input)]),e=>e.code==='42501');await db.close();console.log('Announcement priority DB: zero saves/publishes through unchanged RPC; 0–100 constraint and anonymous write boundary PASS (isolated only)');
