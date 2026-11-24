import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {marketplaceStateStore,marketplaceCustody} from './marketplace-store.mjs';

const require=createRequire(import.meta.url);
const {Client}=require(process.env.QUARTERMASTER_PG_MODULE??'pg');
const host=process.env.QUARTERMASTER_PG_HOST??'127.0.0.1';
assert.equal(host,'127.0.0.1');
const settings={host,port:Number(process.env.QUARTERMASTER_PG_PORT??5432),user:'postgres',database:'quartermaster84w_fixture'};
const open=async()=>{const c=new Client(settings);await c.connect();return c;};
const clients=await Promise.all([open(),open()]);
const [first,second]=clients;
const actor='00000000-0000-4000-8000-000000000001';
const outsider='00000000-0000-4000-8000-000000000002';
const scope=['sell.fulfillment.readonly','sell.finances','commerce.identity.readonly'];
const binding={actor,account:'uk-fixture',subject:'verified-fixture',environment:'sandbox'};
const token='fixture-'+randomBytes(32).toString('hex');

try {
  assert.notEqual(first.processID,second.processID);
  await first.query('create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key)');
  await first.query(await readFile(new URL('./marketplace-store.review.sql',import.meta.url),'utf8'));
  await first.query('insert into auth.users values($1),($2)',[actor,outsider]);
  const store=marketplaceStateStore(first);
  const hash=createHash('sha256').update(randomBytes(32)).digest('hex');
  const intent={hash,actor,account:binding.account,expectedSubject:binding.subject,environment:'sandbox',expiresAt:Date.now()+580000};
  await assert.rejects(store.stage({...intent,environment:'production'}),/verified sandbox Admin/);
  await store.stage(intent);
  assert.equal(await store.take({hash,actor:outsider,environment:'sandbox'}),null);
  const outcomes=await Promise.all([store.take(intent),marketplaceStateStore(second).take(intent)]);
  assert.equal(outcomes.filter(Boolean).length,1);
  assert.equal(outcomes.find(Boolean).expectedSubject,binding.subject);
  assert.equal(await store.take(intent),null);
  await assert.rejects(store.stage({...intent,expiresAt:Date.now()-1000}),/expired/);
  await first.query('set role authenticated');
  await assert.rejects(first.query('select * from marketplace84.seller_custody'),{code:'42501'});
  await first.query('reset role');

  const keys=new Map([['fixture-v1',randomBytes(32)]]);
  const vault=marketplaceCustody(first,{keys,activeVersion:'fixture-v1'});
  const record={...binding,refreshToken:token,expiresAt:Date.now()+90000,requestedScopes:scope};
  await vault.bind(record);
  assert.equal((await vault.refreshCredential(binding)).refreshToken,token);
  assert.equal(await vault.status({...binding,actor:outsider}),null);
  const raw=await first.query('select envelope from marketplace84.seller_custody');
  assert.equal(JSON.stringify(raw.rows[0]).includes(token),false);
  await assert.rejects(vault.bind({...record,subject:'unexpected'}),/differs/);
  await assert.rejects(vault.bind({...record,actor:outsider}),/differs/);
  await first.query("update marketplace84.seller_custody set subject='changed-by-fixture'");
  await assert.rejects(vault.refreshCredential(binding),/could not be verified/);
  console.log('PASS real PostgreSQL one-use actor-bound consent, closed client roles, encrypted custody and account binding');
} finally {
  await Promise.all(clients.map(c=>c.end()));
}
