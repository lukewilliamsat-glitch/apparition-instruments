import {mountPrint} from './print.mjs';
import {mountQC} from './qc.mjs';
import {mountWiring} from './wiring.mjs';
import {mountPicking} from './picking.mjs';
import {browserOrderStore,channels,statuses} from '../model.mjs';
import {el,definition,date} from '../view.mjs';
import {buildContext,assemblyLines,buildSheetURL} from './model.mjs';
import {deploymentPath} from '../../../deployment.mjs';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
try{
 const order=browserOrderStore().get(params.get('order')),context=buildContext(order,params.get('item'),params.get('unit')||1);
 $('#back-order').href=deploymentPath('/admin/orders/?id='+encodeURIComponent(order.id));
 $('#build-reference').textContent=context.reference;
 $('#build-header').append(definition([['Order date',date(context.createdAt)],['Sales channel',channels[context.channel]],['Order status',statuses[context.orderStatus]],['Customer',context.customer],['Kit',context.kitName],['Production unit',context.unit+' of '+context.quantity+' · order item '+(context.itemIndex+1)]]));
 for(const {item,index} of assemblyLines(order)){const option=el('option',item.name+' · '+item.quantity+' ordered');option.value=index;$('#build-item').append(option);}$('#build-item').value=context.itemIndex;$('#build-unit').value=context.unit;$('#build-unit').max=context.quantity;
 $('#build-item').addEventListener('change',()=>{$('#build-unit').value=1;$('#build-unit').max=order.items[Number($('#build-item').value)].quantity;});
 $('#choose-build').addEventListener('submit',e=>{e.preventDefault();location.assign(buildSheetURL(order.id,Number($('#build-item').value),Number($('#build-unit').value)));});
 mountPicking($('#production-sections'),context);
 mountWiring($('#production-sections'),context);
 mountQC($('#production-sections'),context);
 mountPrint(context);
 $('#build-content').hidden=false;
}catch(error){$('#build-error').textContent=error.message;}
