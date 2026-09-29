// Homepage choreography consumes the same circuit and response authorities as Forge.
import {forgeCircuit} from './circuit-forge/model.mjs';
import {forgeResponse} from './circuit-forge/response.mjs';
import {responseGraph} from './circuit-forge/response-view.mjs';

export const chapterForProgress=progress=>Math.min(3,Math.max(0,Math.floor(Math.min(1,Math.max(0,progress))*4)));

if(typeof document!=='undefined'){
 const section=document.querySelector('#signal-forge');
 if(section){
  const circuit=forgeCircuit({position:'neck'}).circuit;
  const report=forgeResponse(circuit);
  const response=document.querySelector('#forge-reveal-response');
  if(report.supported){const graph=responseGraph(report);graph.querySelector('.response-current')?.setAttribute('pathLength','1');response.append(graph);}
  const mount=document.querySelector('#forge-reveal-circuit');
  const asset=new URL('./assets/signal-forge-full.svg?rev=signal-forge-v1d',import.meta.url);
  fetch(asset).then(result=>{if(!result.ok)throw Error('Circuit artwork unavailable');return result.text();}).then(markup=>{
   const svg=new DOMParser().parseFromString(markup,'image/svg+xml').documentElement;
   if(svg.localName!=='svg')throw Error('Invalid circuit artwork');
   const wire=(from,to)=>circuit.connections.find(item=>item.from===from&&item.to===to)?.id;
   const path=[wire('neckPickup.hot','neckVolume.lug3'),wire('neckVolume.lug2','selector.neck'),wire('selector.outB','jack.tip')];
   if(path.some(id=>!id)||!circuit.contacts.some(([a,b])=>a==='selector.neck'&&b==='selector.outN'))throw Error('Signal path unavailable');
   for(const id of path){const wireNode=svg.querySelector(`[data-wire="${id}"]`);wireNode?.setAttribute('data-home-trace','');wireNode?.querySelector('.wire-line')?.setAttribute('pathLength','1');}
   for(const hop of svg.querySelectorAll('[data-crossing-wire]'))if(path.includes(hop.getAttribute('data-crossing-wire')))hop.setAttribute('data-home-trace','');
   svg.querySelector('[data-component="neckVolume"]')?.setAttribute('data-home-inspect','');
   svg.querySelector('[data-terminal="neckVolume.lug2"]')?.setAttribute('data-home-inspect','');
   mount.replaceChildren(svg);
   section.classList.add('has-circuit');
   const motion=matchMedia('(prefers-reduced-motion: reduce)');
   const desktop=matchMedia('(min-width: 901px)');
   let visible=false,queued=false,chapter=-1;
   const update=()=>{
    queued=false;
    if(!visible||!section.classList.contains('is-animated'))return;
    const range=section.offsetHeight-innerHeight;
    const next=chapterForProgress(range>0?-section.getBoundingClientRect().top/range:1);
    if(next!==chapter){chapter=next;section.dataset.stage=String(next);}
   };
   const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(update);}};
   const configure=()=>{
    const animate=!motion.matches&&desktop.matches&&'IntersectionObserver' in window;
    section.classList.toggle('is-animated',animate);
    if(animate){chapter=-1;schedule();}else{section.dataset.stage='3';}
   };
   if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();},{rootMargin:'100px'}).observe(section);
   else visible=true;
   addEventListener('scroll',schedule,{passive:true});addEventListener('resize',()=>{configure();schedule()});
   motion.addEventListener('change',configure);desktop.addEventListener('change',configure);configure();
  }).catch(()=>{/* The generated static circuit and links remain visible. */});
 }
}
