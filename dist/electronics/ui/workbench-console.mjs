// Compact shared chrome: moves existing controls without owning circuit state.
export function compactWorkbench(doc,tool){
 const forge=tool==='forge',bench=doc.querySelector(forge?'.forge-workbench':'#workbench'),state=doc.querySelector(forge?'#forge-circuit-state':'#generator-circuit-state');
 const controls=doc.createElement('div');controls.className='bench-control-region';controls.setAttribute('aria-label','Workbench controls');bench.prepend(controls);controls.append(state);
 if(forge){controls.append(doc.querySelector('.forge-workspace-modes'));const physical=doc.querySelector('#forge-mode-physical'),bar=doc.createElement('div');bar.className='bench-modebar';physical.prepend(bar);bar.append(doc.querySelector('.forge-presentation-modes'),doc.querySelector('.forge-mobile-zoom'));doc.querySelector('#forge-explore').open=false;doc.querySelector('#forge-diagram-key').open=false;}
 else{const bar=doc.createElement('div');bar.className='bench-modebar';controls.append(bar);bar.append(doc.querySelector('.presentation-modes'),doc.querySelector('.zoom-tools'));controls.append(doc.querySelector('.wire-filters'));doc.querySelector('.canvas-toolbar').remove();}
 // Orientation remains complete and available beside the diagram, on demand.
 const guidance=[...bench.querySelectorAll('.diagram-guidance')];for(const detail of guidance){detail.classList.add('bench-guidance');const viewport=bench.querySelector(forge?'#forge-viewport':'#generator-viewport');viewport.after(detail);}
}
