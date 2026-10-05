import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {expansionGuides} from './guides.mjs';import {generateCMS} from '../generate-hub-cms.mjs';import {validateArticle} from '../../dist/hub-cms/render.mjs';
const uuid=key=>{const b=createHash('sha256').update('apparition-hub:'+key).digest().subarray(0,16);b[6]=(b[6]&15)|80;b[8]=(b[8]&63)|128;const h=b.toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;},frame=JSON.parse(await readFile('dist/hub-cms/presentation/generic.json','utf8')),old=JSON.parse(await readFile('scripts/hub-cms/seed.json','utf8')),additions=expansionGuides.map(a=>({...a,id:uuid(a.guide_key),template_key:'generic'})),records=[...old,...additions];
for(const a of additions)validateArticle(a.content,frame,{publishing:true,knownGuides:records.map(a=>a.guide_key)});await writeFile('scripts/content-platform/expansion-seed.json',JSON.stringify(additions,null,2)+'\n');await generateCMS({records});
const seed=JSON.stringify(additions).replaceAll("'","''");const sql=`-- Eight supporting CMS guides only. Original article rows and published pointers are preserved.
do $content_seed$
declare seed jsonb:='${seed}'::jsonb; item jsonb; article_id uuid; revision_id bigint;
begin
 for item in select value from jsonb_array_elements(seed) loop
  article_id:=(item->>'id')::uuid;
  if exists(select 1 from public.hub_articles where (guide_key=item->>'guide_key' or draft->>'slug'=item->'content'->>'slug') and id<>article_id) then raise exception 'Content expansion identity/slug collision';end if;
  insert into public.hub_articles(id,guide_key,draft,seed_context) values(article_id,item->>'guide_key',item->'content',jsonb_build_object('template_key','generic','expected_intent',null,'refs','{}'::jsonb,'slots',jsonb_build_array('main'))) on conflict(id) do nothing;
 end loop;
 for item in select value from jsonb_array_elements(seed) loop
  article_id:=(item->>'id')::uuid;
  if (select published_revision_id from public.hub_articles where id=article_id) is null then
   insert into public.hub_article_revisions(article_id,revision_number,content,action,actor) values(article_id,1,item->'content','IMPORT',null) returning id into revision_id;
   update public.hub_articles set published_revision_id=revision_id where id=article_id and published_revision_id is null;
  end if;
 end loop;
 -- Validate only after all supporting public relationships exist; any failure rolls back the whole seed.
 for item in select value from jsonb_array_elements(seed) loop
  perform public.hub_validate_content(item->'content',(select seed_context from public.hub_articles where id=(item->>'id')::uuid),true);
 end loop;
end $content_seed$;
`;
await writeFile('supabase/migrations/20261005140157_hub_content_expansion_v3.sql',sql);console.log('Built '+additions.length+' supporting guides; '+records.length+' CMS/static article routes.');
