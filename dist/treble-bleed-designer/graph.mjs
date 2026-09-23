import {dbFloor} from './engine.mjs';
const ns='http://www.w3.org/2000/svg';
export const graphLimits={min:dbFloor,max:40};
export function graphGeometry(points,width){const left=55,right=18,top=24,height=width<500?335:430,bottom=54,w=width-left-right,h=height-top-bottom;const x=f=>left+Math.log10(f/20)/3*w,y=db=>top+(graphLimits.max-Math.min(graphLimits.max,Math.max(graphLimits.min,db)))/(graphLimits.max-graphLimits.min)*h;return {left,right,top,height,bottom,w,h,x,y,path:key=>points.map((p,i)=>(i?'L':'M')+x(p.frequency).toFixed(2)+','+y(p[key]).toFixed(2)).join(' ')};}
export function renderGraph(root,points,volume){
 const width=Math.max(280,Math.round(root.getBoundingClientRect().width)),g=graphGeometry(points,width),svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${g.height}`);svg.setAttribute('role','img');svg.setAttribute('aria-labelledby','response-title response-desc');
 const add=(tag,attrs={},text)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;svg.append(n);return n;};
 add('title',{id:'response-title'},'Frequency response at volume '+volume.toFixed(1)+' and volume 10');add('desc',{id:'response-desc'},'Logarithmic frequency from 20 Hz to 20 kHz. Solid gold is current volume; dashed grey is volume 10. Output is in decibels relative to the ideal pickup source, with display limits of −100 and +40 dB. Numeric samples follow the graph.');
 for(let db=40;db>=-100;db-=20){add('line',{x1:g.left,x2:width-g.right,y1:g.y(db),y2:g.y(db),class:db===0?'zero-line':'grid-line'});add('text',{x:g.left-9,y:g.y(db)+5,'text-anchor':'end',class:'tick'},String(db));}
 const ticks=width<500?[20,100,1000,20000]:[20,50,100,200,500,1000,2000,5000,10000,20000];
 for(const f of ticks){add('line',{x1:g.x(f),x2:g.x(f),y1:g.top,y2:g.top+g.h,class:'grid-line'});add('text',{x:g.x(f),y:g.top+g.h+23,'text-anchor':f===20?'start':f===20000?'end':'middle',class:'tick'},f>=1000?f/1000+'k':String(f));}
 add('text',{x:g.left,y:14,class:'axis-label'},'RELATIVE OUTPUT (dB)');add('text',{x:g.left+g.w/2,y:g.height-6,'text-anchor':'middle',class:'axis-label'},'FREQUENCY (Hz)');
 add('path',{d:g.path('reference'),class:'reference-curve',fill:'none'});add('path',{d:g.path('current'),class:'current-curve',fill:'none'});root.replaceChildren(svg);
}
