// P07B guest entry point. Stripe secrets and privileged database credentials stay server-side.
const origin='https://apparitioninstruments.co.uk';
const checkoutPage=origin+'/checkout/success/';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Vary':'Origin'}});
const err=(message:string,status=400)=>json({message},status);
type Environment={get:(key:string)=>string|undefined};
export async function startCheckout(req:Request,env:Environment=Deno.env,request:typeof fetch=fetch):Promise<Response>{
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return err('Checkout origin is unavailable.',403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
 if(req.method!=='POST')return err('Only checkout requests are supported.',405);
 const stripeKey=env.get('STRIPE_SECRET_KEY');
 if(!stripeKey||!/^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(stripeKey))return err('Live secure checkout is not configured.',503);
 const supabaseUrl=env.get('SUPABASE_URL'),publicKey=env.get('SUPABASE_ANON_KEY'),serviceKey=env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!supabaseUrl||!publicKey||!serviceKey)return err('Checkout database connection is unavailable.',503);
 let input:any;try{const raw=await req.text();if(raw.length>250000)return err('Basket is too large.');input=JSON.parse(raw);}catch{return err('Basket could not be read.');}
 if(!input||typeof input!=='object'||!Array.isArray(input.items)||input.items.length<1||input.items.length>10||typeof input.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(input.requestId))return err('Invalid basket request.');
 // This privileged RPC remains independently validating. Browser callers have no EXECUTE permission.
 const rpc=await request(supabaseUrl+'/rest/v1/rpc/create_guest_kit_order',{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},body:JSON.stringify({p_request:{requestId:input.requestId,items:input.items,checkoutMode:'stripe'}})});
 if(!rpc.ok){const details=await rpc.json().catch(()=>({}));const stale=/price|total|unavailable/i.test(details?.message||'');return err(stale?'The basket price or configuration has changed. Review your basket before checkout.':'Your basket could not be verified. Review your selections before checkout.',400);}
 const receipt=await rpc.json();if(!/^[0-9a-f-]{36}$/i.test(receipt?.id||'')||!/^AI-\d+$/.test(receipt?.reference||''))return err('Order validation response was incomplete.',502);
 const orderResponse=await request(supabaseUrl+'/rest/v1/orders?id=eq.'+encodeURIComponent(receipt.id)+'&select=id,reference,subtotal_pence,delivery_pence,total_pence,payment_status,status,stripe_checkout_session_id,items',{headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey}});
 if(!orderResponse.ok)return err('Order could not be verified for checkout.',502);
 const order=(await orderResponse.json())?.[0];
 if(!order||order.reference!==receipt.reference||order.total_pence!==receipt.totalPence||order.status!=='pending'||order.payment_status!=='unpaid'||!Array.isArray(order.items)||!Number.isSafeInteger(order.subtotal_pence)||!Number.isSafeInteger(order.delivery_pence)||order.total_pence!==order.subtotal_pence+order.delivery_pence)return err('Order amount could not be verified.',502);
 if(order.stripe_checkout_session_id)return err('This order already has a secure checkout. Refresh your basket before retrying.',409);
 const amount=order.items.reduce((sum:number,item:any)=>sum+item.unitPrice*item.quantity,0);
 if(amount!==order.subtotal_pence||!order.items.every((item:any)=>Number.isSafeInteger(item.unitPrice)&&item.unitPrice>0&&Number.isSafeInteger(item.quantity)&&item.quantity>0))return err('Order item prices could not be verified.',502);
 const form=new URLSearchParams({mode:'payment',locale:'en-GB',client_reference_id:order.reference,success_url:checkoutPage+'?session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/basket/?checkout=cancel','name_collection[individual][enabled]':'true','name_collection[individual][optional]':'false','shipping_address_collection[allowed_countries][0]':'GB','metadata[order_id]':order.id,'metadata[order_reference]':order.reference,'shipping_options[0][shipping_rate_data][display_name]':'UK Delivery','shipping_options[0][shipping_rate_data][type]':'fixed_amount','shipping_options[0][shipping_rate_data][fixed_amount][amount]':String(order.delivery_pence),'shipping_options[0][shipping_rate_data][fixed_amount][currency]':'gbp'});
 order.items.forEach((item:any,index:number)=>{form.set(`line_items[${index}][price_data][currency]`,'gbp');form.set(`line_items[${index}][price_data][unit_amount]`,String(item.unitPrice));form.set(`line_items[${index}][price_data][product_data][name]`,String(item.name).slice(0,150));form.set(`line_items[${index}][quantity]`,String(item.quantity));if(item.type==='kit'){
  const s=item.snapshot?.specification||{};
  const description=[s.wiring,s.pots,s.matching,s.neck&&s.bridge?`${s.neck} / ${s.bridge}`:null,s.bleed].filter(value=>typeof value==='string'&&value.trim()).join(' · ').slice(0,500);
  if(description)form.set(`line_items[${index}][price_data][product_data][description]`,description);
 }});
 const stripe=await request('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+stripeKey,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'apparition-'+order.id},body:form});
 if(!stripe.ok)return err('Secure checkout is temporarily unavailable. Your order remains Pending and Unpaid. Retry shortly.',502);
 const session=await stripe.json();if(session?.livemode!==true||!/^cs_live_[A-Za-z0-9]+$/.test(session?.id||'')||!/^https:\/\/checkout\.stripe\.com\//.test(session?.url||'')||session?.amount_total!==order.total_pence||session?.currency!=='gbp')return err('Stripe did not return a valid live Checkout session.',502);
 const linked=await request(supabaseUrl+'/rest/v1/orders?id=eq.'+encodeURIComponent(order.id)+'&stripe_checkout_session_id=is.null',{method:'PATCH',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({stripe_checkout_session_id:session.id})});
 if(!linked.ok||(await linked.json())?.length!==1)return err('Checkout session could not be attached to the order. Retry shortly.',502);
 return json({url:session.url,reference:order.reference,totalPence:order.total_pence});
}
// Deno.serve passes a runtime context as its second argument; keep the
// injectable environment argument reserved for tests.
if(import.meta.main)Deno.serve(req=>startCheckout(req));
