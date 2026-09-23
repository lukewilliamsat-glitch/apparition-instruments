const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const menu = document.querySelector('.menu-button');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu(){menu.setAttribute('aria-expanded','false');mobileNav.hidden=true;menu.querySelector('span').textContent='+';}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));mobileNav.hidden=open;menu.querySelector('span').textContent=open?'+':'−';});
mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mobileNav.hidden){closeMenu();menu.focus();}});
window.matchMedia('(min-width: 1181px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
document.querySelector('#year').textContent=new Date().getFullYear();
if(!reduceMotion && 'IntersectionObserver' in window){
 document.body.classList.add('motion-ready');
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}});},{threshold:0.06});
 document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
}
const layers=[...document.querySelectorAll('.parallax')];
const progress=document.querySelector('.progress');let queued=false;
function updateScroll(){
 const viewport=window.innerHeight;const max=document.documentElement.scrollHeight-viewport;
 progress.style.transform=`scaleX(${max>0?Math.max(0,Math.min(1,window.scrollY/max)):0})`;
 if(!reduceMotion){layers.forEach(layer=>{const box=layer.parentElement.getBoundingClientRect();if(box.bottom>0&&box.top<viewport){const shift=-box.top*Number(layer.dataset.speed);layer.style.transform=`translate3d(0,${shift}px,0)`;}});}
 queued=false;
}
window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(updateScroll);}},{passive:true});
window.addEventListener('resize',updateScroll);updateScroll();
