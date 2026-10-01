import {createReference} from '../electronics/instrument/configuration.mjs';
import {instrumentCircuitState} from '../electronics/instrument/circuit.mjs';
import {shareProjectURL} from '../electronics/state/project.mjs';
// Small educational handoff. Reference creation uses the same shared authority as Forge.
for(const root of document.querySelectorAll('[data-instrument-references]')){
 for(const id of root.dataset.instrumentReferences.split(' ')){
  const i=createReference(id),a=document.createElement('a');a.href=shareProjectURL({version:1,electronics:instrumentCircuitState(i)});a.textContent='Explore '+i.reference.replace('les-paul','Les Paul / SG').replace('prs-hh','PRS-style HH').replace('strat','Strat').replace('tele','Tele')+' controls in Signal Forge →';a.className='contextual-help';root.append(a);
 }
}
