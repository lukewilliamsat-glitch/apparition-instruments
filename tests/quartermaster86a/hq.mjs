import { drawManagement } from './manage.mjs?build=quartermaster86a';
const base = '/admin/quartermaster/';
const sections = [
  ['overview','Overview'], ['packaging','Packaging'], ['purchasing','Purchasing'],
  ['queue','Packing queue'], ['suppliers','Suppliers'], ['activity','Activity']
];
const stageNames = {awaiting:'Awaiting packing',packing:'Packing in progress',packed:'Packed, awaiting dispatch'};
const eventNames = {receipt:'Packaging received',reservation:'Packaging reserved',release:'Reservation released',
  adjustment:'Inventory correction',pack:'Pack completed',postage:'Postage recorded',finance:'Packing costs approved'};
const currency = new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
const dateTime = new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'});
const date = new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'});
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const sku = /^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/;
const gbp = value => currency.format(value/100);
export function poundsToMinor(input) {
  const parts = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!parts) return null;
  const minor = Number(parts[1])*100+Number((parts[2]??'').padEnd(2,'0'));
  return minor <= 10000000 ? minor : null;
}

export function mountHQ({document,root,request}) {
  const stop = new AbortController();
  const params = new URL(document.location.href).searchParams;
  const section = sections.find(([id])=>id===params.get('section'))?.[0]??'overview';
  const fromOrder = params.get('fromOrder');
  const origin = uuid.test(fromOrder??'') ? fromOrder : null;
  const selectedSku = sku.test(params.get('sku')??'') ? params.get('sku') : null;
  const batchId=uuid.test(params.get('batch')??'')?params.get('batch'):null;
  const management=Boolean(selectedSku&&params.get('manage')==='1'&&['packaging','purchasing'].includes(section));
  const historyPage=Math.max(0,Math.min(399,Number.parseInt(params.get('history'),10)||0));
  const supplier = uuid.test(params.get('supplier')??'') ? params.get('supplier') : null;
  const heading = sections.find(([id])=>id===section)[1];
  const filters = {p_section:section,p_query:(params.get('q')??'').slice(0,80),
    p_filter:params.get('filter')??'all',p_sort:params.get('sort')??'newest',
    p_page:Math.max(0,Math.min(399,Number.parseInt(params.get('page'),10)||0))};
  if (selectedSku) filters.p_sku=selectedSku;
  if (supplier) filters.p_supplier=supplier;
  const el = (tag,text,name) => {
    const node=document.createElement(tag);
    if(text!==undefined) node.textContent=text;
    if(name) node.className=name;
    return node;
  };
  const link = (label,href) => Object.assign(el('a',label),{href});
  function href(next,values={}) {
    const url = new URLSearchParams({section:next,...(origin?{fromOrder:origin}:{}),...values});
    return base+'?'+url;
  }
  function panel(caption,parent) {
    const group=el('section');
    group.append(el('h2',caption));
    parent.append(group);
    return group;
  }
  const status=el('p','Loading QUARTERMASTER…');
  status.setAttribute('role','status');
  const main=el('div',undefined,'qm-board');
  const header=el('header');
  header.append(el('h1','QUARTERMASTER'));
  if(origin) header.append(link('Back to this packing record',base+'?order='+encodeURIComponent(origin)));
  const nav=el('nav',undefined,'qm-nav');
  nav.setAttribute('aria-label','QUARTERMASTER sections');
  root.replaceChildren(header,nav,status,main);
  const call=(operation,values={})=>request(operation,values,AbortSignal.any([stop.signal,AbortSignal.timeout(8000)]));
  const allowed=(id,c)=>({packaging:c.pack||c.receive,purchasing:c.receive,suppliers:c.receive,queue:c.pack||c.postage||c.finance})[id]??true;
  let saving=false;

  function summary(parent,items) {
    const list=el('dl',undefined,'qm-summary');
    for(const [label,value] of items) {
      if(value===undefined||value===null) continue;
      const item=el('div');
      item.append(el('dt',label),el('dd',String(value)));
      list.append(item);
    }
    parent.append(list);
  }
  function cards(parent,items,empty,render) {
    if(!items.length){ parent.append(el('p',empty)); return; }
    const list=el('div',undefined,'qm-cards');
    for(const row of items){
      const card=el('article');
      render(card,row);
      list.append(card);
    }
    parent.append(list);
  }
  function field(label,{type='text',value='',min,max,maxLength,pattern,choices,required=true,step,inputMode}={}) {
    const wrapper=el('label',label);
    const input=el(choices?'select':'input');
    if(choices) {
      for(const [optionValue,text] of choices) {
        const option=Object.assign(el('option',text),{value:optionValue});
        if(optionValue===value) option.setAttribute('selected','');
        input.append(option);
      }
    } else {
      input.type=type;
      input.value=String(value);
    }
    input.required=required;
    for(const [key,val] of Object.entries({min,max,maxLength,pattern,step,inputMode})) if(val!==undefined) input[key]=val;
    wrapper.append(input);
    return {wrapper,input};
  }
  const number=(label,min,max)=>field(label,{type:'number',min,max,step:'1',value:min===0?'0':''});
  const dimensions=(side)=>['length','width','height'].map(axis=>number(side+' '+axis+' (mm)',1,1500));
  const submit=(caption)=>Object.assign(el('button',caption),{type:'submit'});

  function search(parent,{filtersAvailable,sort=false,label='Search',values=filters,onSearch}={}) {
    const form=el('form',undefined,'qm-form');
    const q=field(label,{type:'search',value:values.p_query,maxLength:80,required:false});
    const f=filtersAvailable?field('Filter by',{choices:filtersAvailable,value:values.p_filter}):null;
    const order=sort?field('Sort by',{choices:[['newest','Newest first'],['oldest','Oldest first']],value:values.p_sort}):null;
    form.append(q.wrapper,...[f,order].filter(Boolean).map(x=>x.wrapper),submit('Search'));
    form.addEventListener('submit',event=>{
      event.preventDefault();
      if(onSearch) { onSearch(q.input.value.trim()); return; }
      if(!saving) document.location.href=href(section,{q:q.input.value.trim(),filter:f?.input.value??'all',
        sort:order?.input.value??'newest',...(selectedSku?{sku:selectedSku}:{}),...(supplier?{supplier}:{}),
        ...(params.has('pick')?{pick:params.get('pick')}: {})});
    });
    parent.append(form);
  }
  function pages(data) {
    const paging=el('nav',undefined,'qm-nav');
    paging.setAttribute('aria-label','Pages');
    const target=page=>href(section,{q:filters.p_query,filter:filters.p_filter,sort:filters.p_sort,page,
      ...(selectedSku?{sku:selectedSku}:{}),...(supplier?{supplier}:{})});
    if(filters.p_page>0) paging.append(link('Previous page',target(filters.p_page-1)));
    if(data.has_more) paging.append(link('Next page',target(filters.p_page+1)));
    if(paging.children.length) main.append(paging);
  }
  function writer(parent,caption,fields,action,confirmation,detail) {
    const form=el('form',undefined,'qm-form');
    const feedback=el('p');
    feedback.setAttribute('role','status');
    const button=submit(caption);
    form.append(...fields.map(x=>x.wrapper),button,feedback);
    parent.append(form);
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(saving||button.disabled||!form.checkValidity()) return;
      saving=true;
      button.disabled=true;
      feedback.textContent='Saving…';
      let response;
      try { response=await action(fields.map(x=>x.input.type==='number'?x.input.valueAsNumber:x.input.value.trim())); }
      catch {
        if(!stop.signal.aborted) feedback.textContent=detail;
        saving=false;
        return;
      }
      if(stop.signal.aborted) return;
      saving=false;
      await load(response===false?'This entry was already recorded.':confirmation);
    });
    return {button,feedback};
  }
  function activities(parent,rows) {
    cards(parent,rows,'No operational activity recorded.',(card,r)=>{
      card.append(el('h3',eventNames[r.kind]??'Workshop activity'));
      summary(card,[['Order',r.order_ref],['SKU',r.sku],['Units',r.quantity],
        ['Actual postage',r.amount===null?null:gbp(r.amount)],['Recorded',dateTime.format(new Date(r.happened))]]);
    });
  }
  function purchaseCards(parent,rows) {
    cards(parent,rows,'No matching packaging receipts.',(card,r)=>{
      card.append(el('h3',r.title??r.sku));
      summary(card,[['SKU',r.display_sku??r.sku],['Supplier',r.supplier],['Reference',r.reference],
        ['Record type',r.replacement?'Remainder cost reallocation':r.reversed?'Receipt reversed':null],['Received',r.quantity],
        ['Remaining in batch',r.remaining],['Actual batch total',gbp(r.total_minor)],
        ['Average paid per unit',gbp(r.total_minor/r.quantity)],['Receipt date',dateTime.format(new Date(r.received_at))]]);
      if(r.id&&r.reference) card.append(link('Inspect batch '+r.reference,href('purchasing',{sku:r.sku,batch:r.id,manage:1})));
    });
  }
  async function receiptForm(parent) {
    const pick=(params.get('pick')??'').slice(0,80);
    const picker=el('div');
    search(picker,{label:'Find a packaging SKU for this receipt',values:{p_query:pick},onSearch:q=>{
      if(!saving) document.location.href=href('purchasing',{pick:q,...(supplier?{supplier}:{})});
    }});
    parent.append(picker);
    const filters={p_section:'choices',p_query:pick,...(selectedSku?{p_sku:selectedSku}:{})};
    const [choices,suppliers]=await Promise.all([call('hq',filters),call('suppliers')]);
    if(stop.signal.aborted) return;
    if(!choices.rows.length||!suppliers.length){
      parent.append(el('p',!suppliers.length?'Add an active supplier in IRONCLAD first.':pick?'No SKUs matched. Search again.':'Register a packaging SKU before receiving stock.'));
      return;
    }
    if(choices.has_more) parent.append(el('p','Search by SKU or name to narrow the packaging choices.'));
    const options=field('Packaging SKU',{choices:[['','Select packaging'],...choices.rows.map(x=>[x.sku,x.title+' · '+(x.display_sku??x.sku)])],value:selectedSku??''});
    const amount=field('Actual total batch cost (GBP)',{type:'text',pattern:'[0-9]{1,6}([.][0-9]{1,2})?',inputMode:'decimal',maxLength:9});
    amount.input.addEventListener('input',()=>amount.input.setCustomValidity(
      amount.input.value && poundsToMinor(amount.input.value)===null?'Enter a GBP amount up to £100,000, with up to two decimal places.':''));
    const receiving=writer(parent,'Record packaging receipt',[options,
      field('Supplier',{choices:[['','Select supplier'],...suppliers.map(s=>[s.id,s.name])],value:supplier??''}),
      field('Supplier purchase reference',{maxLength:100,pattern:'.{3,100}'}),number('Quantity received',1,10000),amount],
    ([p_sku,p_supplier,p_ref,p_qty,price])=>{
      const p_total=poundsToMinor(price);
      if(p_total===null) throw new Error('Invalid GBP amount');
      return call('receive',{p_id:crypto.randomUUID(),p_sku,p_supplier,p_ref,p_qty,p_total});
    },'Packaging receipt saved. Stock and purchase history have been refreshed.',
    'Receipt outcome unconfirmed. Search purchase history for this supplier reference before retrying. Duplicate references for the same supplier and SKU are blocked.');
    return receiving;
  }
  async function draw(data) {
    const c=data.capabilities;
    nav.replaceChildren(...sections.filter(([id])=>allowed(id,c)).map(([id,title])=>{
      const a=link(title,href(id));
      if(id===section) a.setAttribute('aria-current','page');
      return a;
    }));
    if(section==='overview') {
      const totals=data.totals;
      const overview=panel('At a glance',main);
      summary(overview,[['Awaiting packing',totals.awaiting],['Packing in progress',totals.packing],
        ['Packed, awaiting dispatch',totals.packed],['Packaging units available',totals.available],
        ['Packaging units reserved',totals.reserved],['SKUs at or below reorder level',totals.low]]);
      const quick=el('div',undefined,'qm-nav');
      for(const [id,label] of [['packaging','Manage packaging'],['purchasing','Receive packaging'],['queue','Open packing queue']])
        if(allowed(id,c)) quick.append(link(label,href(id)));
      overview.append(quick);
      if(totals.purchases!==null) purchaseCards(panel('Recent packaging purchases',main),totals.purchases);
      activities(panel('Recent activity',main),data.rows);
      return;
    }
    const body=panel(heading,main);
    if(management){
      if(!c.receive) { body.append(el('p','Receiving permission is required to inspect inventory changes.')); return; }
      await drawManagement({body,call,writer,field,el,link,summary,cards,href,heading,gbp,dateTime,poundsToMinor,
        sku:selectedSku,batchId,canFinance:c.finance,historyPage,signal:stop.signal});
      return;
    }
    if(section==='packaging'){
      if(c.receive&&data.mode==='workshop'){
        const registration=el('details');
        registration.append(el('summary','Register a packaging SKU'));
        body.append(registration);
        writer(registration,'Create packaging SKU',[
          field('SKU',{maxLength:48,pattern:'[A-Za-z0-9][A-Za-z0-9_\\-]{0,47}'}),
          field('Packaging name',{maxLength:120}),field('Description (optional)',{maxLength:240,required:false}),
          ...dimensions('Inner'),...dimensions('Outer'),number('Tare weight (g)',0,25000),number('Reorder threshold',0,100000)
        ],([p_sku,p_title,p_description,il,iw,ih,ol,ow,oh,p_tare,p_reorder])=>
          call('register',{p_sku,p_title,p_description,p_inner:[il,iw,ih],p_outer:[ol,ow,oh],p_tare,p_reorder}),
        'Packaging SKU registered. Receive stock under Purchasing.',
        'Registration outcome unconfirmed. Search by SKU before retrying. Check that each inner dimension fits its corresponding outer dimension.');
      }
      search(body,{filtersAvailable:[['all','All packaging'],['low','At or below reorder level'],['archived','Archived']],label:'Search by SKU or name'});
      cards(body,data.rows,'No matching packaging SKUs.',(card,r)=>{
        card.append(el('h3',r.title));
        if(r.description) card.append(el('p',r.description));
        summary(card,[['SKU',r.display_sku??r.sku],['Status',r.archived?'Archived':'Active'],['Inner dimensions',r.inner_mm.join(' × ')+' mm'],['Outer dimensions',r.outer_mm.join(' × ')+' mm'],
          ['Tare',r.tare_grams+' g'],['Available',r.available],['Reserved',r.reserved],['Reorder threshold',r.reorder_at],
          ['Stock level',r.low?'At or below reorder level':'Above reorder level'],
          ['Latest batch total',r.latest_batch_minor===null?null:gbp(r.latest_batch_minor)],
          ['Latest batch average per unit',r.latest_batch_qty?gbp(r.latest_batch_minor/r.latest_batch_qty):null]]);
        if(c.receive) card.append(link('Inspect or manage '+(r.display_sku??r.sku),href('packaging',{sku:r.sku,manage:1})),
          link('Receipt history for '+(r.display_sku??r.sku),href('purchasing',{sku:r.sku})));
      });
    } else if(section==='purchasing'){
      if(data.mode==='workshop') {
        const receiver=panel('Receive packaging stock',body);
        await receiptForm(receiver).catch(()=>{
          if(!stop.signal.aborted) receiver.append(el('p','The supplier or packaging choices could not be loaded. Reload to try again.'));
        });
      }
      const history=panel('Purchase and receipt history',body);
      if(selectedSku||supplier) history.append(link('Clear purchase filters',href('purchasing')));
      search(history,{label:'Search by reference, SKU or supplier',sort:true});
      purchaseCards(history,data.rows);
    } else if(section==='suppliers'){
      body.append(link('Manage suppliers in IRONCLAD','/admin/ironclad/#suppliers'));
      search(body,{label:'Search suppliers'});
      cards(body,data.rows,'No matching suppliers.',(card,r)=>{
        card.append(el('h3',r.name));
        summary(card,[['Status',r.active?'Active':'Archived'],['Supplier currency',r.currency],['Packaging receipts',r.purchases]]);
        card.append(link('View packaging purchases',href('purchasing',{supplier:r.id})));
      });
    } else if(section==='queue'){
      search(body,{label:'Search by order reference or sales channel',sort:true,
        filtersAvailable:[['all','All orders'],...Object.entries(stageNames)]});
      cards(body,data.rows,'No matching paid orders awaiting dispatch.',(card,r)=>{
        card.append(el('h3',r.reference));
        summary(card,[['Channel',r.sales_channel],['Order date',date.format(new Date(r.order_day))],['Packing',stageNames[r.stage]],
          ['Packaging',r.stage==='packing'?'Reserved · '+r.sku:r.stage==='packed'?'Used · '+r.sku:r.pack_state==='released'?'Reservation released':'Unreserved'],
          ['Picks',r.required===null?'Start packing to track picks':r.picked+' / '+r.required],
          ['Actual postage',r.postage_recorded?'Recorded':'Awaiting evidence'],
          ['ECLIPSE',({approved:'Approved revision is current',review:'Ready for finance review','needs-postage':'Record actual postage first'})[r.finance]]]);
        card.append(link('Open packing for '+r.reference,base+'?order='+encodeURIComponent(r.id)));
      });
    } else {
      search(body,{label:'Search by event, order reference or SKU'});
      activities(body,data.rows);
    }
    pages(data);
  }
  async function load(message='') {
    status.textContent='Loading '+heading.toLowerCase()+'…';
    main.replaceChildren();
    try {
      let data;
      try {data=await call('hq',filters);}
      catch(error){
        if(section==='overview'||stop.signal.aborted) throw error;
        data=await call('hq',{p_section:'overview'});
        if(allowed(section,data.capabilities)) throw error;
        for(const [id,title] of sections.filter(([id])=>allowed(id,data.capabilities))) nav.append(link(title,href(id)));
        status.textContent='Your QUARTERMASTER role does not include '+heading.toLowerCase()+'.';
        return;
      }
      if(data.schema!==1||!Array.isArray(data.rows)||data.rows.length>25||!data.capabilities) throw new Error('Invalid workspace response');
      if(stop.signal.aborted) return;
      status.textContent=message||(data.mode==='workshop'?'':'Writer access is '+data.mode+'.');
      await draw(data);
    } catch {
      if(stop.signal.aborted) return;
      status.textContent='The workspace could not be loaded. Check your Admin access and reload.';
      main.replaceChildren();
    }
  }
  void load();
  function lock(){stop.abort();root.replaceChildren();}
  return {lock,destroy:lock};
}
