import assert from 'node:assert/strict';
import {report,reportRange,validateRange,pricePlan,csv} from '../../dist/admin/omniscience/model.mjs';
import {financeRepository} from '../../dist/admin/omniscience/repository.mjs';
import {row} from './fixture.mjs';
const r=report([row,{...row,id:'a',current:false},{...row,id:'b',finance:null,channel:'DIRECT'}]);
assert.equal(r.totals[0].buyerPaid,3447);assert.equal(r.totals[0].recorded,1);assert.equal(r.totals[0].sellerRevenue,1149);
assert.equal(r.totals[0].contribution,450);assert.equal(r.totals[0].advertisingCount,0);
assert.equal(r.totals[0].marketplaceCount,1);assert.equal(r.products.find(p=>p.channel==='EBAY').covered,1);
assert.equal(r.products.find(p=>p.channel==='EBAY').contribution,450);assert.equal(r.detail[1].label,'Order changed');
assert.throws(()=>report([row,row]),/duplicate/i);
assert.deepEqual(reportRange('week','2026-11-17'),{from:'2026-11-16',to:'2026-11-17'});
assert.deepEqual(reportRange('quarter','2026-11-17'),{from:'2026-10-01',to:'2026-11-17'});
assert.throws(()=>validateRange('2026-02-30','2026-03-01'));
assert.throws(()=>validateRange('2024-01-01','2025-01-01'));
assert.equal(csv([[' =HYPERLINK("x")','\u200e@SUM(1,1)','a,b',-6.20]]),`"' =HYPERLINK(""x"")","'\u200e@SUM(1,1)","a,b",-6.2\r\n`);
const input={acquisition:450,packaging:30,postage:399,customerPostage:399,fixedFee:25,marketplace:1200,advertising:300,payment:200,tax:0,margin:2000,target:220};
const p=pricePlan(input);assert(p.targetPrice>p.breakEven);assert(p.contribution>=220);assert(p.margin>=20);
assert.throws(()=>pricePlan({...input,tax:9999}),/combined/);
for(let i=1;i<110;i++){
 const sample={...input,acquisition:7*i,margin:i*47,target:i*3,customerPostage:i};
 const x=pricePlan(sample), revenue=x.gross-1, previous=revenue-Math.ceil(revenue*(sample.marketplace+sample.advertising+sample.payment+sample.tax)/10000)-sample.acquisition-sample.packaging-sample.postage-sample.fixedFee;
 assert(x.contribution>=sample.target&&x.contribution*10000>=sample.margin*x.gross);
 assert(x.targetPrice===0||previous<sample.target||previous*10000<sample.margin*revenue);
}
let calls=0;
const auth={async accessToken(){return 'synthetic-token';}},config={url:'https://fixture.invalid',publishableKey:'fixture'};
const request=async (url,opts)=>{
 calls++;assert.equal(url,'https://fixture.invalid/rest/v1/rpc/omniscience74_orders');assert.equal(opts.headers.Authorization,'Bearer synthetic-token');assert.equal(opts.redirect,'error');assert.equal(opts.cache,'no-store');
 return Response.json({rows:[row],next:null});
};
const repo=financeRepository({auth,config,request});
await assert.rejects(repo.orders({from:'bad',to:'2026-06-23'},null));assert.equal(calls,0);
assert.equal((await repo.orders({from:'2026-06-01',to:'2026-06-30'},null)).rows.length,1);assert.equal(calls,1);
const large=financeRepository({auth,config,request:()=>Promise.resolve(new Response('X'.repeat(390000)))});
await assert.rejects(large.orders({from:'2026-06-01',to:'2026-06-30'},null));
console.log('PASS calculations, evidence cover, exports, pricing boundaries, bounded network contract');
