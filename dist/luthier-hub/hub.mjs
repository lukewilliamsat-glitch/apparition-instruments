export function mountHubSearch(doc=document){
 const cards=[...doc.querySelectorAll('[data-search]')],input=doc.querySelector('#hub-search'),topic=doc.querySelector('#hub-topic');
 const normalise=s=>s.toLowerCase().replaceAll('ω','ohm').replaceAll('µ','u').replace(/[^a-z0-9.]+/g,' ').trim();
 function filter(){const terms=normalise(input.value).split(' ').filter(Boolean);let count=0;for(const card of cards){const haystack=normalise(card.dataset.search);card.hidden=topic.value!=='all'&&card.dataset.topic!==topic.value||!terms.every(t=>haystack.includes(t));if(!card.hidden)count++;}doc.querySelector('#hub-count').textContent=count+' matching guides';doc.querySelector('#hub-empty').hidden=count>0;}
 input.addEventListener('input',filter);topic.addEventListener('change',filter);return filter;
}
if(typeof document!=='undefined'&&document.querySelector('#hub-search'))mountHubSearch();
