const path=location.pathname,now=()=>new Date().toISOString(),d=document;
if(path.startsWith('/admin/delivery/')){
 const {bootDelivery}=await import('/admin/delivery/delivery.mjs');
 const methods=[{id:'standard',name:'UK Standard',description:'Royal Mail standard service',price:325,dispatchDays:1,deliveryDays:3,minOrder:0,minUnits:0},{id:'tracked',name:'UK Tracked',description:'Tracked Royal Mail',price:575,dispatchDays:1,deliveryDays:2,minOrder:1000,minUnits:1}];
 const example={methods,freeEnabled:true,freeThreshold:4500,promo:null,overrides:[{productId:'fixture-staging-cap',minUnits:3,price:425}]};
 const state={revision:4,active:structuredClone(example),draft:structuredClone(example),legacy:{...example,methods:[{...methods[0],price:399}],freeThreshold:5000},history:[{action:'draft',changed_at:now()},{action:'activate',changed_at:now()}]};
 const snap=()=>structuredClone(state);
 bootDelivery({repo:{
  deliveryRead:async()=>snap(),
  deliveryWrite:async(rev,action,config)=>{if(rev!==state.revision)throw Error('Settings changed. Reload.');if(action==='draft')state.draft=structuredClone(config);if(action==='activate')state.active=structuredClone(state.draft);if(action==='legacy')state.active=null;state.revision++;state.history.unshift({action,changed_at:now()});return snap();},
  deliveryPreview:async(c,total,items)=>c.methods.flatMap((m,i)=>total<m.minOrder||items.reduce((s,x)=>s+x.quantity,0)<m.minUnits?[]:[{...m,price:Math.max(...c.overrides.filter(r=>items.filter(x=>x.productId===r.productId).reduce((s,x)=>s+x.quantity,0)>=r.minUnits).map(r=>r.price),i===0&&(c.freeEnabled&&total>=c.freeThreshold||c.promo&&now()>=c.promo.start&&now()<c.promo.end)?0:m.price)}])
 }});
}
if(path.startsWith('/admin/site-operations/')){
 const {bootOperationsAdmin}=await import('/admin/site-operations/operations.mjs');
 const days=n=>new Date(Date.now()+86400000*n).toISOString();
 let store={desired_state:'ORDERS_PAUSED',pause_from:days(5),resume_at:days(9),updated_at:now(),customer_title:'Orders will take a short break',customer_message:'Browse, save your basket or use the workshop tools. New orders reopen once the break ends.',internal_reason:''};
 const events=[{id:2,action:'STORE_STATUS',actor:'fictional-admin',entity_id:'store',created_at:now(),before_state:{desired_state:'OPEN'},after_state:structuredClone(store)},{id:1,action:'NEWS_DRAFT',actor:'fictional-admin',entity_id:'fixture-news',created_at:days(-1),before_state:null,after_state:{title:'Workshop update'}}];
 const copy=()=>structuredClone(store);
 bootOperationsAdmin({repo:{store:async()=>copy(),posts:async()=>[],audit:async({category,before}={})=>events.filter(e=>(!before||e.id<before)&&(category==='all'||category==='store'&&e.action==='STORE_STATUS'||category==='news'&&e.action.startsWith('NEWS_'))),saveStore:async change=>{
  const before_state=copy();store={...store,...change,updated_at:now(),pause_from:change.desired_state==='OPEN'?null:change.mode==='now'?now():change.mode==='edit'?store.pause_from:change.pause_from,resume_at:change.desired_state==='OPEN'?null:change.resume_at};
  events.unshift({id:events.length+1,action:'STORE_STATUS',actor:'fictional-admin',entity_id:'store',created_at:now(),before_state,after_state:copy()});return copy();
 },savePost:async post=>({...post,id:'fixture-news'})}});
 d.querySelectorAll('[data-commercial-admin],[data-offer-studio]').forEach(x=>x.hidden=true);
}
if(path.startsWith('/admin/aftercare-direct/')){
 const {openAftercareDirect}=await import('/admin/orders/aftercare-direct.mjs');
 const history=[],order={id:'68a00000-0000-4000-8000-000000000003',reference:'AI-068001'};
 const recipient='overseer-buyer@example.invalid',sender='luke@apparitioninstruments.co.uk',mode='sink';
 const esc=x=>x.replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
 const activate=()=>openAftercareDirect(order,{history:async()=>[...history],request:async({action,template,subject,message})=>{
  if(action==='draft')return {mode,recipient,sender,subject:(template==='delivery_help'?'Delivery help':'Support')+' for eBay order {{order_number}}',message:'Hi {{first_name}},\n\nIf you need help with this order, please reply in your eBay order conversation.\n\nThanks,\nLuke'};
  const personalise=x=>x.replaceAll('{{first_name}}','Synthetic Buyer').replaceAll('{{order_number}}',order.reference);
  if(action==='preview')return {token:'fixture-preview',mode,recipient,sender,text:personalise(message),html:'<!doctype html><html><head></head><body style="font-family:system-ui"><h1>'+esc(personalise(subject))+'</h1><p>'+esc(personalise(message)).replaceAll('\n','<br>')+'</p></body></html>'};
  if(history.length)throw Error('An internal test is already recorded.');
  history.push({state:'sink_recorded',subject:personalise(subject),created_at:now()});return {message:'Fixture message recorded. No email sent.'};
 }});
 document.querySelector('#open-aftercare').addEventListener('click',activate);
}
