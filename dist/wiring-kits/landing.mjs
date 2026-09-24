import {populateFitment} from './fitment.mjs';
import {createKitFamilyRepository} from './family-repository.mjs';
import {deploymentPath} from '../deployment.mjs';
document.body.classList.add('wiring-kits-landing');
const stylesheet=document.createElement('link');
stylesheet.rel='stylesheet';stylesheet.href=new URL('./landing.css',import.meta.url).href;document.head.append(stylesheet);
const routes=document.querySelectorAll('.wiring-route p');
routes[0].textContent='Already know your guitar layout and component choices? Configure the kit directly.';
routes[1].textContent='Unsure about fitment or component choices? Answer a few questions for a sensible starting specification.';
try{
 const visible=await createKitFamilyRepository().visible(),direct=document.querySelector('[data-kit-direct]'),browser=document.querySelector('.family-browser');
 const first=visible.find(family=>family.builderEnabled);
 if(first&&direct){direct.href=deploymentPath(first.route);direct.hidden=false;}
 for(const family of visible){
  let row=[...browser.querySelectorAll('.family-row')].find(item=>item.querySelector('h3')?.textContent===family.collection);
  if(!row){row=document.createElement('div');row.className='family-row';const heading=document.createElement('h3');heading.textContent=family.collection;row.append(heading,document.createElement('div'));browser.append(row);}
  const link=document.createElement('a'),state=document.createElement('small');link.textContent=family.title.replace(/ Style Wiring Kit$/,'');state.textContent=family.builderEnabled?'AVAILABLE →':'BUILDER UNAVAILABLE';if(family.builderEnabled)link.href=deploymentPath(family.route);else link.setAttribute('aria-disabled','true');link.append(' ',state);row.lastElementChild.prepend(link);
 }
}catch(error){const notice=document.createElement('p');notice.setAttribute('role','status');notice.textContent='Wiring Kit collection could not be loaded. '+error.message;document.querySelector('.collection-heading')?.after(notice);}
const prsHeading=document.querySelectorAll('.family-row h3')[1];
if(prsHeading)prsHeading.textContent='PRS / SE';
const list=document.querySelector('#fitment-checks');populateFitment(list,{interactive:true});
list.addEventListener('change',()=>{const done=list.querySelectorAll('input:checked').length;document.querySelector('#fitment-progress').textContent=`${done} of 5 checked. This checklist is a planning aid, not confirmation of fit.`;});
