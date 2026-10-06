import {potValues,resistanceKohms} from '../admin/pot-specs.mjs';
import {parseCapacitance,capacitorValues} from '../admin/electrical-specs.mjs';
import {deploymentPath} from '../deployment.mjs';
const pf=value=>value?value.value*({pF:1,nF:1000,'µF':1000000}[value.unit]||NaN):null;
export function logicalParts(circuit){
 if(!circuit?.components?.length)return {supported:false,reason:'A complete component list is unavailable for this descriptive or unsupported arrangement.',items:[]};
 return {supported:true,reason:'Logical components only. Wire lengths, hardware, physical dimensions and installation materials are not inferred.',items:circuit.components.filter(c=>c.type!=='ground').map(c=>({id:c.id,type:c.type,label:c.label,value:c.value||'Specification not modelled',quantity:1,role:c.role||null}))};
}
export function possibleMatches(requirement,records){
 return records.filter(p=>p.active===true&&p.individually===true&&/^[a-zA-Z0-9-]{1,80}$/.test(p.id)&&Number.isSafeInteger(p.salePrice??p.price)&&(p.salePrice??p.price)>0&&Number.isSafeInteger(p.stock)&&p.stock>=0).filter(p=>{
  if(requirement.type==='capacitor'&&p.category==='capacitors'){const needed=pf(parseCapacitance(requirement.value)),actual=pf(capacitorValues(p).capacitance);return needed>0&&actual===needed;}
  if(requirement.type==='pot'&&p.category==='potentiometers'){
   const match=requirement.value.match(/^([0-9.]+kΩ) (Audio|Linear|Reverse Audio)$/);if(!match)return false;const facts=potValues(p),taper={Audio:['audio','A / Audio'],Linear:['linear','B / Linear'],'Reverse Audio':['reverse_audio','C / Reverse Audio']}[match[2]];return facts.Resistance===resistanceKohms(match[1])&&taper.includes(facts.Taper)&&['Standard','standard'].includes(facts.Type);
  }
  return false; // Switch pinouts, pickup coils, combined networks and fit are not guessed.
 });
}
export function mountPartsList(root,{getCircuit,repository}){
 const doc=root.ownerDocument,e=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;},details=e('details'),summary=e('summary','Logical parts / possible catalogue matches'),copy=e('p'),list=e('ul'),status=e('p'),find=e('button','Find possible catalogue matches');find.type='button';status.setAttribute('role','status');details.append(summary,copy,list,find,status);root.append(details);let records=null,loading=false;
 function update(){const bom=logicalParts(getCircuit());copy.textContent=bom.reason+' Check physical fit, shaft/type, tolerances and maker documentation separately.';list.replaceChildren();for(const item of bom.items){const row=e('li',item.quantity+' × '+item.label+' · '+item.value);if(records){const matches=possibleMatches(item,records);if(!matches.length)row.append(e('p','No verified individual catalogue match. Keep this logical requirement.'));for(const product of matches.slice(0,4)){const a=e('a','Possible value match: '+product.name+(product.stock===0?' · out of stock':''));a.href=deploymentPath('/products/'+product.id.toLowerCase()+'/');row.append(e('p','Physical fit is unknown; verify dimensions and the full specification.'),a);}}list.append(row);}find.disabled=!bom.supported||loading;}
 find.addEventListener('click',async()=>{if(loading)return;loading=true;update();try{records=await repository.list();status.textContent='Possible value matches only. Product pages provide current stock, price and fitment information.';}catch{status.textContent='Catalogue unavailable. Your logical parts list remains available; retry when connected.';}finally{loading=false;update();}});
 return {update};
}
