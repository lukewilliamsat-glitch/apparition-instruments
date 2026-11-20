import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareFulfilmentRevision as prepare} from './finance80.mjs';
const orderId='fixture-order';
const current={orderId,revision:2,orderBasisMatches:true,orderBasisHash:'defined-by-server',document:{
 costs:{packaging:{minor:10,state:'estimated',source:'quotation'},shipping:{minor:null,state:'unknown',source:''}},fees:[{id:'unchanged'}]
}};
const evidence={orderId,readyForDispatchReview:true,packagingActualMinor:60,postageEstimatedMinor:165,postageActualMinor:null,
 packageStockMovement:'300',purchaseReference:'fixture-receipt',currency:'GBP'};
test('Only actual evidence gets into the financial revision; retry does not add a second cost',()=>{
 const p=prepare({current,orderId,evidence});
 assert.equal(p.document.costs.packaging.minor,60);
 assert.equal(p.document.costs.shipping.minor,null);
 assert.equal(p.estimatedPostageMinor,165);
 assert.equal(current.document.costs.packaging.minor,10);
 assert.deepEqual(p.document.fees,current.document.fees);
 assert.equal(prepare({current:{...current,document:p.document},orderId,evidence}).changed,false);
 const settled=prepare({current:{...current,document:p.document},orderId,evidence:{...evidence,postageActualMinor:155,postageReceipt:'Receipt-1'}});
 assert.equal(settled.document.costs.shipping.minor,155);
 assert.equal(settled.document.costs.packaging.minor,60);
});
test('Historic confirmations, stale order evidence and omitted receipts fail closed',()=>{
 const p=prepare({current,orderId,evidence});
 assert.throws(()=>prepare({current:{...current,document:p.document},orderId,evidence:{...evidence,packagingActualMinor:70}}),/correction/);
 assert.throws(()=>prepare({current:{...current,orderBasisMatches:false},orderId,evidence}),/Current/);
 assert.throws(()=>prepare({current,orderId,evidence:{...evidence,postageActualMinor:155}}),/receipt/);
 assert.throws(()=>prepare({current:{...current,document:{...current.document,fulfilmentSnapshot:{presetId:'existing'}}},orderId,evidence}),/snapshot/);
});
