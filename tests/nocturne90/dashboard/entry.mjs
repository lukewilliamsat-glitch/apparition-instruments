import {financeRepository} from './repository.mjs';
import {parsePounds,pricePlan,reportRange,validateRange,report,csv,channels} from './model.mjs';
import {collectPeriod, financialDashboard, previousPeriod} from './dashboard.mjs?build=nocturne90-dashboard';
import {londonDay} from '../orders/commercial-date.mjs?build=sentinel77a-c1';

export function mountAdminWorkspace({document:d=globalThis.document,auth,repository=financeRepository({auth})}={}){
 const root=d.querySelector('#omniscience-workspace'), stop=new AbortController(), e=(tag,text,cls)=>{const n=d.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 if(!root)return null;
 const state={orders:[],outlays:[],complete:false,valid:false,comparison:null,comparisonText:''};
 let reading=null,selected=null,busy=false,retryKey=null;
 const addField=(where,label,opts={})=>{
  const n=e('label',label), inp=e(opts.options?'select':'input');inp.name=opts.name||'';inp.setAttribute('aria-label',label);
  if(opts.options)for(const [key,value] of opts.options){const o=e('option',value);o.value=key;inp.append(o);}
  else{inp.type=opts.type||'text';inp.required=opts.required??true;inp.autocomplete='off';if(opts.decimal)inp.inputMode='decimal';inp.maxLength=opts.max||140;}
  if(opts.value!=null)inp.value=opts.value;
  n.append(inp);where.append(n);return inp;
 };
 function button(title,place,handler){const b=e('button',title);b.type='button';b.addEventListener('click',handler);place.append(b);return b;}
 const group=where=>{const fields=e('div',null,'controls');where.append(fields);return fields;};
 const live=where=>{const n=e('p');n.setAttribute('role','status');where.append(n);return n;};
 function table(place,title,head,rows){
  if(!rows.length)return;
  const sc=e('div',null,'scroll'), t=e('table'), th=e('thead'),tr=e('tr'),tb=e('tbody');
  sc.tabIndex=0;sc.setAttribute('role','region');sc.setAttribute('aria-label',title);
  for(const label of head){const cell=e('th',label);cell.scope='col';tr.append(cell);}th.append(tr);
  t.append(e('caption',title),th,tb);sc.append(t);place.append(sc);
  for(const line of rows){const rr=e('tr');for(const value of line){const td=e('td');if(typeof value==='string'||typeof value==='number')td.textContent=value;else if(value)td.append(value);rr.append(td);}tb.append(rr);}
 }
 const money=(n,c='GBP')=>n===null||n===undefined?'Not recorded':new Intl.NumberFormat('en-GB',{style:'currency',currency:c}).format(n/100);
 const top=e('header'),home=e('a','COMMAND Admin');home.href='/admin/';top.append(home,e('p','BLACK LEDGER / OMNISCIENCE','kicker'),e('h1','Business financials'),
  e('p','Sales, order contribution and recorded business expenditure.'));root.append(top);
 const calc=e('details');calc.append(e('summary','Pricing and break-even calculator'));
 const costform=e('form'), cg=group(costform),vf={}, priceLabels={acquisition:'Acquisition £',packaging:'Packaging £',postage:'Actual postage £',customerPostage:'Buyer postage £',fixedFee:'Fixed channel fees £',marketplace:'Marketplace fee %',advertising:'Advertising fee %',payment:'Processing fee %',tax:'Other tax assumption %',margin:'Target margin %',target:'Target contribution £'};
 for(const [key,title] of Object.entries(priceLabels))vf[key]=addField(cg,title,{name:key,value:'0.00',decimal:true,max:16});
 const ca=e('div',null,'actions'), submit=e('button','Calculate prices');submit.type='submit';ca.append(submit);const price=live(costform);
 costform.append(ca);
 calc.append(e('p','Estimate only. Percentage assumptions apply to the full customer payment, including postage. The calculator changes no catalogue prices.'),costform);
 costform.addEventListener('submit',event=>{event.preventDefault();try{
  const p=pricePlan(Object.fromEntries(Object.entries(vf).map(([k,v])=>[k,parsePounds(v.value)])));
  price.textContent='Break-even product price '+money(p.breakEven)+' · Target '+money(p.targetPrice)+' · Contribution '+money(p.contribution)+' · Margin '+(p.margin==null?'Not defined':p.margin.toFixed(2)+'%')+' · Estimated fee and tax deductions '+money(p.deductions)+'.';
 }catch(err){price.textContent=err.message;}});
 const work=e('section');work.append(e('h2','Reporting period'));root.append(work);
 const rf=e('form'), fields=group(rf), presets=addField(fields,'Period',{options:[['day','Today'],['week','Week to date'],['month','Month to date'],['quarter','Quarter to date'],['year','Year to date'],['custom','Custom period']],value:'month'}),
 from=addField(fields,'From',{type:'date',value:reportRange('month').from}),to=addField(fields,'To (inclusive)',{type:'date',value:reportRange('month').to});
 presets.addEventListener('change',()=>{if(presets.value!=='custom'){const r=reportRange(presets.value);from.value=r.from;to.value=r.to;}});
 for(const el of [from,to])el.addEventListener('change',()=>{presets.value='custom';});
 const action=e('div',null,'actions'), load=e('button','Load period');load.type='submit';action.append(load);rf.append(action);work.append(rf);
 const notice=live(work), errLine=e('p');errLine.setAttribute('role','alert');work.append(errLine);
 const data=e('div');root.append(data);
 const tools=e('details');tools.append(e('summary','Reports and exports'));
 const exportOrders=button('Export loaded orders',tools,()=>download('orders',orderRows(true)));
 const exportOutlays=button('Export loaded expenses and director purchases',tools,()=>download('outlays',outlayRows(true)));
 tools.append(calc);root.append(tools);
 const exp=e('details');exp.append(e('summary','Record an expense or director purchase'),e('p','One entry per receipt or invoice. If the cost already appears on an order or purchase record, choose Recorded elsewhere and enter its reference. Reimbursements record money already paid and never send money.'));
 root.append(exp);
 const ef=e('form'), eg=group(ef), add=(title,name,props={})=>addField(eg,title,{name,...props});
 const date=add('Purchase date','date',{type:'date',value:londonDay()}), vendor=add('Supplier','vendor',{max:100}),
 category=add('Category','category',{options:['Software subscriptions','Hosting','Tools and equipment','Marketing','Components and stock','Packaging','Office consumables','Professional services','Business travel','Other business cost'].map(x=>[x,x])}),
 purpose=add('Business purpose','purpose',{max:180}), curr=add('Currency','currency',{options:['GBP','USD','EUR'].map(x=>[x,x])}),
 original=add('Amount paid in selected currency','original',{decimal:true,max:14}),
 gbp=add('Actual GBP amount (foreign purchases only)','gbp',{decimal:true,required:false,max:14}),
 funding=add('Paid by','funding',{options:[['business','Business'],['director','Director personally']]}),
 treatment=add('Where to count this cost','treatment',{options:[['overhead','Recorded overhead'],['stock','Stock acquisition (excluded from overhead)'],['recorded-elsewhere','Already recorded elsewhere (excluded)']]}),
 evidence=add('Unique evidence reference','evidence'),link=add('Existing purchase or order reference','link',{required:false}),
 recurring=add('Recurring','recurring',{options:[['no','One-off'],['yes','Recurring']]}),notes=add('Notes','notes',{required:false,max:400});
 function conditional(){gbp.parentElement.hidden=curr.value==='GBP';gbp.required=curr.value!=='GBP';link.parentElement.hidden=treatment.value!=='recorded-elsewhere';link.required=treatment.value==='recorded-elsewhere';}
 curr.addEventListener('change',conditional);treatment.addEventListener('change',conditional);conditional();
 const eb=e('button','Record purchase');eb.type='submit';ef.append(eb);const efmsg=live(ef);exp.append(ef);
 const reimb=e('section');reimb.hidden=true;const reimbTitle=e('h2','Record reimbursement'),ri=e('form'),rig=group(ri),rd=addField(rig,'Payment date',{type:'date',value:londonDay()}),ra=addField(rig,'Paid in GBP',{decimal:true,max:14}),re=addField(rig,'Payment evidence reference',{max:140}),rb=e('button','Record completed reimbursement');rb.type='submit';
 ri.append(rb);button('Cancel',ri,()=>{selected=null;reimb.hidden=true;});const rimsg=live(ri);reimb.append(reimbTitle,ri);root.append(reimb);
 function controls(){load.disabled=!!reading;
  exportOrders.disabled=!state.valid||!!reading||!state.orders.length;exportOutlays.disabled=!state.valid||!!reading||!state.outlays.length;eb.disabled=rb.disabled=busy;}
 function download(type,rows){
  const url=URL.createObjectURL(new Blob([csv(rows)],{type:'text/csv;charset=utf-8'}));
  const a=e('a');a.href=url;a.download='apparition-'+type+'-'+state.range.from+'-to-'+state.range.to+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);
 }
 function orderRows(exporting=false){
  const title=['Day','Order','Channel','Currency','Buyer order total','Recorded order refund','Evidence','Verified seller revenue','Verified contribution'];
  const display=(v,c)=>exporting?(v==null?'':v/100):money(v,c);
  const rows=report(state.orders).detail.map(r=>{
   const a=e('a',r.reference);a.href='/admin/orders/?id='+encodeURIComponent(r.id);
   return [r.day,exporting?r.reference:a,channels[r.channel],r.currency,display(r.total,r.currency),display(r.refund,r.currency),r.label,
    display(r.state==='recorded'?r.calculation.netRevenueMinor:null,r.currency),display(r.state==='recorded'?r.calculation.contributionMinor:null,r.currency)];
  });return exporting?[title,...rows]:rows;
 }
 function outlayRows(exporting=false){
  const rows=state.outlays.map(o=>{
   const show=(n,c)=>exporting?n/100:money(n,c), personal=o.funding==='director', due=personal?o.sterling_minor-o.reimbursed:0;
   let act='';if(!exporting&&due>0){act=e('button','Record reimbursement');act.type='button';act.onclick=()=>{selected=o;reimb.hidden=false;reimbTitle.textContent='Record reimbursement: '+o.vendor;ra.value='';re.value='';rimsg.textContent='Balance '+money(due);rd.focus();};}
   const row=[o.day,o.vendor,o.category,o.purpose,o.currency,show(o.original_minor,o.currency),show(o.sterling_minor,'GBP'),o.funding,o.treatment,
    personal?show(o.reimbursed,'GBP'):'',personal?show(due,'GBP'):''];
   return exporting?[...row,o.last_reimbursement||'',o.evidence,o.external_reference,o.recurring?'recurring':'one-off',o.notes]:[...row,act];
  });
  return exporting?[['Date','Supplier','Category','Business purpose','Currency','Paid amount','GBP','Funding','Treatment','Reimbursed GBP','Outstanding GBP','Latest reimbursement date','Evidence','Existing reference','Recurrence','Notes'],...rows]:rows;
 }
 function paint(){
  data.replaceChildren();controls();if(!state.valid)return;
  const r=report(state.orders), op=e('section');
  if(state.complete){
   data.append(financialDashboard(d,{report:r,range:state.range,outlays:state.outlays,previous:state.comparison,
    compare:reading||state.comparison?null:compare,compareText:state.comparisonText}));
  }else{
   const partial=e('p','This period exceeds the 250-record limit for orders or expenses. Choose a shorter period for dashboard totals. The loaded records remain available below.','nocturne-status');
   partial.setAttribute('role','status');data.append(partial);
  }
  const details=e('details');
  details.append(e('summary','Detailed sales and expense records'),op);
  data.append(details);
  op.append(e('h2',state.complete?'Period detail':'Loaded records only'));
  const head=['Group','Orders','Verified','Estimated','Needs review','Buyer total','Order refunds','Verified revenue','Verified contribution','Verified margin','Confirmed settlement','Fees','Marketplace','Ads','Payment','Acquisition','Postage','Packaging','Recorded discounts'];
  function groupRows(source){return source.map(g=>{
   const moneyOrUnknown=n=>g.recorded?money(n,g.currency):'Not recorded';
   return [g.key.replace(/^(\w+):/,(_,k)=>(channels[k]||k)+' · '),g.orders,g.recorded,g.estimated,g.needsReview,money(g.buyerPaid,g.currency),money(g.actualRefund,g.currency),
    moneyOrUnknown(g.sellerRevenue),moneyOrUnknown(g.contribution),g.margin==null?'Not recorded':g.margin.toFixed(2)+'%',g.settlementCount?money(g.settlement,g.currency):'Not recorded',
    moneyOrUnknown(g.fees), ...['marketplace','advertising','payment'].map(k=>g[k+'Count']?money(g[k],g.currency)+(g[k+'Count']===g.recorded?'':' ('+g[k+'Count']+'/'+g.recorded+' separately itemised)'):'Not separately itemised'),
    ...['cogs','shipping','packaging','discount'].map(k=>moneyOrUnknown(g[k]))];
  });}
  table(op,'Period by currency',head,groupRows(r.totals));table(op,'Sales channels',head,groupRows(r.channels));
  const products=e('section');products.append(e('h2','Historical product sales'),e('p','Line prices use the order snapshot. Product contribution is shown only for verified single-product orders, including their postage, fees and refunds. Shared costs in mixed orders are not guessed.'));
  table(products,'Product evidence by channel',['Historical item','Channel','Units','Line sales','Average price','Units with confirmed cost','Confirmed acquisitions','Single-product order contribution'],r.products.map(x=>[x.name,channels[x.channel],x.units,money(x.sales,x.currency),money(x.average,x.currency),x.covered,x.covered?money(x.cost,x.currency):'Not recorded',x.attributedOrders?money(x.contribution,x.currency)+' ('+x.attributedOrders+' orders)':'Not attributed']));details.append(products);
  const orders=e('section');orders.append(e('h2','Source orders'));
  table(orders,'Orders loaded',['Day','Order','Channel','Currency','Buyer order total','Recorded order refund','Evidence','Verified seller revenue','Verified contribution'],orderRows());details.append(orders);
  const spend=e('section');spend.append(e('h2','Expense and director purchase register'));
  table(spend,'Recorded purchases',['Date','Supplier','Category','Purpose','Currency','Actually paid','GBP','Funding','Treatment','Reimbursed','Still owed','Action'],outlayRows());details.append(spend);
 }
 async function compare(){
  if(reading||!state.complete)return;
  const read=new AbortController();reading=read;
  const signal=AbortSignal.any([stop.signal,read.signal]);
  const range=previousPeriod(state.range);
  state.comparisonText='Loading the previous period…';paint();
  try{
   const result=await collectPeriod(repository.orders,range,signal);
   if(signal.aborted)return;
   if(result.complete){
    state.comparison=report(result.rows);
    state.comparisonText='Compared with '+range.from+' to '+range.to+'.';
   }else state.comparisonText='The previous period exceeded the reporting limit. Narrow the selected period to compare.';
  }catch(error){if(!signal.aborted)state.comparisonText=error.message;}
  finally{if(reading===read){reading=null;if(!stop.signal.aborted)paint();}}
 }
 async function refresh(){
  try{state.range=validateRange(from.value,to.value);}catch(error){errLine.textContent=error.message;return;}
  reading?.abort();state.orders=[];state.outlays=[];state.complete=false;state.valid=false;
  state.comparison=null;state.comparisonText='';errLine.textContent='';data.replaceChildren();
  const read=new AbortController();reading=read;controls();
  notice.textContent='Loading the selected period…';const signal=AbortSignal.any([stop.signal,read.signal]);
  try{
   const [orders,outlays]=await Promise.all([
    collectPeriod(repository.orders,state.range,signal),
    collectPeriod(repository.outlays,state.range,signal)
   ]);
   if(signal.aborted)return;
   state.orders=orders.rows;state.outlays=outlays.rows;
   state.complete=orders.complete&&outlays.complete;state.valid=true;
   notice.textContent=state.complete?'All pages for this period loaded.':'Period exceeds the reporting limit.';
  }catch(error){if(!signal.aborted){errLine.textContent=error.message;notice.textContent='Report unavailable.';read.abort();}}
  finally{if(reading===read){reading=null;if(!stop.signal.aborted)paint();}}
 }
 rf.addEventListener('submit',event=>{event.preventDefault();void refresh();});
 async function write(kind,values,notification,reset){
  if(busy)return;
  const fingerprint=JSON.stringify({kind,values});
  if(retryKey?.fingerprint!==fingerprint)retryKey={fingerprint,id:crypto.randomUUID()};
  busy=true;controls();notification.textContent='Recording…';
  try{
   const reply=await repository[kind](retryKey.id,values,stop.signal);
   if(stop.signal.aborted)return;
   retryKey=null;reset();notification.textContent=reply.duplicate?'Already recorded. No duplicate created.':'Recorded. No external payment was made.';if(state.valid)await refresh();
  }catch(err){if(!stop.signal.aborted)notification.textContent=err.message;}
  finally{busy=false;controls();}
 }
 ef.addEventListener('submit',event=>{event.preventDefault();try{
  const o=parsePounds(original.value),g=curr.value==='GBP'?o:parsePounds(gbp.value);
  if(!o||!g)throw Error('Enter the actual amount paid.');
  void write('outlay',{date:date.value,vendor:vendor.value,category:category.value,purpose:purpose.value,original:o,currency:curr.value,gbp:g,
   funding:funding.value,treatment:treatment.value,evidence:evidence.value,link:link.required?link.value:'',recurring:recurring.value==='yes',notes:notes.value},efmsg,()=>{ef.reset();date.value=londonDay();conditional();});
 }catch(err){efmsg.textContent=err.message;}});
 ri.addEventListener('submit',event=>{event.preventDefault();try{if(!selected)throw Error('Select a director purchase.');
  const amount=parsePounds(ra.value), remaining=selected.sterling_minor-selected.reimbursed;if(!amount||amount>remaining)throw Error('Enter a positive amount up to the outstanding balance.');
  void write('reimburse',{p_outlay:selected.id,p_date:rd.value,p_gbp:amount,p_evidence:re.value},rimsg,()=>{ri.reset();selected=null;});
 }catch(err){rimsg.textContent=err.message;}});
 function dispose(){stop.abort();reading?.abort();root.replaceChildren();}
 void refresh();return {lock:dispose,destroy:dispose};
}
