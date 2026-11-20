import {dispatchReview,workshopLabel} from './quartermaster.mjs';

const titles={quartermaster:'QUARTERMASTER',marketplace:'MARKETPLACE'};
function element(d,tag,text,className){
 const el=d.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;
}
const money=n=>n==null?'Not recorded':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n/100);
export async function mountAdminWorkspace({document:d,auth}){
 const target=d.querySelector('#dominion79');
 const where=d.location.pathname.split('/').filter(Boolean).at(-1);
 const name=Object.hasOwn(titles,where)?titles[where]:null;
 if(!target||!name)throw Error('Unknown fixture workspace');
 const session=new AbortController(), make=(...x)=>element(d,...x);
 const section=heading=>{const s=make('section',undefined,'dominion79-card');s.append(make('h2',heading));return s;};
 const wipe=()=>{session.abort();target.replaceChildren();};
 target.append(make('h1',name),make('p','Isolated engineering fixture. No live purchases, stock writes, marketplace connection or dispatch.','muted'));
 const status=make('p','Loading fixture evidence…');status.role='status';target.append(status);
 try{
  const signal=AbortSignal.any([AbortSignal.timeout(6000),session.signal]);
  const token=await auth.accessToken({signal,bounded:true});
  const orderId=where==='quartermaster'?new URL(d.location.href).searchParams.get('order'):null;
  const requestPath='/_dominion-fixture/'+where+(orderId?'?'+new URLSearchParams({order:orderId}):'');
  const response=await fetch(requestPath,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal,headers:{Authorization:'Bearer '+token}});
  if(!response.ok)throw Error('Fixture evidence could not be loaded.');
  const data=await response.json();
  status.remove();
  const grid=make('div',undefined,'dominion79-grid');
  if(where==='quartermaster'){
   const packing=section('Pick and pack');
   const list=make('ul');
   for(const part of data.picked)list.append(make('li',(part.name||part.component)+' · '+part.picked+' / '+part.quantity+' picked · '+part.currentAvailable+' currently available'));
   packing.append(make('p','Existing fixture order '+data.reference),list);
   const stock=section('Packaging stock'),evidence=section('Cost evidence');
   stock.append(make('p',data.stock.sku+': '+data.stock.available+' available'),make('p',data.stock.reorder?'Reorder due':'Stock above reorder point'));
   evidence.append(make('p','Actual packaging: '+money(data.cost.packagingActualMinor)),
    make('p','Estimated postage: '+money(data.cost.postageEstimatedMinor)),
    make('p','Actual postage: '+money(data.cost.postageActualMinor)));
   grid.append(packing,stock,evidence);target.append(grid);
   const parcel=section('Dispatch review');
   parcel.append(make('p',data.readyForReview?'Ready for dispatch review':'Review required before dispatch'));
   const size=section('Packaging fit check');
   const dims=['Length (mm)','Width (mm)','Height (mm)'].map((label,i)=>{
    const wrap=make('label',label),input=make('input');input.type='number';input.min='1';input.max='1500';input.required=true;input.inputMode='numeric';
    wrap.append(input);size.append(wrap);return input;
   });
   const fit=make('button','Find packaging that fits','button');fit.type='button';const fitResult=make('output');fitResult.setAttribute('aria-live','polite');
   fit.onclick=()=>{
    if(dims.some(x=>!x.validity.valid)){fitResult.textContent='Enter measured contents dimensions in millimetres.';return;}
    const sorted=dims.map(x=>x.valueAsNumber).sort((a,b)=>b-a);
    const matches=data.materials.filter(m=>m.available>0&&m.inner_mm.toSorted((a,b)=>b-a).every((n,i)=>n>=sorted[i]));
    fitResult.textContent=matches.length?matches.map(m=>m.title+' ('+m.sku+')').join(', '):'No available packaging fits those dimensions.';
   };
   size.append(fit,fitResult);target.append(size);
   const review=make('button','Review measured parcel','button');review.type='button';
   const result=make('output');result.setAttribute('aria-live','polite');
   review.addEventListener('click',()=>{
    try{
     const r=dispatchReview({stage:'packed',orderId:data.id,pack:{formats:[data.parcel.postalClass]},tracking:data.parcel.tracking},
      {format:data.parcel.postalClass,weighedGrams:data.parcel.grams,measuredOuterMm:data.parcel.outerMm});
     result.textContent=r.eligible?'Parcel fits the selected format. No dispatch recorded.':'Parcel does not fit the selected format.';
    }catch{result.textContent='Review the parcel dimensions and weight.';}
   });
   const label=make('button','Show 50 mm workshop label','button');label.type='button';
   label.addEventListener('click',()=>{
    if(parcel.querySelector('iframe'))return;
    const frame=make('iframe');frame.title='50 mm workshop label';frame.sandbox='';
    frame.srcdoc=workshopLabel({kind:'packaging',title:'Workshop mailer',reference:data.stock.sku,detail:data.reference});
    parcel.append(frame);
   });
   const controls=make('div',undefined,'dominion79-field');controls.append(review,label);parcel.append(controls,result);target.append(parcel);
  }else{
   const orders=section('Order reconciliation'),fin=section('Financial evidence'),review=section('Needs review');
   for(const order of data.orders){
    const label=make('h3',order.reference);
    const lines=make('ul');for(const line of order.lines)lines.append(make('li',line.quantity+' × '+(line.verifiedSku??'Unmapped listing')));
    orders.append(label,make('p',order.existingOrderId?'Existing external order matched':'No existing order matched'),lines);
    if(order.shipping)orders.append(make('p','Order-level shipping: '+money(order.shipping.minor)));
   }
   for(const item of data.finance)fin.append(make('p',item.kind+' evidence: '+money(item.amountMinor)+(item.reviewNeeded?' (review required)':' (linked for review)')));
   for(const item of data.review)review.append(make('p',item.kind.replaceAll('-',' ')+': '+item.reference));
   if(!data.review.length)review.append(make('p','No unresolved matches in this fixture.'));
   grid.append(orders,fin,review);target.append(grid);
  }
 }catch{
  if(!session.signal.aborted)status.textContent='Fixture evidence is unavailable. Reload to try again.';
 }
 d.addEventListener('admin:conceal',wipe,{once:true});
 return {destroy:wipe,lock:wipe};
}
