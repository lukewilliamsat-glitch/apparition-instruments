// The paid-order claim remains authoritative. Only the presentation changes to
// the byte-identical, approved P08B.4C V2 renderer used by transactional-email.
import {renderEmailV2} from './v2.ts';

export function buildPaidOrderConfirmation(order:any){
 if(order?.payment_status!=='paid'||!order.paid_at||!order.fulfillment_applied_at)
  throw new Error('Confirmed paid Order required');
 if(!order.customer?.email||!order.customer?.name||!order.delivery?.line1)
  throw new Error('Paid Order contact or delivery unavailable');
 return renderEmailV2('order_confirmed',order);
}
