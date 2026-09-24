import {populateFitment} from './fitment.mjs';
import {lesPaul} from './kit-data.mjs';
document.body.classList.add('wiring-kits-landing');
const stylesheet=document.createElement('link');
stylesheet.rel='stylesheet';stylesheet.href=new URL('./landing.css',import.meta.url).href;document.head.append(stylesheet);
const routes=document.querySelectorAll('.wiring-route p');
routes[0].textContent='Already know your guitar layout and component choices? Configure the kit directly.';
routes[1].textContent='Unsure about fitment or component choices? Answer a few questions for a sensible starting specification.';
if(!lesPaul.showOnWiringKits){document.querySelector('.wiring-route[href*="les-paul-kits"]')?.setAttribute('hidden','');document.querySelector('.family-row a[href*="les-paul-kits"]')?.setAttribute('hidden','');}
const prsHeading=document.querySelectorAll('.family-row h3')[1];
if(prsHeading)prsHeading.textContent='PRS / SE';
const list=document.querySelector('#fitment-checks');populateFitment(list,{interactive:true});
list.addEventListener('change',()=>{const done=list.querySelectorAll('input:checked').length;document.querySelector('#fitment-progress').textContent=`${done} of 5 checked. This checklist is a planning aid, not confirmation of fit.`;});
