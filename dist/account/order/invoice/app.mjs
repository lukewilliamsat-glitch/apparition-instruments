import {loadOrder} from '../bootstrap.mjs';
import {invoiceFromOrder} from '../../../admin/orders/invoice/model.mjs';
import {renderInvoiceDocument} from '../../../invoice/document.mjs';

// The P09D endpoint already verified the session, persisted owner and payment.
// Adapt its allowlisted customer payload to the same persisted invoice model.
export function customerInvoiceOrder(detail){
 return {reference:detail.reference,createdAt:detail.createdAt,paymentStatus:detail.paymentStatus,
  customer:{name:detail.customerName,email:detail.customerEmail},delivery:{recipient:detail.recipient},
  items:detail.items,pricing:detail.pricing,refundedPence:detail.refundedPence,latestRefundAt:detail.latestRefundAt};
}
export function invoiceModel(detail){
 return invoiceFromOrder(customerInvoiceOrder(detail));
}
export function renderInvoice(root,detail,document){
 return renderInvoiceDocument(root,customerInvoiceOrder(detail),document,{addressLines:detail.address||[]});
}
export async function startInvoice({document,location,load=loadOrder}={}){
 const root=document.getElementById('invoice'),message=document.getElementById('invoice-message');
 const reference=new URL(location.href).searchParams.get('reference');
 if(!/^AI-\d{6}$/.test(reference||'')){message.textContent='Order not found in your account.';return;}
 try{const detail=await load(reference);renderInvoice(root,detail,document);document.title='Invoice '+detail.reference+' | Apparition Instruments';document.getElementById('back-order').href='/account/order/?reference='+encodeURIComponent(detail.reference);message.textContent='';}
 catch(error){message.textContent=error.message;root.hidden=true;}
}
if(typeof document!=='undefined')startInvoice({document,location});
