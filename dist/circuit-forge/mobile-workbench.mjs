// Responsive presentation only: these surfaces keep the original controls and SVG.
// No circuit, selector or response state is owned here.
export function setupMobileWorkbench({mount,viewport,onChoose,onLayoutChange}){
 const $=selector=>document.querySelector(selector),media=window.matchMedia('(max-width: 850px)');
 const panels={configure:$('.forge-controls'),inspector:$('.forge-inspector')},homes={},dialogs={configure:$('#forge-configure-sheet'),inspector:$('#forge-inspector-sheet')};
 const explore=$('#forge-explore'),key=$('#forge-diagram-key'),zoomValue=$('#forge-zoom-value'),pointers=new Map();
 let mobile=false,zoom=1,fitWidth=0,opener=null,gesture=null,pinch=null,suppressClick=false,frame=0;
 for(const [name,panel] of Object.entries(panels)){homes[name]=document.createComment(name+' desktop position');panel.before(homes[name]);}
 const dialogBody=name=>dialogs[name].querySelector('.forge-sheet-body');
 function close(name,restore=true){
  if(dialogs[name].open)dialogs[name].close();
  document.body.classList.remove('forge-'+name+'-open');
  $(`[data-mobile-open="${name}"]`).setAttribute('aria-expanded','false');
  if(restore)(opener?.isConnected?opener:$(`[data-mobile-open="${name}"]`)).focus({preventScroll:true});
 }
 function open(name,fromSelection=false){
  if(!mobile)return;
  close(name==='configure'?'inspector':'configure',false);
  const active=document.activeElement;opener=active!==document.body?active:$(`[data-mobile-open="${name}"]`);
  if(!dialogs[name].open){if(name==='configure')dialogs[name].showModal();else dialogs[name].show();}
  document.body.classList.add('forge-'+name+'-open');
  $(`[data-mobile-open="${name}"]`).setAttribute('aria-expanded','true');
  if(fromSelection)active?.focus?.({preventScroll:true});else dialogs[name].querySelector('[data-mobile-close]').focus();
 }
 for(const name of Object.keys(dialogs)){
  $(`[data-mobile-open="${name}"]`).addEventListener('click',()=>dialogs[name].open?close(name):open(name));
  dialogs[name].querySelector('[data-mobile-close]').addEventListener('click',()=>close(name));
  dialogs[name].addEventListener('cancel',event=>{event.preventDefault();close(name);});
 }
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mobile){if(dialogs.configure.open)close('configure');else if(dialogs.inspector.open)close('inspector');}});
 $('#forge-inspector-expand').addEventListener('click',event=>{
  const expanded=dialogs.inspector.classList.toggle('is-expanded');event.currentTarget.setAttribute('aria-expanded',String(expanded));event.currentTarget.textContent=expanded?'Compact':'Expand';
 });
 function applyZoom(next=zoom,anchor){
  if(!mobile||!mount.querySelector('svg')||!viewport.clientWidth)return;
  const svg=mount.querySelector('svg'),box=svg.viewBox.baseVal;
  const previousWidth=fitWidth*zoom||viewport.clientWidth;
  const point=anchor||{x:viewport.clientWidth/2,y:viewport.clientHeight/2};
  const left=(viewport.scrollLeft+point.x)/previousWidth,top=(viewport.scrollTop+point.y)/previousWidth;
  fitWidth=Math.max(1,Math.min(viewport.clientWidth-2,viewport.clientHeight*box.width/box.height-2));
  zoom=Math.min(4,Math.max(1,next));const width=fitWidth*zoom;
  viewport.classList.toggle('is-fit',zoom===1);
  mount.style.width=width+'px';svg.style.width='100%';svg.style.height='auto';
  viewport.scrollLeft=Math.max(0,left*width-point.x);viewport.scrollTop=Math.max(0,top*width-point.y);
  zoomValue.textContent=Math.round(zoom*100)+'%';
  $('#forge-zoom-out').disabled=zoom<=1;$('#forge-zoom-in').disabled=zoom>=4;
 }
 function fit(){zoom=1;applyZoom();viewport.scrollLeft=0;viewport.scrollTop=0;}
 $('#forge-zoom-in').addEventListener('click',()=>applyZoom(zoom+.5));
 $('#forge-zoom-out').addEventListener('click',()=>applyZoom(zoom-.5));
 $('#forge-fit').addEventListener('click',fit);
 viewport.addEventListener('keydown',event=>{if(!mobile)return;if(['+','=','-','0'].includes(event.key)){event.preventDefault();if(event.key==='0')fit();else applyZoom(zoom+(event.key==='-'?-.5:.5));}});
 function diagramChanged(){
  if(!mobile)return;
  if(!viewport.clientWidth||!viewport.clientHeight)return;
  const svg=mount.querySelector('svg');
  if(svg&&!svg.dataset.desktopViewBox){
   // Fit physical artwork and its labels, rather than the desktop sheet margins.
   // Geometry still comes entirely from the shared renderer.
   const points=[],inverse=svg.getCTM().inverse();
   for(const node of svg.querySelectorAll('.component,.wire,.anchors,[data-pickup-profile],g text')){
    const box=node.getBBox(),matrix=inverse.multiply(node.getCTM());
    for(const [x,y] of [[box.x,box.y],[box.x+box.width,box.y+box.height]]){const point=svg.createSVGPoint();point.x=x;point.y=y;points.push(point.matrixTransform(matrix));}
   }
   const xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs)-25,top=Math.min(...ys)-25;
   if(Math.max(...xs)-Math.min(...xs)<100)return;
   svg.dataset.desktopViewBox=svg.getAttribute('viewBox');
   svg.setAttribute('viewBox',`${left} ${top} ${Math.max(...xs)-left+25} ${Math.max(...ys)-top+25}`);
  }
  // Enlarge invisible wire corridors in CSS pixels; visible artwork is untouched.
  for(const wire of mount.querySelectorAll('.wire')){if(!wire.dataset.desktopLabel)wire.dataset.desktopLabel=wire.getAttribute('aria-label');wire.setAttribute('aria-label',wire.dataset.desktopLabel.replace(/^Trace /,'Inspect conductor: '));}
  applyZoom();
 }
 function selectionChanged(selection){
  if(!mobile)return;
  $('#forge-touch-choices').replaceChildren();$('#forge-touch-choice-label').hidden=true;
  const title=$('#forge-inspection h4')?.textContent||'Inspect & explain';
  $('#forge-mobile-selection').textContent=title;$('#forge-inspector-sheet-title').textContent=title;
  open('inspector',true);
  const selector=selection?.kind==='terminal'?`[data-terminal="${selection.ref}"]`:selection?.kind==='wire'?`[data-wire="${selection.id}"]`:`[data-component="${selection?.id}"]`;
  const target=mount.querySelector(selector);
  if(target){
   if(zoom===1)applyZoom(2.5);
   const r=target.getBoundingClientRect(),v=viewport.getBoundingClientRect(),sheet=dialogs.inspector.getBoundingClientRect(),path=target.querySelector('.wire-line');
   const point=path?path.getPointAtLength(path.getTotalLength()/2).matrixTransform(path.getScreenCTM()):{x:r.x+r.width/2,y:r.y+r.height/2};
   viewport.scrollLeft+=point.x-v.x-v.width/2;
   viewport.scrollTop+=point.y-v.y-Math.max(70,Math.min(v.height,sheet.top-v.top)/2);
  }
 }
 function terminalCandidates(event){
  return [...mount.querySelectorAll('.terminal[data-terminal]')].map(node=>{const r=node.getBoundingClientRect();return {node,distance:Math.hypot(event.clientX-r.x-r.width/2,event.clientY-r.y-r.height/2)};}).filter(item=>item.distance<=22).sort((a,b)=>a.distance-b.distance);
 }
 function selectTouch(event){
  const candidates=terminalCandidates(event);
  if(candidates.length>1&&candidates[1].distance-candidates[0].distance<8){
   const choices=$('#forge-touch-choices');choices.replaceChildren();
   for(const {node} of candidates.slice(0,5)){const button=document.createElement('button');button.type='button';button.textContent=node.getAttribute('aria-label').replace(/^Inspect /,'');button.addEventListener('click',()=>{choices.replaceChildren();onChoose('terminal',node.dataset.terminal);});choices.append(button);}
   $('#forge-touch-choice-label').hidden=false;open('inspector',true);return true;
  }
  if(candidates.length){$('#forge-touch-choices').replaceChildren();$('#forge-touch-choice-label').hidden=true;onChoose('terminal',candidates[0].node.dataset.terminal);return true;}
  const target=event.target.closest('[data-wire],[data-component]');
  if(target){onChoose(target.dataset.wire?'wire':'component',target.dataset.wire||target.dataset.component);return true;}
  const part=[...mount.querySelectorAll('[data-component]')].map(node=>{const r=node.getBoundingClientRect();return {node,distance:Math.hypot(event.clientX-r.x-r.width/2,event.clientY-r.y-r.height/2)};}).filter(item=>item.distance<=22).sort((a,b)=>a.distance-b.distance)[0];
  if(part){onChoose('component',part.node.dataset.component);return true;}
  return false;
 }
 viewport.addEventListener('pointerdown',event=>{
  if(!mobile||event.button>0)return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});viewport.setPointerCapture(event.pointerId);
  if(pointers.size===1)gesture={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false,target:event.target};
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};gesture.moved=true;}
 });
 viewport.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()],rect=viewport.getBoundingClientRect();applyZoom(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,{x:(a.x+b.x)/2-rect.x,y:(a.y+b.y)/2-rect.y});}
  else if(pointers.size===1&&gesture){const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(Math.hypot(dx,dy)>7)gesture.moved=true;if(gesture.moved){viewport.scrollLeft=gesture.left-dx;viewport.scrollTop=gesture.top-dy;}}
 });
 function release(event){
  if(!pointers.has(event.pointerId))return;
  const tap=event.type==='pointerup'&&pointers.size===1&&gesture&&!gesture.moved;
  if(tap&&event.pointerType!=='mouse')selectTouch({...event,clientX:event.clientX,clientY:event.clientY,target:gesture.target});
  suppressClick=!!gesture?.moved||tap&&event.pointerType!=='mouse';
  pointers.delete(event.pointerId);pinch=null;
  if(pointers.size){const point=[...pointers.values()][0];gesture={x:point.x,y:point.y,left:viewport.scrollLeft,top:viewport.scrollTop,moved:true};}else gesture=null;
 }
 viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);
 viewport.addEventListener('click',event=>{if(mobile&&suppressClick){suppressClick=false;event.preventDefault();event.stopPropagation();}},true);
 function layout(){
  const next=media.matches;if(next===mobile)return;mobile=next;
  for(const name of Object.keys(panels)){close(name,false);if(mobile)dialogBody(name).append(panels[name]);else homes[name].after(panels[name]);}
  document.body.classList.toggle('forge-mobile',mobile);explore.open=!mobile;key.open=!mobile;
  if(mobile){diagramChanged();fit();}else{mount.style.width='';for(const svg of mount.querySelectorAll('svg')){svg.style.width='';svg.style.height='';if(svg.dataset.desktopViewBox){svg.setAttribute('viewBox',svg.dataset.desktopViewBox);delete svg.dataset.desktopViewBox;}}for(const wire of mount.querySelectorAll('[data-desktop-label]')){wire.setAttribute('aria-label',wire.dataset.desktopLabel);delete wire.dataset.desktopLabel;}$('#forge-touch-choices').replaceChildren();}
  onLayoutChange();
 }
 media.addEventListener('change',layout);
 if(window.ResizeObserver)new window.ResizeObserver(()=>{if(!mobile||frame)return;frame=requestAnimationFrame(()=>{frame=0;if(mount.querySelector('svg')?.dataset.desktopViewBox)applyZoom();else diagramChanged();});}).observe(viewport);
 layout();
 return {get isMobile(){return mobile;},diagramChanged,selectionChanged,selectionLabel(info){const title=info?.heading||'Inspect & explain';$('#forge-mobile-selection').textContent=title;$('#forge-inspector-sheet-title').textContent=title;},modeChanged(mode){close('inspector',false);if(mobile&&mode==='physical')requestAnimationFrame(diagramChanged);}};
}
