import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const approvedStageA='1e4f79c5a4e321b0e80450b10adf72b80ae3adb5b51dc1c09554c3811e6942de';
const sha=s=>createHash('sha256').update(s).digest('hex');
const runtimeSources={
 'unity79.sql':['4607a5c8c894f1d313f4a8868763f3892048a759ee675c883d79441c230e2248',
  [['create schema dominion79;', '-- Mirrors the established saved BOM']]],
 'quartermaster79.sql':['208cf52b19d4033390bb59b84319647966475118891ec585753b2e0a5ef1b81d',
  [['create schema quartermaster79;', 'create function quartermaster79.receive(']]],
 'ironheart80.sql':['1d1fb070938cdd7f1d531401883d8c7a83ae111e3be1115f06df03df1e1076dc',
  [['create table quartermaster79.rollout(', 'create function quartermaster79.require_write('],
   ['create table quartermaster79.pick_events(', 'create function public.quartermaster80_order(']]]
};
const range=(s,p)=>{
 const i=s.indexOf(p),last=s.lastIndexOf(p);
 assert.ok(i>=0&&i===last,'Accepted source boundary changed');
 return i;
};
export function composeRuntimeOverlay(name,sql){
 assert.ok(Object.hasOwn(runtimeSources,name),'Unreviewed runtime file');
 const [hash,parts]=runtimeSources[name];
 assert.equal(sha(sql),hash);
 for(const [a,b] of parts){
  const l=range(sql,a),r=range(sql,b);
  assert.ok(r>l);
  sql=sql.slice(0,l)+sql.slice(r);
 }
 assert.match(sql,/current_database\(\)\s*<>\s*'dominion79_fixture'/);
 assert.ok(!/\bcreate\s+(schema|table)\b/i.test(sql));
 return sql;
}
