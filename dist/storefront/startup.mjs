// A small presentation boundary, deliberately independent of catalogue/commerce.
// The original route remains responsible for validation and purchase authority.
export const startupTimeoutMs=15000;
const titles={components:'Components',product:'Product details',basket:'Your basket',checkout:'Checkout'};
const unavailable={components:'Components are temporarily unavailable.',product:'This component is temporarily unavailable.',basket:'Your basket is temporarily unavailable.',checkout:'Checkout is temporarily unavailable.'};
const element=(doc,tag,text)=>{const node=doc.createElement(tag);if(text)node.textContent=text;return node;};
export async function startStorefront({document:doc,route,load,reload=()=>doc.defaultView.location.reload(),timeoutMs=startupTimeoutMs,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(!titles[route]||typeof load!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('Invalid storefront startup contract');
 const main=doc.querySelector('main');if(!main)return {status:'absent'};
 const hadFocus=main.contains(doc.activeElement);
 const loading=element(doc,'p','Checking current product and ordering information…');loading.setAttribute('role','status');loading.setAttribute('aria-live','polite');
 main.before(loading);main.hidden=true;main.setAttribute('aria-busy','true');
 let timer,timedOut=false;
 try{
  const deadline=new Promise((_,reject)=>{timer=setTimer(()=>{timedOut=true;reject(Error('Startup deadline'));},timeoutMs);});
  await Promise.race([Promise.resolve().then(load),deadline]);
  main.hidden=false;main.removeAttribute('aria-busy');loading.remove();return {status:'ready'};
 }catch{
  // Replace the whole old main, rather than trust a late import not to render.
  // Detached controls cannot become reachable after the deadline. No retry,
  // basket write, catalogue fallback or payment call occurs in this boundary.
  const restoreFocus=main.contains(doc.activeElement)||(hadFocus&&doc.activeElement===doc.body),recovery=element(doc,'main');recovery.id=main.id||'main';recovery.className=main.className;
  // Keep the public identity used by the independent marketplace handoff;
  // dropping it could turn its scoped product lookup into an unfiltered read.
  const componentId=main.getAttribute('data-component-id');if(componentId!==null)recovery.setAttribute('data-component-id',componentId);
  const intro=element(doc,'div');intro.className='page-intro';
  const title=element(doc,'h1',titles[route]),notice=element(doc,'p',unavailable[route]);notice.setAttribute('role','alert');
  intro.append(title,notice,element(doc,'p','We couldn’t check the current product information. Please try again later. Your basket is not a confirmed order or a stock reservation.'));
  recovery.append(intro,element(doc,'p','If you have saved a basket in this browser, this page has not changed it. Ordering stays unavailable until current prices, stock and checkout can be checked.'));
  const actions=element(doc,'p'),retry=element(doc,'button','Reload this page');retry.type='button';retry.className='button';
  retry.addEventListener('click',()=>{if(retry.disabled)return;retry.disabled=true;try{reload();}catch{retry.disabled=false;}});
  const help=element(doc,'a','Ordering help'),contact=element(doc,'a','Contact us');help.href=new URL('../faq/',import.meta.url).href;contact.href=new URL('../contact/',import.meta.url).href;
  actions.append(retry,doc.createTextNode(' '),help,doc.createTextNode(' · '),contact);recovery.append(actions);
  main.replaceWith(recovery);loading.remove();
  if(restoreFocus){title.tabIndex=-1;title.focus();}
  return {status:'unavailable',reason:timedOut?'timeout':'initialisation'};
 }finally{clearTimer(timer);}
}
