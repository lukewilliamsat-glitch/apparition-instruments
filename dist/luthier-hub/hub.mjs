export function mountHubSearch(doc=document){
 const cards=[...doc.querySelectorAll('[data-search]')],input=doc.querySelector('#hub-search'),topic=doc.querySelector('#hub-topic');
 const normalise=s=>s.toLowerCase().replaceAll('ω','ohm').replaceAll('µ','u').replace(/[^a-z0-9.]+/g,' ').trim();
 function filter(){const terms=normalise(input.value).split(' ').filter(Boolean);let count=0;for(const card of cards){const haystack=normalise(card.dataset.search);card.hidden=topic.value!=='all'&&card.dataset.topic!==topic.value||!terms.every(t=>haystack.includes(t));if(!card.hidden)count++;}doc.querySelector('#hub-count').textContent=count+' matching guides';doc.querySelector('#hub-empty').hidden=count>0;}
 input.addEventListener('input',filter);topic.addEventListener('change',filter);return filter;
}
if(typeof document!=='undefined'&&document.querySelector('#hub-search'))mountHubSearch();

// Educational navigation only. No circuit model, account, storage or network call.
export function mountHubSignal(doc=document){
 const panels=doc.querySelector('.hub-signal-panels'),links=[...doc.querySelectorAll('[data-signal-step]')];
 if(!panels||panels.dataset.mounted)return null;panels.dataset.mounted='true';
 const media=doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)');
 let active='pickup';
 function show(id){if(!links.some(a=>a.dataset.signalStep===id))return;active=id;const reduced=media.matches;panels.classList.toggle('is-enhanced',!reduced);
  for(const panel of panels.querySelectorAll('[data-signal-panel]'))panel.hidden=!reduced&&panel.dataset.signalPanel!==id;
  for(const link of links){if(link.dataset.signalStep===id)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');}
  for(const stage of doc.querySelectorAll('[data-signal-stage]'))stage.dataset.active=String(stage.dataset.signalStage===id);
 }
 for(const link of links){link.addEventListener('focus',()=>show(link.dataset.signalStep));link.addEventListener('pointerenter',()=>show(link.dataset.signalStep));link.addEventListener('click',event=>{event.preventDefault();show(link.dataset.signalStep);});}
 media.addEventListener('change',()=>show(active));show(active);return {show};
}
if(typeof document!=='undefined')mountHubSignal();
