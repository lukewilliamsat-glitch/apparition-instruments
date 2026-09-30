import {readDesignerHandoff,circuitStateURL} from '../electronics/state/circuit-state.mjs';
import {defaults,fields,types,topologies,topologyOf,validateState,bleedSummary} from '../electronics/response/circuits.mjs';
import {audioTaper,frequencyResponse,responseAt,magnitudeDB} from '../electronics/response/engine.mjs';
import {renderGraph,graphLimits} from './graph.mjs?v=p10a2';
import {freezeReference} from './frozen.mjs';
import {exactBleedMatches} from './product-match.mjs';
import {productURL} from '../products/model.mjs?v=p11ef';
const $=s=>document.querySelector(s),form=$('#designer-inputs'),field=k=>form.elements.namedItem(k),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let state={...defaults},points=[],frozen=null,catalogue=[],addComponent=null;
const money=pence=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100);
let productsReady=false;
function renderMatches(){
 const root=$('#matching-products');root.replaceChildren();root.hidden=true;
 if(!productsReady||!points.length||topologyOf(state)==='none')return;
 root.hidden=false;root.append(el('h2','Matching Apparition products'));
 const matches=exactBleedMatches(state,catalogue);
 if(!matches.length){root.append(el('p','No exact catalogue match for this network. You can continue using the Designer.'));return;}
 for(const product of matches){const item=el('div'),heading=el('h3',product.name),availability=el('p',product.stock===0?'Out of stock':money(product.price)+' · In stock'),link=el('a','View product →'),button=el('button','Add to basket'),feedback=el('p');
  link.href=productURL(product.id);button.type='button';button.disabled=product.stock===0||!addComponent;feedback.setAttribute('role','status');
  button.addEventListener('click',()=>{try{addComponent(product.id);feedback.textContent='Added to your basket.';}catch(error){feedback.textContent=error.message;}});
  item.append(heading,availability,link,button,feedback);root.append(item);
 }
}
function showFrozen(){const active=!!frozen;$('#freeze-reference').hidden=active;$('#update-reference').hidden=!active;$('#clear-reference').hidden=!active;$('#frozen-summary').hidden=!active;$('#frozen-key').hidden=!active;$('#frozen-summary').textContent=active?'FROZEN REFERENCE · '+frozen.summary:'';}
function fill(values=defaults){for(const [key,value] of Object.entries(values)){const shown=key==='toneCap'?value/1000:value;field(key).value=shown;if(values===defaults)field(key).defaultValue=shown;}}
function visibility(){const topology=topologyOf({type:field('type').value,topology:field('topology').value});$('#custom-topology').hidden=field('type').value!=='custom';field('topology').disabled=field('type').value!=='custom';for(const key of ['bleedC','bleedR']){const visible=topology!=='none'&&(key==='bleedC'||topology!=='capacitor');field(key).closest('label').hidden=!visible;field(key).disabled=!visible;}$('#network-info').textContent=topology==='none'?'No bypass network across the volume control.':topology==='capacitor'?'A capacitor connects volume input to the wiper/output.':topology==='parallel'?'The capacitor and resistor each connect across volume input and output, in parallel.':'The capacitor and resistor form one series branch between volume input and output.';}
function update(){
 visibility();const next={...state,type:field('type').value,topology:field('topology').value};for(const key of Object.keys(fields)){const input=field(key);if(!input.disabled)next[key]=input.value.trim()===''?NaN:Number(input.value)*(key==='toneCap'?1000:1);input.removeAttribute('aria-invalid');}
 try{validateState(next);state=next;points=frequencyResponse(state);$('#designer-error').textContent='';$('#response-content').hidden=false;$('#circuit-summary').hidden=false;renderGraph($('#response-graph'),points,state.volume,frozen);$('#volume-value').textContent=state.volume.toFixed(1)+' / 10';$('#tone-position-value').textContent=state.tonePosition.toFixed(1)+' / 10';$('#wiper-position').textContent=(audioTaper(state.volume)*100).toFixed(2)+'% of the pot resistance from ground to wiper';$('#graph-note').textContent=state.volume===0?'Volume 0: output is muted. Zero output is drawn at the −100 dB display floor.':points.some(p=>p.current<=graphLimits.min||p.reference<=graphLimits.min||p.current>=graphLimits.max||p.reference>=graphLimits.max)?'Some response lies outside the −100 to +40 dB display range. See numeric samples below.':(frozen?'All curves':'Both curves')+' use the same source-voltage reference. They are not independently normalised.';
 const summary=[['Pickup',`${state.pickupR}kΩ / ${state.pickupL}H / ${state.pickupC}pF`],['Volume potentiometer',`${state.volumePot}kΩ · audio taper`],['Tone potentiometer',`${state.tonePot}kΩ · position ${state.tonePosition.toFixed(1)} / 10`],['Tone control capacitor',`${state.toneCap/1000}µF`],['Treble bleed network',bleedSummary(state)],['Volume position',`${state.volume.toFixed(1)} / 10`],['Load',`${state.loadR}MΩ / ${state.cableC}pF`]];$('#summary-values').replaceChildren(...summary.map(([title,value])=>{const row=el('div');row.append(el('dt',title),el('dd',value));return row;}));
 $('#response-samples').replaceChildren(...[20,100,1000,5000,10000,20000].map(f=>{const row=el('tr');row.append(el('th',f.toLocaleString('en-GB')+' Hz'),el('td',state.volume===0?'Muted':magnitudeDB(responseAt(state,f)).toFixed(2)+' dB'),el('td',magnitudeDB(responseAt({...state,volume:10},f)).toFixed(2)+' dB'));return row;}));
 renderMatches();
 }catch(error){points=[];$('#designer-error').textContent=error.message;$('#response-content').hidden=true;$('#circuit-summary').hidden=true;$('#matching-products').hidden=true;for(const [key,meta] of Object.entries(fields)){const input=field(key);if(!input.disabled&&(!Number.isFinite(next[key])||next[key]<meta.min||next[key]>meta.max))input.setAttribute('aria-invalid','true');}}
}
for(const key of ['volume','tonePosition']){field(key).addEventListener('input',update);field(key).addEventListener('change',update);}
form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',update);form.addEventListener('change',update);form.addEventListener('reset',()=>{state={...defaults};frozen=null;$('#designer-import-note').textContent='';$('#designer-source-circuit').hidden=true;fill();showFrozen();update();});
function capture(){if(!points.length)return;frozen=freezeReference(state);showFrozen();renderGraph($('#response-graph'),points,state.volume,frozen);}
$('#freeze-reference').addEventListener('click',capture);$('#update-reference').addEventListener('click',capture);
$('#clear-reference').addEventListener('click',()=>{frozen=null;showFrozen();if(points.length)renderGraph($('#response-graph'),points,state.volume);});
fill();const imported=readDesignerHandoff(window.location.search);if(imported.response){state=imported.response;fill(state);$('#designer-import-note').textContent=imported.notice+' '+imported.state.configuration.position+' pickup. Designer compares against full Volume; Signal Lab comparison modes and frozen references remain local. Wiring topology and conductor profiles are retained in the source link, not modelled here.';$('#designer-source-circuit').href=circuitStateURL('/circuit-forge/',imported.state);$('#designer-source-circuit').hidden=false;}else $('#designer-import-note').textContent=imported.notice;showFrozen();update();
import('../components/catalogue.mjs').then(products=>{
 catalogue=products.catalogue;productsReady=true;renderMatches();
 import('../commerce.mjs').then(basket=>{addComponent=basket.addComponent;renderMatches();}).catch(()=>{});
}).catch(()=>{$('#matching-products').hidden=false;$('#matching-products').textContent='Catalogue products are temporarily unavailable. The Designer remains available.';});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(points.length)renderGraph($('#response-graph'),points,state.volume,frozen);}).observe($('#response-graph'));
