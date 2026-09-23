import {basketCount} from './commerce.mjs';
// Keep existing root-relative routes inside a project subpath when the site is
// hosted below the domain root (for example on GitHub Pages).
const deploymentRoot=new URL('.',import.meta.url);
function keepInDeploymentRoot(element){
 for(const attribute of ['href','src','action']){
  const value=element?.getAttribute?.(attribute);
  if(value?.startsWith('/')&&!value.startsWith(deploymentRoot.pathname)){
   const url=new URL(value.slice(1),deploymentRoot);
   element.setAttribute(attribute,url.pathname+url.search+url.hash);
  }
 }
}
if(deploymentRoot.pathname!=='/'){
 document.querySelectorAll('[href^="/"],[src^="/"],[action^="/"]').forEach(keepInDeploymentRoot);
 document.addEventListener('click',event=>keepInDeploymentRoot(event.target.closest?.('a[href^="/"]')),true);
 document.addEventListener('submit',event=>keepInDeploymentRoot(event.target),true);
}
const menu=document.querySelector('.menu-button'),mobileNav=document.querySelector('#mobile-nav');
function closeMenu(){if(!menu||!mobileNav)return;menu.setAttribute('aria-expanded','false');mobileNav.hidden=true;menu.querySelector('span').textContent='+';}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));mobileNav.hidden=open;menu.querySelector('span').textContent=open?'+':'−';});
mobileNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobileNav&&!mobileNav.hidden){closeMenu();menu.focus();}});
window.matchMedia('(min-width: 1101px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
function updateCount(){try{document.querySelectorAll('[data-basket-count]').forEach(el=>{el.textContent=basketCount();});}catch{document.querySelectorAll('[data-basket-count]').forEach(el=>el.textContent='—');}}
updateCount();window.addEventListener('storage',updateCount);window.addEventListener('apparition:basket-changed',updateCount);window.addEventListener('pageshow',updateCount);
const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion=motionQuery.matches,queued=false;
if(document.body.classList.contains('home-page')){
 const heroArt=document.querySelector('.hero-art');
 const heroContent=document.querySelector('.hero-content');
 if(heroArt)heroArt.dataset.speed='0.14';
 if(heroContent){heroContent.classList.add('parallax');heroContent.dataset.speed='0.025';}
 document.querySelectorAll('.collection>.section-top,.home-generator,.ethos>.section-top,.hub-preview>.section-top,.guitar-teaser').forEach(el=>el.classList.add('reveal'));
}
if(!reduceMotion&&'IntersectionObserver' in window){
 document.body.classList.add('motion-ready');
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}});},{threshold:.05});
 document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
}
const layers=[...document.querySelectorAll('.parallax')],progress=document.querySelector('.progress');
function updateScroll(){
 const viewport=window.innerHeight,max=document.documentElement.scrollHeight-viewport;
 if(progress)progress.style.transform=`scaleX(${max>0?Math.max(0,Math.min(1,window.scrollY/max)):0})`;
 layers.forEach(layer=>{if(reduceMotion){layer.style.transform='none';return;}const box=layer.parentElement.getBoundingClientRect();if(box.bottom>0&&box.top<viewport){const speed=Number(layer.dataset.speed)||0;const shift=layer.classList.contains('art-parallax')?Math.max(-35,Math.min(35,(viewport/2-box.top-box.height/2)*speed)):-box.top*speed;layer.style.transform=`translate3d(0,${shift}px,0)`;}});
 queued=false;
}
window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(updateScroll);}},{passive:true});
window.addEventListener('resize',updateScroll);motionQuery.addEventListener('change',e=>{reduceMotion=e.matches;if(reduceMotion)document.body.classList.remove('motion-ready');updateScroll();});updateScroll();

const dropdowns=[...document.querySelectorAll('.nav-components')];
for(const item of dropdowns){item.addEventListener('toggle',()=>{if(item.open)dropdowns.filter(x=>x!==item).forEach(x=>x.open=false);});item.addEventListener('keydown',e=>{const links=[...item.querySelectorAll('a')];if(e.key==='Escape'){item.open=false;item.querySelector('summary').focus();e.stopPropagation();}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();item.open=true;const index=links.indexOf(document.activeElement),next=e.key==='ArrowDown'?(index+1)%links.length:(index<=0?links.length-1:index-1);links[next].focus();}});}
document.addEventListener('click',e=>dropdowns.forEach(d=>{if(!d.contains(e.target))d.open=false;}));
// Hover is an enhancement to native disclosure, not a dependency for touch or keyboard use.
const hoverNavigation=matchMedia('(hover: hover) and (min-width: 1101px)');
for(const item of dropdowns){item.addEventListener('pointerenter',()=>{if(hoverNavigation.matches)item.open=true;});item.addEventListener('pointerleave',()=>{if(hoverNavigation.matches&&!item.contains(document.activeElement))item.open=false;});item.addEventListener('focusout',()=>queueMicrotask(()=>{if(!item.contains(document.activeElement)&&!item.matches(':hover'))item.open=false;}));}
