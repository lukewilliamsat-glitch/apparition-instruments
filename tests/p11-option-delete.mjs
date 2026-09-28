import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAdminOptionRepository} from '../dist/backend/catalogue-options.mjs';

const sql=readFileSync('supabase/migrations/20260928154321_p11_catalogue_option_delete.sql','utf8');
for(const term of ['security definer','auth.uid()','public.admin_members','for update','lock table public.components,public.kit_definitions','manufacturerKey','c.manufacturer','jsonb_path_query','Core catalogue identities','revoke all','grant execute'])assert(sql.includes(term),term);
assert(!/on delete cascade|delete from public.components|delete from public.kit_definitions|update public.components/.test(sql));
const adminSettings=readFileSync('dist/admin/catalogue-settings/settings.mjs','utf8');
assert(adminSettings.includes('Components using'));
assert(adminSettings.includes('Component counts below do not include Kit Definitions. Deletion checks both'));
let endpoint,body;const repo=createAdminOptionRepository({send:async(table,request)=>{endpoint=table;body=request.body;return {ok:true,json:async()=>({deleted:false,dependencies:[{kind:'Component',id:'A',name:'A pot'},{kind:'Kit Definition',id:'kit-les-paul'}]})};}});
await assert.rejects(()=>repo.remove('manufacturer','unused'),/Component A \(A pot\).*Kit Definition kit-les-paul/);assert.equal(endpoint,'rpc/delete_unused_catalogue_option');assert.deepEqual(body,{p_set:'manufacturer',p_key:'unused'});
const success=createAdminOptionRepository({send:async()=>({ok:true,json:async()=>({deleted:true,dependencies:[]})})});assert.equal((await success.remove('manufacturer','unused')).deleted,true);
const unauthorized=createAdminOptionRepository({send:async()=>({ok:false,status:403,json:async()=>({message:'Admin membership required'})})});await assert.rejects(()=>unauthorized.remove('manufacturer','unused'),/Admin membership required/);
console.log('P11 guarded dictionary deletion: Admin RPC, dependency refusal, no cascade and core identity protection PASS');
