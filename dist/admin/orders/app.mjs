import {currentAdminOrderRepository} from '../../backend/order-data.mjs';
import {statuses,channels} from './model.mjs';
import {el,money,date,showOrder} from './view.mjs';
import {deploymentPath} from '../../deployment.mjs';
const $=selector=>document.querySelector(selector);
let records=[];
$('#order-create-actions').hidden=true;
$('#order-editor').hidden=true;
$('#order-status-form').hidden=true;
for(const [key,label] of Object.entries(statuses))if(key==='PENDING'){const option=el('option',label);option.value=key;$('#order-filter').append(option);}
function render(){
 const id=new URLSearchParams(location.search).get('id'),order=records.find(item=>item.id===id);
 $('#order-detail').hidden=!id;$('#order-list').hidden=!!id;
 if(id){if(!order){$('#order-message').textContent='Order not found in shared Orders. Return to the list and refresh.';return;}$('#detail-title').textContent=order.reference;showOrder(order,$('#detail-content'));return;}
 const q=$('#order-search').value.toLowerCase().trim(),filter=$('#order-filter').value;
 const rows=records.filter(item=>(!filter||item.status===filter)&&[item.reference,item.customer.name,item.customer.email].join(' ').toLowerCase().includes(q));
 $('#order-rows').replaceChildren();$('#orders-empty').hidden=!!rows.length;
 for(const order of rows){const row=el('tr'),cell=el('td'),link=el('a',order.reference);link.href=deploymentPath('/admin/orders/?id='+encodeURIComponent(order.id));cell.append(link);row.append(cell,...[date(order.createdAt),order.customer.name,channels[order.channel],money(order.pricing.total),statuses[order.status]].map(value=>el('td',value)));$('#order-rows').append(row);}
}
async function refresh(){try{records=await currentAdminOrderRepository().list();$('#order-message').textContent='';render();}catch(error){$('#order-message').textContent=error.message;}}
$('#order-search').addEventListener('input',render);$('#order-filter').addEventListener('change',render);
window.addEventListener('pageshow',refresh);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
refresh();
