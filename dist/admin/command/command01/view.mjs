import {uiNode as node,statusBadge} from '../../application.mjs';
import {setAdminFeedback} from '../../interaction.mjs';
import {createWorkbench} from './controller.mjs';
import {categories,money,stockLabel,stockState,emptyFilters} from './model.mjs';

export function mountWorkbench(document,{transport,extension={}}={}) {
  const byId=id=>document.getElementById(id);
  const inspector=byId('inspector'),filters=['category','manufacturer','individual','kit','stock'];
  let controller,lastRowsKey='',lastInspectorKey='',lastManufacturers='',lastDisplayedDetail=null,disposed=false;
  const cleanups=[];
  const listen=(target,event,handler)=>{target.addEventListener(event,handler);cleanups.push(()=>target.removeEventListener(event,handler));};
  const act=(action,run)=>{
    const allowed=extension.beforeAction?.(action)??true;
    if(allowed&&typeof allowed.then==='function')void allowed.then(ok=>{if(ok&&!disposed)run();}).catch(error=>setAdminFeedback(byId('feedback'),error.message,'error'));
    else if(allowed&&!disposed)run();
  };
  const add=(parent,tag,text,className)=>{const child=node(document,tag,text,className);parent.append(child);return child;};
  const pair=(dl,label,value)=>{const line=add(dl,'div',undefined,'detail-line');add(line,'dt',label);add(line,'dd',value);};
  const section=(parent,label)=>{const s=add(parent,'section',undefined,'inspector-section');add(s,'h4',label);return s;};
  const options=(select,items,first)=>{select.replaceChildren();for(const [value,label]of [['',first],...items]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}};
  // No product-controlled value is used as HTML, a URL, an event handler or CSS.
  options(byId('filter-category'),Object.entries(categories),'All categories');
  function restoreListFocus(key){if(key){const button=[...byId('rows').querySelectorAll('button[data-product]')].find(b=>b.dataset.product===key);(button??byId('search')).focus({preventScroll:true});}}
  function clearSelection(){const previous=controller.snapshot().selectedId;controller.close();restoreListFocus(previous);}
  function renderRows(state){
    const key=JSON.stringify([state.visible,state.selectedId]);
    if(key===lastRowsKey)return;lastRowsKey=key;
    const focused=document.activeElement?.dataset?.product;
    const body=byId('rows');body.replaceChildren();
    for(const row of state.visible){
      const tr=add(body,'tr');tr.dataset.selected=String(row.id===state.selectedId);
      const identity=add(tr,'td'),button=add(identity,'button',row.name,'product-select');
      button.type='button';button.dataset.product=row.id;button.setAttribute('aria-pressed',String(row.id===state.selectedId));button.setAttribute('aria-controls','inspector');
      add(identity,'span',row.sku,'product-sku');add(identity,'span',categories[row.category]+' · '+row.manufacturer,'product-classification');
      const price=add(tr,'td');add(price,'span',money(row.salePrice),'price-amount');if(!row.individually)add(price,'span','Not individually eligible','cell-note');
      const stock=add(tr,'td');add(stock,'span',row.stock===null?'—':row.stock+' '+row.stockUnit+(row.stock!==1&&row.stockUnit==='item'?'s':''),'stock-quantity');
      const stateLabel=add(stock,'span',stockLabel(row),'stock-label');stateLabel.dataset.state=stockState(row);
      const eligibility=add(tr,'td');add(eligibility,'span',row.individually?'Individual ✓':'Individual —','eligibility'+(row.individually?'':' no'));add(eligibility,'span',row.inKits?'Kit ✓':'Kit —','eligibility'+(row.inKits?'':' no'));
      if(!row.active)add(eligibility,'span','Inactive','eligibility no');
    }
    if(focused)restoreListFocus(focused);
  }
  function renderInspector(state){
    const outside=state.selectedId&&!state.visible.some(r=>r.id===state.selectedId);
    const key=JSON.stringify([state.selectedId,state.detailStatus,state.detail,state.detailError,Boolean(outside)]);
    if(key===lastInspectorKey)return;lastInspectorKey=key;
    const focusWasInside=inspector.contains(document.activeElement);
    inspector.replaceChildren();inspector.setAttribute('aria-busy',String(['loading','waiting'].includes(state.detailStatus)));
    const top=add(inspector,'div',undefined,'inspector-topline');add(top,'span','PRODUCT INSPECTOR');
    if(state.selectedId){const close=add(top,'button','×','close-inspector');close.type='button';close.dataset.close='';close.setAttribute('aria-label','Close product inspector');}
    if(!state.selectedId){
      const empty=add(inspector,'div',undefined,'inspector-empty');add(empty,'span','◇','inspector-symbol').setAttribute('aria-hidden','true');add(empty,'h3','A closer look');add(empty,'p','Select a component to inspect its pricing, stock and specifications.');add(empty,'small','Read-only workspace. Local proposals cannot change shared records.');return;
    }
    const body=add(inspector,'div',undefined,'inspector-body');
    if(outside)add(body,'p','Selected product is outside the current filters.','outside-filters');
    if(state.detailStatus!=='ready'){
      const loading=state.detailStatus!=='error';
      const title=add(body,'h3',loading?'Loading product details…':'Product details unavailable');title.id='detail-title';title.tabIndex=-1;
      const message=add(body,'p',loading?'Retrieving the selected authorised record.':state.detailError,'detail-copy');message.setAttribute('role',loading?'status':'alert');
      if(!loading){const retry=add(body,'button','Retry product details');retry.type='button';retry.dataset.retryDetail='';}
      if(focusWasInside)title.focus({preventScroll:true});return;
    }
    const row=state.detail;
    add(body,'p',categories[row.category],'inspector-category');
    const title=add(body,'h3',row.name);title.id='detail-title';title.tabIndex=-1;
    add(body,'p',row.manufacturer+' · '+row.sku,'detail-subtitle');
    const badges=add(body,'div',undefined,'inspector-badges');
    badges.append(statusBadge(document,row.active?'Active component':'Inactive component',row.active?'neutral':'warning'));
    badges.append(statusBadge(document,row.inKits?'Kit eligible':'Not kit eligible'));
    const pricing=section(body,'Pricing');
    add(pricing,'p',money(row.salePrice),'detail-price');
    add(pricing,'p','Individual selling price','detail-note');
    const prices=add(pricing,'dl');pair(prices,'Individual sale',row.individually?'Eligible':'Not eligible');pair(prices,'Kit price',money(row.kitPrice));pair(prices,'Kit price quantity',row.kitPriceQuantity===null?'Not supplied':String(row.kitPriceQuantity));
    add(pricing,'p','salePrice is the selling price. No separate regular/promotional price is defined. Kit pricing is not a multibuy discount.','detail-note');
    const inventory=section(body,'Inventory');const inventoryList=add(inventory,'dl');pair(inventoryList,'Quantity',row.stock===null?'Not supplied':String(row.stock));pair(inventoryList,'Stock unit',row.stockUnit);pair(inventoryList,'Display state',stockLabel(row));
    const technical=section(body,'Specifications');const entries=Object.entries(row.technicalSpecs);
    if(entries.length){const list=add(technical,'dl');for(const [key,value]of entries)pair(list,key.charAt(0).toUpperCase()+key.slice(1),value);}
    else add(technical,'p','No structured specifications supplied.','detail-copy');
    for(const text of [row.description,row.specs,row.productSpecifications])if(text)add(technical,'p',text,'detail-copy');
    const image=section(body,'Image information'),box=add(image,'div',undefined,'image-placeholder');
    const descriptions={
      unloaded:['Image not loaded','No image bytes were requested.'],
      absent:['No image assigned','The authorised projection explicitly supplies an absent image state.'],
      available:['Image identity available','Metadata only. Image bytes are not loaded in COMMAND 01.'],
      unavailable:['Image unavailable','Metadata reports an image that cannot currently be read.'],
      removed:['Explicit fixture removal','Removal is explicitly recorded in this synthetic fixture; it is never inferred from an omitted field.']
    };
    const [heading,description]=descriptions[row.imageInfo.kind];add(box,'strong',heading);add(box,'p',description);
    if(row.imageInfo.kind==='available'){
      const imageList=add(image,'dl');pair(imageList,'Type',row.imageInfo.mime);pair(imageList,'Dimensions',row.imageInfo.width+' × '+row.imageInfo.height+' px');pair(imageList,'Size',new Intl.NumberFormat('en-GB').format(row.imageInfo.bytes)+' bytes');
      add(image,'p','Image SHA-256: '+row.imageInfo.sha256,'image-fingerprint');
    }
    const identity=section(body,'Record');const ids=add(identity,'dl');pair(ids,'Stable ID',row.id);pair(ids,'Read identity (not a write revision)',row.revision);
    const requestedFocus=state.focusInspector&&row!==lastDisplayedDetail&&(document.activeElement?.dataset?.product===row.id||focusWasInside);
    lastDisplayedDetail=row;
    if(requestedFocus||focusWasInside){title.focus({preventScroll:true});if(requestedFocus&&document.defaultView.innerWidth<=820)inspector.scrollIntoView({block:'start',behavior:'auto'});}
  }
  function render(state){
    if(disposed)return;
    const counts=[['Components',state.rows.length,'authorised records'],['Individual sale',state.rows.filter(r=>r.individually).length,'eligible'],['Kit use',state.rows.filter(r=>r.inKits).length,'eligible'],['Out of stock',state.rows.some(r=>r.stock!==null)?state.rows.filter(r=>r.stock===0).length:null,state.rows.some(r=>r.stock!==null)?'zero quantity':'Inventory unavailable']];
    byId('metrics').replaceChildren();
    for(const [label,value,note]of counts){const metric=add(byId('metrics'),'div',undefined,'metric');add(metric,'span',label,'metric-label');add(metric,'span',state.status==='idle'||(state.status==='loading'&&!state.rows.length)?'—':value===null?'—':String(value),'metric-value');add(metric,'span',note,'metric-note');}
    byId('nav-count').textContent=String(state.rows.length);
    const manufacturers=[...new Set(state.rows.map(r=>r.manufacturer))].sort();
    if(JSON.stringify(manufacturers)!==lastManufacturers){lastManufacturers=JSON.stringify(manufacturers);options(byId('filter-manufacturer'),manufacturers.map(m=>[m,m]),'All manufacturers');}
    if(byId('search').value!==state.filters.query)byId('search').value=state.filters.query;
    for(const filter of filters)byId('filter-'+filter).value=state.filters[filter];
    const chips=byId('active-filters');chips.replaceChildren();
    for(const [filter,value]of Object.entries(state.filters))if(value){
      const select=filters.includes(filter)?byId('filter-'+filter):null;
      const label=filter==='query'?'Search: '+value:(filter==='category'?'Category: ':filter==='manufacturer'?'Maker: ':filter==='stock'?'Stock: ':filter==='individual'?'Individual: ':'Kit: ')+(select?.selectedOptions[0]?.textContent??value);
      const chip=add(chips,'button',label+' ×','filter-chip');chip.type='button';chip.dataset.clearFilter=filter;chip.setAttribute('aria-label','Remove '+label);
    }
    chips.hidden=!Object.values(state.filters).some(Boolean);
    byId('clear-filters').disabled=chips.hidden;
    byId('refresh').disabled=state.status==='loading';
    byId('result-count').textContent=String(state.visible.length);
    byId('result-note').textContent=state.visible.length+' of '+state.rows.length+' components'+(state.status==='error'&&state.rows.length?' · last verified read':'');
    const loading=state.status==='loading';
    setAdminFeedback(byId('feedback'),loading?(state.rows.length?'Refreshing catalogue. Your selection is preserved.':'Loading authorised catalogue…'):state.status==='ready'?state.visible.length+' components shown.':'',loading?'loading':'ready');
    byId('error-panel').hidden=state.status!=='error';byId('error-message').textContent=state.error;
    byId('table-wrap').hidden=!state.visible.length;
    byId('empty').hidden=Boolean(state.visible.length)||state.status!=='ready';
    byId('empty-heading').textContent=state.rows.length?'No matching components':'No components in this catalogue';
    byId('empty-message').textContent=state.rows.length?'Try a broader search or clear your filters.':'The catalogue loaded successfully and returned an empty list.';
    byId('empty-clear').hidden=!state.rows.length;
    renderRows(state);renderInspector(state);extension.onState?.(state);
  }
  try{controller=createWorkbench({transport,onChange:render});}
  catch(error){byId('error-panel').hidden=false;byId('error-message').textContent=error.message;byId('refresh').disabled=true;byId('retry').disabled=true;return{blocked:true,destroy(){disposed=true;}};}
  listen(byId('search'),'input',event=>controller.setFilter('query',event.target.value));
  for(const filter of filters)listen(byId('filter-'+filter),'change',event=>controller.setFilter(filter,event.target.value));
  for(const id of ['clear-filters','empty-clear'])listen(byId(id),'click',()=>controller.clearFilters());
  for(const id of ['refresh','retry'])listen(byId(id),'click',()=>act({type:'refresh'},()=>void controller.refresh()));
  listen(byId('active-filters'),'click',event=>{const button=event.target.closest('button[data-clear-filter]');if(button){controller.setFilter(button.dataset.clearFilter,'');byId('search').focus();}});
  listen(byId('rows'),'click',event=>{const button=event.target.closest('button[data-product]');if(button)act({type:'select',id:button.dataset.product},()=>void controller.select(button.dataset.product));});
  listen(inspector,'click',event=>{if(event.target.closest('[data-close]'))act({type:'close'},clearSelection);if(event.target.closest('[data-retry-detail]'))void controller.select(controller.snapshot().selectedId);});
  listen(document,'keydown',event=>{if(event.key==='Escape'&&inspector.contains(document.activeElement)){event.preventDefault();act({type:'close'},clearSelection);}});
  listen(document.defaultView,'pagehide',()=>controller.destroy());
  void controller.refresh();
  return {controller,destroy(){disposed=true;controller.destroy();for(const cleanup of cleanups)cleanup();}};
}
