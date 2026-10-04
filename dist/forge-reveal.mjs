// Homepage choreography consumes the same circuit and response authorities as Forge.
import {homepageCircuit,homepageStateKey,homepageSpecificationKey} from './electronics/presentation/homepage-state.mjs';
import {forgeResponse} from './circuit-forge/response.mjs';
import {responseGraph} from './circuit-forge/response-view.mjs';
import {conventionalSignalStudy} from './electronics/presentation/educational-truth.mjs';

export const chapterForProgress=progress=>Math.min(3,Math.max(0,Math.floor(Math.min(1,Math.max(0,progress))*4)));

if(typeof document!=='undefined'){
 const section=document.querySelector('#signal-forge');
 if(section){
  const circuit=homepageCircuit();
  const report=forgeResponse(circuit);
  const response=document.querySelector('#forge-reveal-response');
  if(report.supported){
   const context=document.createElement('div');context.className='forge-reveal-response-context';
   context.innerHTML='<span>SIGNAL ANALYSIS / ELECTRICAL RESPONSE</span><strong>See what the circuit does.</strong><small>Modelled electrical response across 20 Hz–20 kHz.</small><small>Illustrative single-pickup source assumptions; not measured pickup or acoustic sound.</small><small class="forge-reveal-response-state"></small>';
   context.querySelector('.forge-reveal-response-state').textContent=`${circuit.state.wiring[0].toUpperCase()+circuit.state.wiring.slice(1)} wiring · ${report.channel[0].toUpperCase()+report.channel.slice(1)} pickup`;
   const graph=responseGraph(report);graph.querySelector('desc').textContent='Illustrative neck pickup electrical response, 20 Hz to 20 kHz. Relative output in decibels. Modern tone wiring with generic single-pickup R/L/C assumptions; not a measured pickup or an acoustic sound prediction.';graph.querySelector('.response-current')?.setAttribute('pathLength','1');response.append(context,graph);
  }
  const mount=document.querySelector('#forge-reveal-circuit');
  const asset=new URL('./assets/signal-forge-full.svg',import.meta.url);
  asset.search=new URL(import.meta.url).search||'?rev=operations-v1';
  fetch(asset).then(result=>{if(!result.ok)throw Error('Circuit artwork unavailable');return result.text();}).then(markup=>{
   const svg=new DOMParser().parseFromString(markup,'image/svg+xml').documentElement;
   if(svg.localName!=='svg'||svg.getAttribute('data-home-renderer')!=='editorial-v1'||svg.getAttribute('data-diagram-surface')!=='cream')throw Error('Editorial artwork mismatch');
   if(svg.getAttribute('data-homepage-specification')!==homepageSpecificationKey(circuit)||svg.getAttribute('data-circuit-state')!==homepageStateKey(circuit))throw Error('Circuit artwork specification mismatch');
   const study=conventionalSignalStudy(circuit),path=svg.querySelector('[data-home-signal-to="jack.tip"]');
   const tip=svg.querySelector('[data-terminal="jack.tip"]');
   if(!path||!path.getAttribute('d').endsWith('H'+tip.getAttribute('cx'))||path.getAttribute('data-signal-output')!==study.volume.id+'.lug2')throw Error('Signal destination mismatch');
   const annotation=section.querySelector('.forge-reveal-inspect');
   annotation.querySelector('span').textContent='VOLUME CONTROL';
   annotation.querySelector('strong').textContent='INPUT 3 / WIPER 2';
   annotation.querySelector('small').textContent='Tone loads input lug 3; the wiper sends the signal to the jack TIP.';
   annotation.querySelector('.forge-reveal-inspect-path').textContent='Pickup → Selector → Volume → Output jack TIP';
   const desktopMount=mount.querySelector('.forge-reveal-wide');desktopMount.replaceChildren(svg);
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
