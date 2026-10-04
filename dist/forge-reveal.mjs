// Homepage choreography consumes the same circuit and response authorities as Forge.
import {homepageCircuit,homepageStateKey,homepageSpecificationKey} from './electronics/presentation/homepage-state.mjs';
import {forgeResponse} from './circuit-forge/response.mjs';
import {responseGraph} from './circuit-forge/response-view.mjs';
import {inspectSelection,terminalName} from './circuit-forge/workbench.mjs';
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
   context.innerHTML='<span>SIGNAL ANALYSIS / ELECTRICAL RESPONSE</span><strong>See what the circuit does.</strong><small>Modelled electrical response across 20 Hz–20 kHz.</small><small class="forge-reveal-response-state"></small>';
   context.querySelector('.forge-reveal-response-state').textContent=`${circuit.state.wiring[0].toUpperCase()+circuit.state.wiring.slice(1)} wiring · ${report.channel[0].toUpperCase()+report.channel.slice(1)} pickup`;
   const graph=responseGraph(report);graph.querySelector('.response-current')?.setAttribute('pathLength','1');response.append(context,graph);
  }
  const mount=document.querySelector('#forge-reveal-circuit');
  const asset=new URL('./assets/signal-forge-full.svg',import.meta.url);
  asset.search=new URL(import.meta.url).search||'?rev=platform-qa-v1';
  fetch(asset).then(result=>{if(!result.ok)throw Error('Circuit artwork unavailable');return result.text();}).then(markup=>{
   const svg=new DOMParser().parseFromString(markup,'image/svg+xml').documentElement;
   if(svg.getAttribute('data-diagram-surface')!=='dark')throw Error('Circuit artwork surface mismatch');
   if(svg.getAttribute('data-homepage-specification')!==homepageSpecificationKey(circuit))throw Error('Circuit artwork specification mismatch');
   if(svg.getAttribute('data-circuit-state')!==homepageStateKey(circuit))throw Error('Circuit artwork state mismatch');
   if(svg.localName!=='svg')throw Error('Invalid circuit artwork');
   // Compatibility only: keep the accepted choreography while binding its
   // trace and inspection to the corrected Modern selector-before-volume graph.
   const study=conventionalSignalStudy(circuit);
   const lead=circuit.connections.find(w=>w.from===study.pickup.id+'.hot'&&w.to.startsWith(study.selector.id+'.'));
   const contact=circuit.contacts.find(pair=>pair.includes(lead.to));
   const selectedThrow=contact?.find(ref=>ref!==lead.to);
   const input=circuit.connections.find(w=>w.from===selectedThrow&&w.to===study.volume.id+'.lug3');
   const output=circuit.connections.find(w=>w.from===study.volume.id+'.lug2'&&w.to==='jack.tip');
   if(!input||!output)throw Error('Signal path unavailable');
   const path=[lead.id,input.id,output.id];
   const selected=inspectSelection(circuit,{kind:'terminal',ref:study.volume.id+'.lug2'});
   if(!selected?.output)throw Error('Selected termination unavailable');
   const annotation=section.querySelector('.forge-reveal-inspect');
   annotation.querySelector('span').textContent=terminalName(circuit,study.volume.id+'.lug2').split(' / ')[0];
   annotation.querySelector('strong').textContent=terminalName(circuit,study.volume.id+'.lug2').split(' / ')[1];
   annotation.querySelector('small').textContent='ROLE / Volume-controlled signal to output jack TIP. Tone loads signal-input lug 3.';
   annotation.querySelector('.forge-reveal-inspect-path').textContent='IN THE PATH / Pickup → Selector → Volume input 3 → Wiper 2 → Output jack TIP';
   for(const [stage,id] of path.entries()){
    const wireNode=svg.querySelector(`[data-wire="${id}"]`),line=wireNode?.querySelector('.wire-line');
    if(!line)throw Error('Signal route unavailable');
    wireNode.setAttribute('data-home-trace','');line.setAttribute('pathLength','1');
    const travel=line.cloneNode(false);travel.setAttribute('class','signal-travel');travel.removeAttribute('pathLength');travel.setAttribute('data-travel-stage',String(stage));travel.setAttribute('aria-hidden','true');wireNode.append(travel);
   }
   for(const hop of svg.querySelectorAll('[data-crossing-wire]'))if(path.includes(hop.getAttribute('data-crossing-wire')))hop.setAttribute('data-home-trace','');
   svg.querySelector(`[data-component="${study.volume.id}"]`)?.setAttribute('data-home-inspect','');
   svg.querySelector(`[data-terminal="${study.volume.id}.lug2"]`)?.setAttribute('data-home-inspect','');
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
