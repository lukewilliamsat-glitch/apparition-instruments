// Shared presentation geometry. It reads the SVG bounds, never circuit coordinates.
export function fitDiagram({width,height,boxWidth,boxHeight,padding=12}){
 if(![width,height,boxWidth,boxHeight].every(v=>Number.isFinite(v)&&v>0))return null;
 const scale=Math.min(Math.max(1,width-padding*2)/boxWidth,Math.max(1,height-padding*2)/boxHeight);
 return {width:boxWidth*scale,height:boxHeight*scale,scale};
}
export function svgBounds(svg){const values=(svg?.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);return values.length===4&&values.every(Number.isFinite)&&values[2]>0&&values[3]>0?{boxWidth:values[2],boxHeight:values[3]}:null;}
export function sizeDiagram({mount,viewport,zoom=1,previousWidth,anchor}){
 const svg=mount.querySelector('svg'),bounds=svgBounds(svg);if(!bounds)return null;
 const fit=fitDiagram({width:viewport.clientWidth,height:viewport.clientHeight,...bounds});if(!fit)return null;
 const point=anchor||{x:viewport.clientWidth/2,y:viewport.clientHeight/2},oldWidth=previousWidth||fit.width;
 const x=(viewport.scrollLeft+point.x)/oldWidth,y=(viewport.scrollTop+point.y)/oldWidth;
 const width=fit.width*zoom;mount.style.width=width+'px';svg.style.width='100%';svg.style.height='auto';
 viewport.classList.toggle('is-fit',zoom===1);viewport.scrollLeft=Math.max(0,x*width-point.x);viewport.scrollTop=Math.max(0,y*width-point.y);
 return {...fit,width,height:fit.height*zoom};
}
// Generator navigation does not redraw SVG or disturb the selected electrical state.
export function setupDiagramNavigation({mount,viewport,out,inButton,outButton,fitButton,maxZoom=4}){
 let zoom=1,width=0,frame=0;
 const apply=()=>{const result=sizeDiagram({mount,viewport,zoom,previousWidth:width});if(result)width=result.width;out.textContent=Math.round(zoom*100)+'%';outButton.disabled=zoom<=1;inButton.disabled=zoom>=maxZoom;};
 const fit=()=>{zoom=1;apply();viewport.scrollLeft=0;viewport.scrollTop=0;};
 inButton.addEventListener('click',()=>{zoom=Math.min(maxZoom,zoom+.25);apply();});outButton.addEventListener('click',()=>{zoom=Math.max(1,zoom-.25);apply();});fitButton.addEventListener('click',fit);
 viewport.addEventListener('keydown',event=>{if(!['+','=','-','0'].includes(event.key))return;event.preventDefault();if(event.key==='0')fit();else{zoom=Math.max(1,Math.min(maxZoom,zoom+(event.key==='-'?-.25:.25)));apply();}});
 if(window.ResizeObserver)new window.ResizeObserver(()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;apply();});}).observe(viewport);
 else window.addEventListener('resize',apply);
 return {apply,fit,get zoom(){return zoom;}};
}
