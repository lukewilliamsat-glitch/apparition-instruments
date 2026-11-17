import {readBasket,resetBasket,hasUnavailableItems} from '../commerce.mjs?build=0f4b82d6f618ecc7e661c3b3ff13ca1b58b66ca4';
import {el,itemCard,totalCard,emptyBasket,errorBasket} from '../basket-ui.mjs?v=overseer68';
import {createSecureCheckoutRepository} from '../backend/order-data.mjs?build=2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f';
import {publicBackendConfig} from '../backend/public-config.mjs?build=2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f';
import {productById} from '../components/catalogue.mjs?build=2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f';
import {customerAuth} from '../account/client.mjs?build=2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f';
const content=document.querySelector('#checkout-content'),repository=createSecureCheckoutRepository();
let requestId=crypto.randomUUID(),shipping=null,mounted=null,renderKey=null,submitting=false,uncertain=false,queued=false;
window.apparitionStoreState||={state:'UNAVAILABLE',customer_message:'Checking current store availability…'};
const totals=items=>items.reduce((sum,item)=>sum+(item.product==='component'?productById(item.sku).price:item.record.pricing.total)*item.quantity,0);
const selections=items=>items.map(item=>({productId:item.product==='component'?productById(item.sku).id:'kit-les-paul',quantity:item.quantity}));
let rateRequest=null,rateGeneration=0,lastQuoteKey=null,quoteError='';
const keyFor=items=>JSON.stringify([totals(items),selections(items)]);
async function loadShipping(items){
 const key=keyFor(items);if(rateRequest===key)return;rateRequest=key;const generation=++rateGeneration;
 shipping=null;lastQuoteKey=null;quoteError='';
 try{
  const response=await fetch(publicBackendConfig.url+'/rest/v1/rpc/overseer_delivery_options',{method:'POST',headers:{apikey:publicBackendConfig.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_subtotal:totals(items),p_items:selections(items)}),signal:AbortSignal.timeout(8000)});
  let options,legacy=false;
  if(response.status===404){
   const old=await fetch(publicBackendConfig.url+'/rest/v1/commerce_shipping?country=eq.GB&select=standard_delivery_pence,free_delivery_threshold_pence',{headers:{apikey:publicBackendConfig.publishableKey},signal:AbortSignal.timeout(8000)});
   if(!old.ok)throw Error('UK delivery prices are unavailable. Please retry later.');
   const [rule]=await old.json();
   if(!Number.isSafeInteger(rule?.standard_delivery_pence)||!Number.isSafeInteger(rule?.free_delivery_threshold_pence))throw Error('UK delivery prices are unavailable.');
   options=[{id:'standard',name:'UK Delivery',description:'Standard UK delivery',price:totals(items)>=rule.free_delivery_threshold_pence?0:rule.standard_delivery_pence}];legacy=true;
  }else{
   if(!response.ok)throw Error('UK delivery prices are unavailable. Please retry later.');
   options=await response.json();
  }
  if(!Array.isArray(options)||options.length<1||options.length>5||options.some(m=>!/^[a-z][a-z0-9-]{1,20}$/.test(m.id)||!Number.isSafeInteger(m.price)||m.price<0||typeof m.name!=='string'||typeof m.description!=='string'))throw Error('UK delivery response is incomplete.');
  if(generation!==rateGeneration||key!==keyFor(readBasket()))return;
  lastQuoteKey=key;requestId=crypto.randomUUID();
  shipping={options,selected:options[0],legacy};render();
 }catch(error){
  if(generation!==rateGeneration)return;
  quoteError=error.message;render();
 }
}
function orderForm(items){
 const form=el('form','checkout-order-form'),title=el('h2','','Secure checkout'),note=el('p','','Stripe will collect your email, name, payment details and UK delivery address. Your order remains Pending and Unpaid until payment is independently confirmed.');
 const subtotal=totals(items),quote=shipping;
 const method=el('select'),methodLabel=el('label','','UK delivery method');
 methodLabel.append(method);method.setAttribute('aria-describedby','delivery-method-details');
 for(const rate of quote.options){const option=el('option','',rate.name+' · '+(rate.price===0?'Free':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(rate.price/100)));option.value=rate.id;method.append(option);}
 method.value=quote.selected.id;
 const description=el('p','status-message');description.id='delivery-method-details';
 const describe=()=>{const x=quote.selected;description.textContent=x.description+(Number.isInteger(x.dispatchDays)&&Number.isInteger(x.deliveryDays)?' · Estimated dispatch '+x.dispatchDays+' days, delivery '+x.deliveryDays+' days.':'');};describe();
 method.addEventListener('change',()=>{if(submitting||uncertain)return;quote.selected=quote.options.find(m=>m.id===method.value);requestId=crypto.randomUUID();describe();content.querySelector('.basket-total')?.replaceWith(totalCard(items,true,quote));renderKey=JSON.stringify([items,quote]);});
 const button=el('button','button','Proceed to Secure Checkout'),status=el('p','status-message'),availability=el('p','status-message');button.type='submit';button.id='checkout-submit';status.setAttribute('role','status');availability.setAttribute('role','status');form.append(title,note,methodLabel,description,button,status,availability);
 let availabilityKey=null;
 const updateAvailability=()=>{
  const store=window.apparitionStoreState,open=store?.state==='OPEN',next=JSON.stringify([store?.state,store?.customer_title,store?.customer_message]),hadFocus=document.activeElement===button;
  button.disabled=submitting||uncertain||!open;method.disabled=submitting||uncertain;form.setAttribute('aria-busy',String(submitting));
  if(next!==availabilityKey){
   const initial=availabilityKey===null;availabilityKey=next;
   availability.textContent=open?(initial?'':'Ordering is available. Current prices and stock are checked before payment.'):(store?.customer_message||'Checkout availability could not be checked. Your basket stays saved.');
   if(submitting&&!open)availability.textContent+=' The current checkout request is still being checked. Please do not submit again.';
   if(hadFocus&&!open){availability.tabIndex=-1;availability.focus();}
   return true;
  }return false;
 };
 mounted={form,button,status,availability,updateAvailability};updateAvailability();
 form.addEventListener('submit',async event=>{event.preventDefault();if(submitting||uncertain||button.disabled)return;const ownedFocus=form.contains(document.activeElement);submitting=true;updateAvailability();status.textContent='Preparing secure checkout…';let creating=false,confirmed=false;
  try{
   if(window.apparitionStoreState?.state!=='OPEN')throw new Error(window.apparitionStoreState?.customer_message||'Checkout availability could not be checked. Please retry shortly.');
   const current=readBasket();if(hasUnavailableItems(current))throw new Error('Some saved items are unavailable. Review your basket before checkout.');if(JSON.stringify(current)!==JSON.stringify(items))throw new Error('Your basket changed. Review it and reload before submitting.');
   const {data:session,error:sessionError}=await customerAuth.getSession();
   if(sessionError)throw new Error('Your account session could not be checked. Please reload and try again.');
   creating=true;const delivery=quote.selected.price;const result=await repository.create({requestId,...quote.legacy?{}:{deliveryMethod:quote.selected.id,expectedDeliveryPence:delivery},items:current.map(item=>item.product==='component'?{product:'component',sku:productById(item.sku).sku||item.sku,quantity:item.quantity}:{product:item.product,quantity:item.quantity,record:item.record})},{accessToken:session?.session?.access_token||null});confirmed=true;
   if(result.totalPence!==subtotal+delivery)throw new Error('The current checkout price differs from your basket. Refresh and review your kit.');
   if(window.apparitionStoreState?.state!=='OPEN'||JSON.stringify(readBasket())!==JSON.stringify(current)){uncertain=true;throw new Error('Ordering availability or your basket changed while checkout was being prepared. Please contact us before starting another checkout.');}
   window.location.assign(result.url);
  }catch(error){
   if(creating&&!confirmed&&(['TypeError','SyntaxError','AbortError','TimeoutError'].includes(error?.name)||/secure checkout link was unreadable/i.test(error?.message||'')))uncertain=true;
   status.textContent=uncertain?'We could not confirm a safe checkout handoff. Your basket is still here. Please avoid starting another checkout straight away; contact us if you need help.':error.message;
   if(uncertain)button.textContent='Checkout outcome unconfirmed';
  }finally{
   submitting=false;updateAvailability();
   if(queued&&!uncertain){const feedback=status.textContent;queued=false;render();if(mounted&&feedback)mounted.status.textContent=feedback;}
   if(ownedFocus&&document.activeElement===document.body){const target=mounted?.button.disabled?mounted.status:mounted?.button;if(target){if(target!==mounted.button)target.tabIndex=-1;target.focus();}}
  }
 });return form;
}
function render(){try{
 const items=readBasket();
 const available=items.length&&!hasUnavailableItems(items);
 if(!submitting&&!uncertain&&available&&keyFor(items)!==lastQuoteKey&&rateRequest!==keyFor(items))void loadShipping(items);
 if(!available&&rateRequest){rateGeneration++;rateRequest=null;lastQuoteKey=null;shipping=null;lastQuoteKey=null;quoteError='';}
 const key=JSON.stringify([items,shipping]);
 if(mounted&&content.contains(mounted.form)&&(key===renderKey||submitting||uncertain)){
  const availabilityChanged=mounted.updateAvailability();
  if(availabilityChanged)content.querySelector('.basket-total')?.replaceWith(totalCard(items,true,shipping));
  if(key!==renderKey){queued=true;if(submitting)mounted.status.textContent='Your basket changed while checkout is being checked. Please do not submit again.';}
  return;
 }
 if(submitting){queued=true;mounted?.updateAvailability();return;}
 const hadFocus=mounted?.form.contains(document.activeElement);mounted=null;renderKey=key;content.replaceChildren();const outcome=new URLSearchParams(location.search).get('checkout');
 if(outcome==='success')content.append(el('p','status-message',"Thanks. We're confirming your payment. Your order is not marked Paid until Stripe confirmation is processed."));
 if(outcome==='cancel')content.append(el('p','status-message','Checkout was cancelled. Your basket is still here; your Order remains Pending and Unpaid.'));
 if(!items.length){content.append(emptyBasket());return;}
 const layout=el('div','basket-layout'),list=el('div','basket-items');items.forEach(item=>list.append(itemCard(item)));layout.append(list,totalCard(items,true,shipping));content.append(layout);
 if(hasUnavailableItems(items)){const note=el('p','status-message','Some saved items are unavailable. Review your basket before checkout.');note.setAttribute('role','alert');content.append(note);return;}
 if(items.some(item=>item.product==='les-paul'&&item.record?.legacyReconstructed)){content.append(el('p','status-message','Review and resave older kit configurations in the Builder before secure checkout.'));return;}
 if(!shipping||lastQuoteKey!==keyFor(items)){content.append(el('p','status-message',quoteError||'Loading current UK delivery pricing…'));if(quoteError){const retry=el('button','button','Retry delivery estimate');retry.type='button';retry.addEventListener('click',()=>{rateRequest=null;render();});content.append(retry);}return;}
 if(window.apparitionStoreState?.state!=='OPEN')return;
 content.append(orderForm(items));
 if(hadFocus)mounted?.button.focus();
 }catch(error){if(submitting||uncertain){queued=true;if(mounted)mounted.status.textContent='Your saved basket needs review. The current checkout outcome must be checked before another attempt.';return;}mounted=null;renderKey=null;content.replaceChildren(errorBasket(error.message,()=>{try{resetBasket();}catch(e){content.prepend(el('p','status-message',e.message));}}));}}
window.addEventListener('apparition:store-status',render);window.addEventListener('storage',render);window.addEventListener('apparition:basket-changed',render);window.addEventListener('pageshow',render);render();
