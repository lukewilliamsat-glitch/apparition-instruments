import {readBasket} from '../../commerce.mjs';
import {drawCircuit} from '../../wiring-generator/render.mjs';
import {readGeneratorURL} from '../../wiring-generator/session.mjs';
import {configurationFromURL,describeKit,specLabels,priceKit,formatKitPrice,upgradeLabel,lesPaul,builderURL} from '../../les-paul-kits/config.mjs';
import {diagramMarkup} from '../../les-paul-kits/diagram.mjs';
import {populateFitment} from '../fitment.mjs';
import {deploymentPath} from '../../deployment.mjs';
const $=selector=>document.querySelector(selector);
function row(root,label,value){const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;div.append(dt,dd);root.append(div);}
try{
 const basketId=new URLSearchParams(location.search).get('basket');
 const saved=basketId?readBasket().find(i=>i.id===basketId&&i.product==='les-paul')?.record:null;
 if(basketId&&!saved)throw new Error('This kit is no longer in this browser’s basket.');
 const config=saved?.configuration||configurationFromURL(location.search);
 if(!config)throw new Error('Open a kit in the builder, then select Printable specification to bring its selections here.');
 const specs=saved?.specification||describeKit(config),pricing=saved?.pricing||priceKit(config);
 $('#sheet-product').textContent=saved?.kitName||lesPaul.name;$('#sheet-model').textContent='Guitar: '+specs.model;
 for(const [key,value] of Object.entries(specs))if(key!=='model')row($('#sheet-specs'),specLabels[key],value);
 for(const line of pricing.lines)row($('#sheet-prices'),line.label,line.key==='base'?formatKitPrice(line.price):upgradeLabel(line.price));
 $('#sheet-total').textContent=formatKitPrice(pricing.total);populateFitment($('#sheet-checks'));
 $('#sheet-diagram').innerHTML=saved?.diagram?.circuit?drawCircuit(saved.diagram.circuit,{exporting:true,view:'full'}):diagramMarkup(config,'all',null,readGeneratorURL(location.search).state,true);
 // This is a printable drawing, not another interactive visualiser.
 $('#sheet-diagram').querySelectorAll('[data-component]').forEach(part=>{part.removeAttribute('tabindex');part.removeAttribute('role');});
 $('#edit-sheet').href=basketId?deploymentPath('/les-paul-kits/?edit='+encodeURIComponent(basketId)):builderURL(config);$('#sheet-content').hidden=false;$('#print-sheet').disabled=false;
 $('#print-sheet').addEventListener('click',()=>window.print());
}catch(error){$('#sheet-status').textContent=error.message;}
