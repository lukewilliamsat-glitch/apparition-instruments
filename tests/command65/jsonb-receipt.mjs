import assert from 'node:assert/strict';
import {createFinancialSession} from '../../dist/admin/orders/financial-record.mjs';
import {financeDraft} from '../../dist/admin/orders/finance-ui.mjs';
const orderId='10000000-0000-4000-8000-000000000003',basis='a'.repeat(64);
const order={id:orderId,reference:'LOCAL64',channel:'DIRECT',items:[{name:'Fictional A',productId:'fixture-a',quantity:1,unitPrice:399,lineTotal:399},{name:'Fictional B',productId:'fixture-b',quantity:1,unitPrice:350,lineTotal:350}],pricing:{total:749,delivery:0}};
const draft=financeDraft(order),reordered=v=>Array.isArray(v)?v.map(reordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).reverse().map(k=>[k,reordered(v[k])])):v;
let groups=0;
for(const [name,mutate,expected] of [
 ['jsonb object-key reordering is accepted without false dirty state',v=>reordered(v),'committed'],
 ['changed receipt value remains uncertain and blocks another save',v=>({...reordered(v),actualPaidMinor:748}),'uncertain'],
 ['changed array order is not treated as identical',v=>({...reordered(v),lines:[...v.lines].reverse()}),'uncertain'],
 ['changed scalar type is not treated as identical',v=>({...reordered(v),actualPaidMinor:'749'}),'uncertain']
]){
 let saves=0,captured;const record={version:1,orderId,orderBasisHash:basis,revision:0,document:null,history:[],orderBasisMatches:true};
 const session=createFinancialSession({orderId,initialDraft:draft,repository:{read:async()=>({record,bytes:1}),save:async p=>{saves++;captured=p;return{bytes:1,receipt:{...record,outcome:'committed',requestId:p.requestId,revision:1,document:mutate(p.document),updatedAt:'2026-10-27T00:00:00Z'}};},status:async id=>({bytes:1,receipt:{...record,outcome:'committed',requestId:id,revision:1,document:reordered(captured.document)}}),dispose(){}}});
 await session.load();await session.save();assert.equal(saves,1);assert.equal(session.snapshot().status,expected);
 if(expected==='committed'){assert.equal(session.snapshot().dirty,false);session.edit(reordered(draft));assert.equal(session.snapshot().dirty,false);}
 else{assert(session.snapshot().pendingRequestId);assert.equal(session.snapshot().canSave,false);assert.equal(await session.save(),false);assert.equal(saves,1);await session.reconcile();assert.equal(session.snapshot().status,'committed');assert.equal(session.snapshot().dirty,false);}
 session.dispose();groups++;console.log('PASS '+name);
}
console.log(JSON.stringify({result:'PASS',groups,liveWrites:0,networkRequests:0}));
