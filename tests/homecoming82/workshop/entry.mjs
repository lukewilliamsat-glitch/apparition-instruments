import { publicBackendConfig as config } from '../../backend/public-config.mjs?build=sentinel77a-c1';
import { boundedJSON } from '../command/bounded-json.mjs?build=sentinel77a-c1';

const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const code=/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;
const whole=(x,max=1000000)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const money=p=>p===null||p===undefined?'Not recorded':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(p/100);
const statuses=new Set(['disabled','observe','workshop']);
function check(payload,id){
 if(payload?.schema!==1||!statuses.has(payload.rollout)||typeof payload.canPick!=='boolean')return false;
 if(payload.rollout==='disabled')return !payload.canPick&&payload.order===null;
 const o=payload.order;
 return (!payload.canPick||payload.rollout==='workshop'&&o?.packingState==='reserved')&&o?.id===id&&code.test(o.reference)&&
   Array.isArray(o.picked)&&o.picked.length<=500&&o.picked.every(p=>typeof p.component==='string'&&code.test(p.component)&&
   whole(p.quantity)&&p.quantity>0&&whole(p.picked,p.quantity)&&whole(p.currentAvailable,1e12))&&
   Array.isArray(o.materials)&&o.materials.length<=25&&o.materials.every(p=>typeof p.title==='string'&&p.title.length<=300&&whole(p.available,1e12))&&
   ['packagingActualMinor','postageActualMinor','postageEstimatedMinor'].every(k=>o.cost?.[k]==null||whole(o.cost[k],10000000))&&
   (!payload.parcel||typeof payload.parcel.format==='string'&&whole(payload.parcel.grams,25000)&&
    Array.isArray(payload.parcel.outerMm)&&payload.parcel.outerMm.length===3&&payload.parcel.outerMm.every(v=>whole(v,1500)));
}
export function mountAdminWorkspace({document:d,auth}){
 const root=d.querySelector('#quartermaster-workshop');
 if(!root)return;
 const id=new URL(d.location.href).searchParams.get('order');
 const stop=new AbortController();
 const element=(tag,value,cls)=>{
  const node=d.createElement(tag);
  if(value!==undefined)node.textContent=value;
  if(cls)node.className=cls;
  return node;
 };
 const title=element('h1','Quartermaster'), nav=element('a',uuid.test(id??'')?'Back to this order':'Back to Orders');
 nav.href='/admin/orders/'+(uuid.test(id??'')?'?id='+encodeURIComponent(id):'');
 const message=element('p','Choose an existing paid order in Orders.');message.role='status';
 const record=element('div',undefined,'workshop-record');
 root.replaceChildren(nav,title,element('p','Packing stays separate from dispatch. This workspace cannot send a message, buy postage or change physical component stock.'),message,record);
 function lock(){stop.abort();root.replaceChildren();}
 async function request(kind,params){
  const signal=AbortSignal.any([AbortSignal.timeout(8000),stop.signal]);
  const token=await auth.accessToken({signal,bounded:true});
  if(!token)throw Error('Admin session required');
  const path=kind==='read'?'quartermaster82_review':'quartermaster80_pick';
  const method=kind==='read'?'GET':'POST';
  const r=await d.defaultView.fetch(config.url+'/rest/v1/rpc/'+path+(kind==='read'?'?'+new URLSearchParams(params):''),{
   method,headers:{Authorization:'Bearer '+token,apikey:config.publishableKey,...(kind==='pick'?{'Content-Type':'application/json'}:{})},
   body:kind==='pick'?JSON.stringify(params):undefined,signal,cache:'no-store',redirect:'error',credentials:'omit',referrerPolicy:'no-referrer'
  });
  if(!r.ok)throw Error('Workshop request declined');
  return boundedJSON(r,96000,{signal});
 }
 const submit=async({form,input,button,p})=>{
  if(!input.checkValidity()||!whole(input.valueAsNumber,p.quantity))return;
  const body={p_order:id,p_request:crypto.randomUUID(),p_component:p.component,p_expected:p.picked,p_quantity:input.valueAsNumber};
  for(const b of record.querySelectorAll('button'))b.disabled=true;
  try{
   const result=await request('pick',body);if(stop.signal.aborted)return;
   if(result?.picked!==body.p_quantity)throw Error('Unconfirmed pick');
   await populate();
  }catch{
   if(stop.signal.aborted)return;
   input.disabled=button.disabled=true;
   form.append(element('p','The save could not be confirmed. Reload before editing the count again.'));
  }
 };
 function section(name){const s=element('section');s.append(element('h2',name));record.append(s);return s;}
 async function populate(){
  record.replaceChildren();message.textContent='Loading packing record…';
  try{
   const result=await request('read',{p_order:id});
   if(stop.signal.aborted)return;
   if(!check(result,id))throw Error('Unrecognised workshop evidence');
   if(result.rollout==='disabled'){message.textContent='Packing is disabled. Existing Orders and dispatch are unchanged.';return;}
   const o=result.order;
   message.textContent=result.canPick?'Workshop picking enabled for '+o.reference+'.':'Read-only packing review for '+o.reference+'.';
   const picks=section('Saved order pick list');
   for(const p of o.picked){
    const label=String(p.name||p.component).slice(0,220);
    if(!result.canPick){picks.append(element('p',label+': '+p.picked+' / '+p.quantity+' picked'));continue;}
    const form=element('form',undefined,'workshop-pick'), line=element('label',label+' · '+p.quantity+' required');
    const input=element('input');input.type='number';input.required=true;input.min='0';input.max=String(p.quantity);input.step='1';input.value=String(p.picked);line.append(input);
    const button=element('button','Save picked count');button.type='submit';form.append(line,button);picks.append(form);
    form.addEventListener('submit',event=>{event.preventDefault();void submit({form,input,button,p});});
   }
   const material=section('Packaging availability');
   if(!o.materials.length)material.append(element('p','No packaging materials registered.'));
   for(const m of o.materials)material.append(element('p',m.title+': '+m.available+' available'));
   const cost=section('Packing and postage evidence');
   for(const [label,field] of [['Actually used packaging','packagingActualMinor'],['Postage estimate','postageEstimatedMinor'],['Recorded postage','postageActualMinor']])
    cost.append(element('p',label+': '+money(o.cost?.[field])));
   const parcel=section('Parcel and dispatch');
   if(result.parcel){
    const a=result.parcel;
    parcel.append(element('p',a.outerMm.join(' × ')+' mm · '+a.grams+' g · '+a.format),
     element('p',a.tracking?'Tracking evidence: '+String(a.tracking).slice(0,64):'Tracking not recorded.'));
   }
   parcel.append(element('p',o.readyForReview?'Packing ready for review. Mark dispatch separately in Orders.':'Dispatch readiness has not been confirmed.'));
  }catch{
   if(!stop.signal.aborted)message.textContent='No accessible packing record. Return to Orders or reload to try again.';
  }
 }
 if(uuid.test(id??''))void populate();
 return {lock,destroy:lock};
}
