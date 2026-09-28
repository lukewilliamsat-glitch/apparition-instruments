import {lesPaul,resolveLesPaulKit} from './config.mjs';
import {storefrontProduct} from '../components/catalogue.mjs';
import {eligibleProduct,productURL,productDetails,physicalRows} from '../products/model.mjs?v=p11';
import {imageSource} from '../admin/images.mjs';

const roles={pots:'potentiometers',shaft:'potentiometers',caps:'neckToneCapacitor',bleed:'trebleBleeds',jack:'outputJack',selector:'selector'};
export function choiceDetails(state,group,value,options=[]){
 const role=roles[group];if(!role||group==='caps'&&value==='mixed'||['bleed','jack','selector'].includes(group)&&value==='none')return null;
 const candidate=resolveLesPaulKit({...state,[group]:value}),part=candidate.components.find(part=>part.role===role);
 if(!part?.componentId)return null;
 const record=lesPaul.productRecords?.find(item=>item.id===part.componentId);
 if(!record)return null;
 const product=storefrontProduct(record),supported=eligibleProduct(product);
 const relevant=productDetails(product,options).filter(row=>['Manufacturer','Resistance','Taper','Type','Capacitance','Voltage rating','Configuration','Resistor value','Jack type','Switch type'].includes(row.label)).slice(0,3);
 const fitment=group==='pots'||group==='shaft'?physicalRows(product).filter(row=>row.label==='Threaded bushing length'||row.label==='Threaded bushing diameter'):[];
 return {id:part.componentId,name:product.name,quantity:part.quantity,image:imageSource(product.image),facts:[...relevant,...fitment].slice(0,4),url:supported?productURL(product.id):null,stock:part.stockState};
}
export function renderChoiceDetails(root,data,doc=document){
 root.replaceChildren();if(!data){root.hidden=true;return;}
 root.hidden=false;const create=(tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 const visual=create('span','choice-visual');if(data.image){const image=create('img','');image.src=data.image;image.alt='';image.loading='lazy';image.addEventListener('error',()=>image.replaceWith(create('span','choice-image-fallback','No image')),{once:true});visual.append(image);}else visual.append(create('span','choice-image-fallback','No image'));
 const body=create('span','choice-detail-body'),name=create('span','choice-component-name',data.name);body.append(name);
 if(data.facts.length){const facts=create('span','choice-facts');facts.textContent=data.facts.map(row=>row.label+': '+row.value).join(' · ');body.append(facts);}
 if(data.quantity>1)body.append(create('span','choice-quantity',data.quantity+' components supplied'));
 if(data.url){const link=create('a','choice-detail-link','View details →');link.href=data.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','View '+data.name+' details in a new tab');body.append(link);}
 root.append(visual,body);
}
