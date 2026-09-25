import {publicBackendConfig} from '../../backend/public-config.mjs';
const title=document.querySelector('#order-title'),message=document.querySelector('#order-message'),reference=document.querySelector('#order-reference'),heading=document.querySelector('#order-heading');
const session=new URLSearchParams(location.search).get('session_id');
if(!/^cs_live_[A-Za-z0-9]{8,}$/.test(session||'')){
 heading.textContent='ORDER STATUS';title.textContent='Your payment has not been confirmed.';
 message.textContent='Return to your basket to review your order.';
}else{
 try{
  const response=await fetch(publicBackendConfig.url+'/functions/v1/checkout-status?session_id='+encodeURIComponent(session),{headers:{apikey:publicBackendConfig.publishableKey}});
  if(!response.ok)throw new Error('Order status is temporarily unavailable.');
  const status=await response.json();
  if(!/^AI-\d+$/.test(status.reference||''))throw new Error('Order status is temporarily unavailable.');
  reference.textContent='Order reference: '+status.reference;
  if(status.paymentStatus==='paid'){
   heading.textContent='ORDER CONFIRMED';title.textContent='Thank you for your order.';
   message.textContent='Payment: Paid. Your order has been received by Apparition Instruments.';
  }else{
   heading.textContent='PAYMENT PROCESSING';title.textContent='We’re confirming your payment.';
   message.textContent='Your order is not marked Paid yet. Keep your order reference and check back shortly.';
  }
 }catch{
  heading.textContent='ORDER STATUS';title.textContent='We could not confirm payment yet.';
  message.textContent='Please keep your Stripe confirmation. Your order will be updated only after independent payment verification.';
 }
}
