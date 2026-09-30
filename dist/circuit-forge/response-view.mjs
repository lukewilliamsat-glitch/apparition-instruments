// Presentation only: shared analysis owns frequency mapping, interpolation and delta.
import {fractionFromFrequency,frequencyFromFraction,inspectResponse} from '../electronics/response/analysis.mjs';
const ns='http://www.w3.org/2000/svg';
const node=(tag,attributes={},value)=>{const n=document.createElementNS(ns,tag);for(const [key,v] of Object.entries(attributes))n.setAttribute(key,v);if(value!==undefined)n.textContent=value;return n;};
export function createResponseGraph(initial,{compact=false,onInspect=()=>{}}={}){
 const width=compact?360:760,height=compact?270:300,left=compact?38:52,right=18,top=24,bottom=42,plotWidth=width-left-right,plotHeight=height-top-bottom;
 const x=f=>left+fractionFromFrequency(f)*plotWidth,y=db=>top+(20-Math.max(-100,Math.min(20,db)))/120*plotHeight;
 const path=points=>points.map((p,i)=>(i?'L':'M')+x(p.frequency).toFixed(2)+' '+y(p.current).toFixed(2)).join(' ');
 const svg=node('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-labelledby':'forge-response-title forge-response-desc'});
 const title=node('title',{id:'forge-response-title'}),description=node('desc',{id:'forge-response-desc'});svg.append(title,description);
 for(const db of [20,0,-20,-40,-60,-80,-100])svg.append(node('line',{x1:left,x2:width-right,y1:y(db),y2:y(db),class:db===0?'response-zero':'response-grid'}),node('text',{x:left-8,y:y(db)+4,'text-anchor':'end',class:'response-tick'},String(db)));
 for(const f of [20,100,1000,5000,20000])svg.append(node('line',{x1:x(f),x2:x(f),y1:top,y2:height-bottom,class:'response-grid'}),node('text',{x:x(f),y:height-bottom+20,'text-anchor':f===20?'start':f===20000?'end':'middle',class:'response-tick'},f>=1000?f/1000+'k':String(f)));
 svg.append(node('text',{x:left,y:14,class:'response-axis'},'RELATIVE OUTPUT (dB)'),node('text',{x:left+plotWidth/2,y:height-4,'text-anchor':'middle',class:'response-axis'},'FREQUENCY (Hz)'));
 const ref=node('path',{class:'response-reference',fill:'none'}),current=node('path',{class:'response-current',fill:'none'}),difference=node('path',{class:'response-difference',fill:'none'});
 const crosshair=node('g',{class:'response-inspection','aria-hidden':'true'}),vertical=node('line',{y1:top,y2:height-bottom}),liveDot=node('circle',{r:4,class:'response-inspection-current'}),refDot=node('rect',{width:7,height:7,class:'response-inspection-reference'});
 crosshair.append(vertical,liveDot,refDot);svg.append(ref,current,difference,crosshair);
 let report=initial,frequency=1000,inspecting=false,pointer=null;
 const inspect=(f,show=true)=>{frequency=f;inspecting=show;const sample=inspectResponse(report,f),px=x(sample.frequency);crosshair.style.display=show?'':'none';vertical.setAttribute('x1',px);vertical.setAttribute('x2',px);liveDot.setAttribute('cx',px);liveDot.setAttribute('cy',y(sample.current));refDot.style.display=sample.reference===null?'none':'';refDot.setAttribute('x',px-3.5);refDot.setAttribute('y',y(sample.reference??0)-3.5);onInspect(sample);return sample;};
 const update=next=>{report=next;title.textContent=`${report.channel} pickup electrical response`;description.textContent=`Frequency from 20 Hz to 20 kHz. Solid line: ${report.legend?.current||'current circuit'}.${report.reference?' Dashed line: '+(report.legend?.reference||'reference')+'.':''} Use the Inspect frequency slider for keyboard inspection, or point, tap or drag horizontally on the graph. Values below −100 dB are displayed at the floor.`;
  current.setAttribute('d',path(report.points));ref.style.display=report.reference?'':'none';ref.setAttribute('d',report.reference?path(report.reference):'');
  const delta=report.difference,show=delta&&!delta.clipped&&Math.abs(delta.delta)>=.1;difference.style.display=show?'':'none';if(show){const px=x(delta.frequency),py=y(delta.current);difference.setAttribute('d',`M ${px} ${py-5} l 5 5 l -5 5 l -5 -5 Z`);}
  inspect(frequency,inspecting);
 };
 const fromPointer=event=>{const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height)return;
  // SVG uses xMidYMid meet. Account for letterboxing in short landscape layouts.
  const scale=Math.min(rect.width/width,rect.height/height),offset=(rect.width-width*scale)/2;
  inspect(frequencyFromFraction(((event.clientX-rect.left-offset)/scale-left)/plotWidth));
 };
 svg.addEventListener('pointerdown',event=>{if(event.button>0)return;pointer=event.pointerId;svg.setPointerCapture?.(pointer);fromPointer(event);});
 svg.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'||pointer===event.pointerId)fromPointer(event);});
 const release=event=>{if(pointer===event.pointerId)pointer=null;};svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);
 update(initial);
 return {svg,compact,update,inspect,clear(){inspecting=false;crosshair.style.display='none';}};
}
// Compatibility for callers needing a standalone graph node.
export function responseGraph(report,options){return createResponseGraph(report,options).svg;}
