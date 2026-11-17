import {draftAcquisition} from '../ironclad/model.mjs';
import {decimal,decimalText} from './economics.mjs';
import {commercialOrderDay} from './commercial-date.mjs';
import {applyPreset,financeSummary,safePart,suggestedPreset,updateFee,withSnapshot} from './eclipse-model.mjs';
const fmt=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
const cash=n=>Number.isSafeInteger(n)?fmt.format(n/100):'Unknown';
function node(d,tag,text,cls){const n=d.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
export function mountEclipse({root,order,initialDocument,document:d=globalThis.document,libraryRepository,persistence,historicalCosts,advanced=()=>{}}){
 const make=(...a)=>node(d,...a);let draft=structuredClone(initialDocument),library=null,invalid=new Set(),feeProblems=new Map(),pending=false,disposed=false;
 const panel=make('section',null,'eclipse-finance'),heading=make('header',null,'eclipse-head'),title=make('div'),actions=make('div',null,'eclipse-actions');
 title.append(make('p','BLACK LEDGER / ECLIPSE','eclipse-kicker'),make('h2','Order Financials'),make('p',order.reference+' · '+({WEBSITE:'Website',EBAY:'eBay',DIRECT:'Direct',OTHER:'Other marketplace'}[order.channel]||order.channel)+' · '+commercialOrderDay(order)));
 const advance=make('button','Advanced reconciliation','button');advance.type='button';advance.dataset.eclipseAdvanced='';advance.addEventListener('click',advanced);
 actions.append(advance);heading.append(title,actions);
 const cards=make('div',null,'eclipse-cards');const values={};for(const [key,label,help] of [['sale','Buyer payment','Recorded gross including customer postage'],['contribution','Order contribution','Selling income less direct costs'],['margin','Contribution margin','Contribution ÷ net seller revenue']]){
  const item=make('div',null,'eclipse-card'),value=make('strong','Unknown');value.dataset.eclipseMetric=key;item.append(make('small',label),value,make('small',help));cards.append(item);values[key]=value;
 }
 const feedback=make('p','', 'finance-error');feedback.setAttribute('role','status');
 const group=(caption,parent=panel)=>{
  const f=make('fieldset'),grid=make('div',null,'eclipse-grid');
  f.append(make('legend',caption),grid);parent.append(f);return {f,grid};
 };
 function input(parent,label,value,cb,{money=false,scale=2,integer=false,maxLength=160}={}){
  const wrap=make('label',label,'eclipse-field'),i=make('input');i.type=integer?'number':'text';
  if(integer){i.min='1';i.max='99';i.step='1';}
  if(money)i.inputMode='decimal';
  i.setAttribute('aria-label',label);i.maxLength=maxLength;i.value=value==null?'':money?decimalText(value,scale):String(value);
  i.addEventListener('input',()=>{
   try{
    let v=i.value.trim();
    if(money)v=v===''?null:decimal(v,scale);
    if(integer){if(!/^\d+$/.test(v)||Number(v)<1||Number(v)>99)throw Error('Use a whole quantity from 1 to 99.');v=Number(v);}
    cb(v);invalid.delete(i);i.removeAttribute('aria-invalid');feedback.textContent='';
   }catch(e){invalid.add(i);i.setAttribute('aria-invalid','true');feedback.textContent=e.message;}
   recalc();
  });
  wrap.append(i);parent.append(wrap);return i;
 }
 function select(parent,label,choices,value,cb){
  const l=make('label',label,'eclipse-field'),s=make('select');
  for(const [key,name] of choices){const o=make('option',name);o.value=key;s.append(o);}
  s.setAttribute('aria-label',label);s.value=value;s.addEventListener('change',()=>{try{cb(s.value);invalid.delete(s);feedback.textContent='';}catch(e){invalid.add(s);feedback.textContent=e.message;}recalc();});l.append(s);parent.append(l);return s;
 }
 function button(parent,label,cb){
  const b=make('button',label,'button');b.type='button';b.addEventListener('click',cb);parent.append(b);return b;
 }
 const evidence=[['estimated','Estimated'],['confirmed','Confirmed from evidence']];
 panel.append(heading,cards,feedback);
 const sale=group('Sale income');
 const split=make('div',null,'eclipse-table');
 const splitValues={};for(const [key,label] of [['goods','Products excluding postage'],['post','Customer postage'],['refunds','Recorded order refunds']]){
  const row=make('div'),amount=make('span','Unknown');row.append(make('span',label),amount);split.append(row);splitValues[key]=amount;
 }
 sale.f.append(split);
 if(order.channel!=='WEBSITE'){
  input(sale.grid,'Gross buyer payment including postage',draft.actualPaidMinor,v=>{draft.actualPaidMinor=v;},{money:true});
  input(sale.grid,'Customer postage already included',draft.postageMinor,v=>{draft.postageMinor=v??order.pricing.delivery;},{money:true});
  sale.f.append(make('small','Use the buyer total before fees. A net marketplace payout belongs in advanced reconciliation.'));
  if(draft.marketplaceTaxMinor===null||draft.marketplaceTaxMinor===0){
   const label=make('label'),check=make('input');check.type='checkbox';check.checked=draft.marketplaceTaxState==='confirmed'&&draft.marketplaceTaxMinor===0;
   check.addEventListener('change',()=>{draft.marketplaceTaxMinor=check.checked?0:null;draft.marketplaceTaxState=check.checked?'confirmed':'unknown';draft.marketplaceTaxSource=check.checked?'Admin checked buyer statement: no marketplace tax withheld.':'';recalc();});
   label.append(check,d.createTextNode(' I checked the buyer statement: no marketplace tax was withheld'));sale.f.append(label);
  }
 }else sale.f.append(make('small','Order prices, shipping and recorded refunds fill this section. Recorded prices already include any applied discounts. A missing provider fee stays unknown.'));
 const fees=group(order.channel==='EBAY'?'eBay selling costs':'Selling costs');
 for(const [category,label] of order.channel==='EBAY'?[['marketplace','eBay transaction fee'],['advertising','eBay advertising fee']]:[['payment','Payment processing fee'],['advertising','Advertising fee']]){
  const rows=draft.fees.filter(x=>x.category===category),row=rows[0];
  const fields=make('div',null,'eclipse-field');fees.grid.append(fields);
  if(rows.length>1||rows.some(x=>x.direction!=='charge'||x.method!=='fixed'||x.includes?.length)||draft.fees.some(x=>x.includes?.includes(category))){
   fields.append(make('p',label+' has combined, percentage or credit entries. Review these in Advanced reconciliation.'));continue;
  }
  let amount=row?.actualMinor??row?.amountMinor??null,state=row?.state==='confirmed'?'confirmed':'estimated',source=row?.source||'';
  const apply=()=>{try{draft=updateFee(draft,category,amount,state,source);feeProblems.delete(category);}catch(e){feeProblems.set(category,e.message);}};
  input(fields,label,amount,v=>{if(v!==amount){state='estimated';source='';feeState.value=state;feeRef.value='';}amount=v;apply();},{money:true});
  const feeState=select(fields,label+' status',evidence,state,v=>{state=v;apply();});
  const feeRef=input(fields,label+' evidence',source,v=>{source=v;apply();});
 }
 const reviewed=make('label'),complete=make('input');complete.type='checkbox';complete.checked=draft.feesComplete;
 complete.addEventListener('change',()=>{draft.feesComplete=complete.checked;recalc();});
 reviewed.append(complete,d.createTextNode(' Reviewed all fees, including evidenced zero costs'));fees.f.append(reviewed);
 const goods=group('Acquisition costs'),costInputs=[];const evidenceAbort=new AbortController();
 for(const [i,line] of draft.lines.entries()){
  const fields=make('div',null,'eclipse-field'),label=line.quantity+' × '+line.label;
  fields.append(make('p',label));goods.grid.append(fields);
  const entry=()=>draft.lines[i];
  const amount=input(fields,'Unit acquisition cost for '+line.label,line.unitCostMicro,v=>{const x=entry();if(v!==x.unitCostMicro){x.costState=v==null?'unknown':'estimated';if(v==null)delete x.costProvenance;else x.costProvenance={basis:'current_estimate'};x.costSource='';costState.value=x.costState;costRef.value='';}x.unitCostMicro=v;},{money:true,scale:6});
  const costState=select(fields,'Acquisition evidence for '+line.label,[['unknown','Unknown'],...evidence],line.costState,v=>{
   const x=entry();x.costState=v;
   if(v==='confirmed'&&!['historical_snapshot','manual_evidenced'].includes(x.costProvenance?.basis))x.costProvenance={basis:'manual_evidenced'};
   if(v==='estimated'&&x.costProvenance?.basis==='manual_evidenced')x.costProvenance={basis:'current_estimate'};
  });
  const costRef=input(fields,'Acquisition reference for '+line.label,line.costSource,v=>{entry().costSource=v;});costInputs.push({amount,costState,costRef});
 }
 goods.f.append(make('small','Unknown unit costs stay unknown. Current component references are estimates and can be loaded in Advanced reconciliation.'));
 if(historicalCosts)button(goods.f,'Review IRONCLAD acquisition evidence',async event=>{
  const load=event.currentTarget;load.disabled=true;
  try{
   const rows=await historicalCosts(evidenceAbort.signal);if(disposed)return;
   if(!Array.isArray(rows)||rows.length>100)throw Error('Unexpected acquisition projection.');
   let count=0;
   for(const row of rows){
    const i=row.line_index,got=draftAcquisition(draft.lines[i],row);
    if(!got)continue;
    draft.lines[i]=got;const c=costInputs[i];c.amount.value=decimalText(got.unitCostMicro,6);c.costState.value=got.costState;c.costRef.value=got.costSource;count++;
   }
   feedback.textContent=count?count+' evidence-backed line(s) copied to the unsaved draft. Review before saving.':'No new matching acquisition costs for unknown lines.';
   recalc();
  }catch(e){if(!disposed)feedback.textContent=e.message;}
  finally{if(!disposed)load.disabled=false;}
 });

 const costs=group('Postage and other fulfilment');
 for(const [k,title] of [['shipping','Actual postage expenditure'],['other','Other direct costs']]){
  const col=make('div',null,'eclipse-field');costs.grid.append(col);const get=()=>draft.costs[k];
  input(col,title,get().minor,v=>{const x=get();if(v!==x.minor){x.state=v==null?'unknown':'estimated';x.source='';costState.value=x.state;costRef.value='';}x.minor=v;},{money:true});
  const costState=select(col,title+' evidence',[['unknown','Unknown'],...evidence],get().state,v=>{get().state=v;});
  const costRef=input(col,title+' reference',get().source,v=>{get().source=v;});
 }
 const packing=group('Packaging and consumables'),picker=make('div',null,'eclipse-actions'),snapView=make('div',null,'eclipse-grid'),libMsg=make('p','Load the cost library to apply a preset. Costs are snapshotted on save.');
 libMsg.setAttribute('role','status');packing.f.append(picker,libMsg,snapView);
 let preset='',addId='',actualSource=draft.costs.packaging.source||'';
 const presetWrap=make('div'),addWrap=make('div');picker.append(presetWrap,addWrap);
 const renderPicker=()=>{
  presetWrap.replaceChildren();addWrap.replaceChildren();
  if(!library)return;
  const presets=library.presets.filter(x=>x.active),items=library.items.filter(x=>x.active);
  if(presets.length){
   select(presetWrap,'Packaging preset',[['','Choose a preset'],...presets.map(p=>[p.id,p.name])],preset,v=>{preset=v;});
   button(presetWrap,'Apply preset estimate',()=>{try{draft=applyPreset(draft,library,preset);feedback.textContent='';renderSnapshot();recalc();}catch(e){feedback.textContent=e.message;}});
  }
  if(items.length){
   select(addWrap,'Additional consumable',[['','Choose a consumable'],...items.map(i=>[i.id,i.name])],addId,v=>{addId=v;});
   button(addWrap,'Add consumable',()=>{try{
    const i=items.find(x=>x.id===addId);if(!i)throw Error('Select an active consumable.');
    const snap=structuredClone(draft.fulfilmentSnapshot||{presetId:'custom-packaging',presetName:'Custom packaging',libraryRevision:library.revision,items:[]});
    if(snap.items.some(x=>x.id===i.id))throw Error('Adjust the quantity on the item already added.');
    snap.items.push({id:i.id,name:i.name,unitMinor:i.unitMinor,quantity:i.quantity});
    draft=withSnapshot(draft,snap);renderSnapshot();feedback.textContent='';recalc();
   }catch(e){feedback.textContent=e.message;}});
  }
 };
 function renderSnapshot(){
  snapView.replaceChildren();
  const snap=draft.fulfilmentSnapshot;
  if(!snap){snapView.append(make('p','Packaging: '+cash(draft.costs.packaging.minor)+' · '+draft.costs.packaging.state));return;}
  snapView.append(make('p',snap.presetName+' · library revision '+snap.libraryRevision+' · '+draft.costs.packaging.state));
  snap.items.forEach((item,index)=>{
   const box=make('div',null,'eclipse-field');snapView.append(box);box.append(make('strong',item.name));
   const update=(key,v)=>{const next=structuredClone(draft.fulfilmentSnapshot);next.items[index][key]=v;draft=withSnapshot(draft,next);};
   input(box,'Quantity for '+item.name,item.quantity,v=>update('quantity',v),{integer:true});
   input(box,'Unit cost for '+item.name,item.unitMinor,v=>update('unitMinor',v),{money:true});
   button(box,'Remove '+item.name,()=>{const next=structuredClone(draft.fulfilmentSnapshot);next.items.splice(index,1);if(next.items.length)draft=withSnapshot(draft,next);else{delete draft.fulfilmentSnapshot;draft.costs.packaging={minor:null,state:'unknown',source:''};}renderSnapshot();recalc();});
  });
  const confirmBox=make('div',null,'eclipse-field');snapView.append(confirmBox);
  input(confirmBox,'Actual packaging evidence',actualSource,v=>{actualSource=v;});
  button(confirmBox,'Confirm actual packaging cost',()=>{try{draft=withSnapshot(draft,draft.fulfilmentSnapshot,'confirmed',actualSource);renderSnapshot();feedback.textContent='';recalc();}catch(e){feedback.textContent=e.message;}});
 }
 function loadLibrary(){
  if(pending||disposed)return;pending=true;libMsg.textContent='Loading fulfilment cost library…';
  libraryRepository.read().then(value=>{
   if(disposed)return;library=value;preset=suggestedPreset(library,order);addId='';renderPicker();
   libMsg.textContent=preset?'Suggested preset selected. Apply it as an estimate or choose another.':'Choose reusable costs or add a custom mix.';
  },e=>{if(!disposed)libMsg.textContent=e.message;}).finally(()=>{pending=false;});
 }
 if(libraryRepository)button(picker,'Load cost library',loadLibrary);renderSnapshot();
 const breakSection=group('Contribution breakdown'),breakdown=make('div',null,'eclipse-table');breakSection.f.append(breakdown);
 const save=button(actions,'Save financial record',()=>persistence?.save());save.dataset.financeSave='';
 if(!persistence){save.disabled=true;save.title='This preview cannot write financial data.';}
 function recalc(){
  const result=financeSummary(draft),c=result.calculation;
  values.sale.textContent=cash(draft.actualPaidMinor);values.contribution.textContent=cash(result.contribution);
  values.margin.textContent=result.margin==null?'Unknown':result.margin+'%';
  splitValues.goods.textContent=cash(safePart(draft));splitValues.post.textContent=cash(draft.postageMinor);splitValues.refunds.textContent=cash(order.refundedPence??0);
  breakdown.replaceChildren();
  for(const [name,value] of [['Net seller revenue',c?.netRevenueMinor],['Transaction and processing fees',c?.feesMinor==null?null:c.feesMinor-(c.feesByCategory.advertising||0)],['Advertising fees',c?.feesMinor==null?null:c.feesByCategory.advertising||0],['Acquisition costs',c?.cogsMinor],['Postage expenditure',c?.fulfilmentCosts.shipping],['Packaging',c?.fulfilmentCosts.packaging],['Other direct costs',c?.fulfilmentCosts.other],['Contribution',c?.contributionMinor]]){
   const row=make('div');row.append(make('span',name),make('strong',cash(value)));breakdown.append(row);
  }
  const warnings=[...feeProblems.values(),...(result.error?[result.error]:[]),...(c?.unknown||[]),...(c?.provisional||[]),...(c?.warnings||[])];
  if(warnings.length)breakdown.append(make('small',result.status+' · '+warnings.slice(0,2).join(' ')));
  persistence?.update(JSON.parse(JSON.stringify(draft)),invalid.size===0&&feeProblems.size===0&&!!c);
 }
 root.append(panel);recalc();
 return {panel,snapshot:()=>structuredClone(draft),dispose(){disposed=true;evidenceAbort.abort();panel.remove();}};
}
