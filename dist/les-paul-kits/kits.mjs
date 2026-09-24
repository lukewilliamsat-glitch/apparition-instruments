import {generatorURL,installationGuideURL,readGeneratorURL,builderDiagramURL} from '../wiring-generator/session.mjs';
import {renderKitFields,updateFieldSummaries} from './fields.mjs';
import {defaults,normaliseKit,describeKit,specification,lesPaul,resolveLesPaulKit,invalidKitChoices,formatKitPrice,upgradeLabel,configurationFromURL,builderURL,specificationURL} from './config.mjs';
import {diagramMarkup,componentDescription} from './diagram.mjs';
import {readBasket,addKit} from '../commerce.mjs';
import {deploymentPath} from '../deployment.mjs';
import {refreshCatalogue} from '../components/catalogue.mjs';
await refreshCatalogue();
const form=document.querySelector('#kit-options'),field=name=>form.elements.namedItem(name),$=selector=>document.querySelector(selector);
let drawing={};try{drawing=readGeneratorURL(location.search).state;}catch{}
renderKitFields(form);
let diagramView='full',diagramFocus='all',enlarged=false,editId=new URLSearchParams(location.search).get('edit'),lastComponent=null,staleChoices=[];
function readState(){return normaliseKit(Object.fromEntries(Object.keys(defaults).map(k=>[k,field(k)?.value??defaults[k]])));}
function setControl(key,val){const control=field(key);if(!control)return;if(control instanceof RadioNodeList||Array.isArray(control)){for(const input of control)input.checked=input.value===val;return;}control.value=val;if(control.tagName==='SELECT'&&control.selectedIndex<0){const option=[...control.options].find(o=>o.value===val);if(option)option.selected=true;}}
function setState(value){staleChoices=invalidKitChoices(value);const state=normaliseKit(value);for(const [key,val] of Object.entries(state))setControl(key,val);}
setState(defaults);
function renderDiagram(state){
 const mount=$('#diagram-mount'),scroll=$('#diagram-scroll'),x=scroll.scrollLeft,y=scroll.scrollTop;
 const active=document.activeElement,attribute=['data-component','data-wire','data-terminal'].find(a=>active?.hasAttribute?.(a)),ref=attribute?active.getAttribute(attribute):null;
 mount.innerHTML=diagramMarkup(state,diagramFocus,lastComponent,drawing,false,diagramView);
 if(attribute)mount.querySelector(`[${attribute}="${ref}"]`)?.focus({preventScroll:true});
 if(lastComponent&&!mount.querySelector(`[data-component="${lastComponent}"],[data-wire="${lastComponent}"]`))lastComponent=null;
 $('#live-diagram').style.width=enlarged?'220%':'100%';scroll.scrollLeft=x;scroll.scrollTop=y;
 $('#diagram-selection').textContent=componentDescription(lastComponent||'',state,drawing);
}
function inspect(part){lastComponent=part.dataset.component||part.dataset.wire||part.dataset.terminal?.split('.')[0];renderDiagram(readState());}
$('#diagram-mount').addEventListener('click',e=>{const part=e.target.closest('[data-component],[data-terminal],[data-wire]');if(part)inspect(part);});
$('#diagram-mount').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const part=e.target.closest('[data-component],[data-terminal],[data-wire]');if(part){e.preventDefault();inspect(part);}}});
function render(){
 const state=readState(),resolved=resolveLesPaulKit(state),s=resolved.specification,mixed=state.caps==='mixed';updateFieldSummaries(form,state);$('#kit-type').textContent=resolved.title;$('#base-includes').textContent=resolved.included;
 $('#mixed-values').hidden=!mixed;field('neckCap').disabled=!mixed;field('bridgeCap').disabled=!mixed;
 for(const [key,val] of Object.entries(s))$(`#summary-${key}`).textContent=val;
 $('#wiring-chip').textContent=s.wiring;
 const pricing=resolved.pricing;$('#add-to-basket').disabled=!Number.isSafeInteger(pricing.total)||pricing.total<0||resolved.availability.status!=='available'||staleChoices.length>0;$('#kit-price').textContent=formatKitPrice(pricing.total);$('#builder-total').textContent=formatKitPrice(pricing.total);
 const priceLines=$('#price-breakdown');priceLines.replaceChildren();for(const line of pricing.lines){const row=document.createElement('div'),label=document.createElement('dt'),amount=document.createElement('dd');label.textContent=line.label;amount.textContent=line.key==='base'?formatKitPrice(line.price):upgradeLabel(line.price);row.append(label,amount);priceLines.append(row);}
 const modern=state.wiring!=='50s';
 setControl('bleed',state.bleed);$('#treble-bleed-options').disabled=!modern;$('#bleed-availability').hidden=modern;
 $('#wiring-note').textContent=state.wiring==='60s'?'60s wiring connects the tone circuit to the volume input, with the tone wiper grounded. Optional treble bleeds are available.':modern?'Modern wiring connects the tone circuit to the volume input, giving more independent volume and tone control behaviour.':'50s wiring connects the tone circuit to the volume output. It can retain more clarity as volume is reduced, with more interaction between volume and tone.';
 $('#connection-label').textContent=`${s.wiring} / volume ${modern?'input':'output'}`;
 $('#diagram-shaft').textContent=`${s.shaft} · ${state.pots}`;$('#diagram-matching').textContent=s.matching;
 const hasBleed=state.bleed!=='none';$('#bleed-note').hidden=!hasBleed;
 $('#bleed-note').textContent=lesPaul.bleed[state.bleed].description;
 $('#specification').value=specification(state);$('#print-kit').href=specificationURL(state);$('#view-installation').href=generatorURL(drawing,state);$('#kit-installation-guide').href=installationGuideURL(drawing,state);$('#share-fallback').hidden=true;$('#copy-status').textContent=staleChoices.length?'Previously selected options are no longer eligible: '+staleChoices.join(', ')+'. Choose a current option to continue.':resolved.availability.unavailable.length?'Out of stock or unavailable: '+resolved.availability.unavailable.map(part=>part.name).join(', ')+'. Choose an available configuration before adding to basket.':!Number.isFinite(pricing.total)?'This configuration contains an unpriced option. Choose an available option before adding it to your basket.':resolved.defaultWarnings.join(' ');renderDiagram(state);
}
form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('change',()=>{staleChoices=[];render();});field('model').addEventListener('input',()=>{const s=describeKit(readState());$('#summary-model').textContent=s.model;$('#specification').value=specification(readState());$('#print-kit').href=specificationURL(readState());$('#view-installation').href=generatorURL(drawing,readState());$('#kit-installation-guide').href=installationGuideURL(drawing,readState());$('#share-fallback').hidden=true;$('#copy-status').textContent='';});
form.addEventListener('reset',()=>setTimeout(()=>{lastComponent=null;$('#guided-notice').hidden=true;render();},0));
document.querySelectorAll('[data-diagram-focus]').forEach(button=>button.addEventListener('click',()=>{lastComponent=null;diagramFocus=button.dataset.diagramFocus;document.querySelectorAll('[data-diagram-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderDiagram(readState());}));
$('#diagram-zoom').addEventListener('click',()=>{enlarged=!enlarged;$('#diagram-zoom').setAttribute('aria-pressed',String(enlarged));$('#diagram-zoom').textContent=enlarged?'Fit':'Enlarge';$('#live-diagram').style.width=enlarged?'220%':'100%';});
$('#download-diagram').addEventListener('click',()=>{const blob=new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n'+diagramMarkup(readState(),'all',null,drawing,true,diagramView)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Apparition-Les-Paul-${readState().wiring}-Wiring.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#copy-spec').addEventListener('click',async()=>{try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(specification(readState()));$('#copy-status').textContent='Kit specification copied.';}catch{$('.spec-text').open=true;$('#specification').focus();$('#specification').select();$('#copy-status').textContent='Select and copy the specification below.';}});
$('#share-kit').addEventListener('click',async()=>{const url=new URL(builderDiagramURL(readState(),drawing),location.origin).href;try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(url);$('#copy-status').textContent='Configuration link copied. It includes your guitar model text and opens the current kit options and prices.';}catch{$('#share-fallback').hidden=false;$('#share-fallback').open=true;$('#share-url').value=url;$('#share-url').focus();$('#share-url').select();$('#copy-status').textContent='Select and copy the configuration link below.';}});
$('#add-to-basket').addEventListener('click',()=>{try{addKit(readState(),editId,drawing);if(editId){location.assign(deploymentPath('/basket/'));return;}$('#copy-status').textContent='Configuration added to your basket. You can continue exploring or view your basket below.';}catch(error){$('#copy-status').textContent=error.message;}});
let initialError='';
if(!editId){try{const recommendation=configurationFromURL(location.search);if(recommendation){setState(recommendation);$('#guided-notice').hidden=false;}}catch(error){initialError=error.message+' The default kit is shown.';}}
if(editId){try{const item=readBasket().find(x=>x.id===editId&&x.product==='les-paul');if(item){setState(item.configuration);drawing=item.record.diagram?.configuration||drawing;$('#guided-notice').hidden=false;$('#guided-notice').textContent='Editing your saved kit. Review the current options and price before saving. Your original basket configuration stays unchanged until you save.';$('#add-to-basket').firstChild.textContent='Save changes to basket ';}else{editId=null;initialError='That kit is no longer in your basket. You can configure and add a new kit.';history.replaceState(null,'',location.pathname);}}catch(error){editId=null;initialError=error.message;}}
render();if(initialError)$('#copy-status').textContent=initialError;$('#share-kit').disabled=false;$('#copy-spec').disabled=false;

document.querySelectorAll('[data-kit-view]').forEach(button=>button.addEventListener('click',()=>{
 diagramView=button.dataset.kitView;
 document.querySelectorAll('[data-kit-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 document.querySelector('#live-diagram')?.setAttribute('data-view',diagramView);
 $('#kit-view-note').textContent=diagramView==='kit'?'Highlighted: components supplied by Apparition. Muted: existing guitar components, not included.':'Complete installation circuit, including existing guitar components.';
}));
