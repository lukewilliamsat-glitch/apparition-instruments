import {assemblyLines,buildSheetURL} from './build-sheet/model.mjs';
import {browserOrderStore,orderStorageKey,channels,statuses} from './model.mjs';
import {el,money,date,showOrder} from './view.mjs';
const $=s=>document.querySelector(s);
for(const [key,label] of Object.entries(statuses))for(const target of ['#order-filter','#detail-status']){const o=el('option',label);o.value=key;$(target).append(o);}
export function renderOrders(){try{
 const query=new URLSearchParams(location.search),id=query.get('id'),creating=query.get('new')==='1',store=browserOrderStore();
 $('#order-editor').hidden=!creating;$('#order-create-actions').hidden=creating;
 if(creating){$('#order-detail').hidden=true;$('#order-list').hidden=true;return;}
 $('#order-detail').hidden=!id;$('#order-list').hidden=!!id;
 if(id){const record=store.get(id);if(!record)throw new Error('This order was not found in this browser.');$('#detail-title').textContent=record.reference;showOrder(record,$('#detail-content'));if(assemblyLines(record).length){const a=el('a','Open Build Sheet');a.className='button';a.href=buildSheetURL(record.id);$('#detail-content').prepend(a);}$('#detail-status').value=record.status;return;}
 const q=$('#order-search').value.toLowerCase(),status=$('#order-filter').value,rows=store.list().filter(o=>(!status||o.status===status)&&[o.reference,o.customer.name,o.customer.email,o.externalReference,channels[o.channel]].join(' ').toLowerCase().includes(q)).reverse();
 $('#order-rows').replaceChildren();$('#orders-empty').hidden=!!rows.length;
 for(const order of rows){const row=el('tr'),cell=el('td'),link=el('a',order.reference);link.href='/admin/orders/?id='+encodeURIComponent(order.id);cell.append(link);row.append(cell,...[date(order.createdAt),order.customer.name,channels[order.channel],money(order.pricing.total),statuses[order.status]].map(t=>el('td',t)));$('#order-rows').append(row);}
 }catch(e){$('#order-message').textContent=e.message;}}
$('#order-search').addEventListener('input',renderOrders);$('#order-filter').addEventListener('change',renderOrders);
$('#order-status-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{await browserOrderStore().setStatus(new URLSearchParams(location.search).get('id'),$('#detail-status').value);renderOrders();$('#order-message').textContent='Status saved. Purchased items and stock are unchanged.';}catch(error){$('#order-message').textContent=error.message;}finally{button.disabled=false;}});
window.addEventListener('storage',e=>{if(!e.key||e.key===orderStorageKey)renderOrders();});renderOrders();
