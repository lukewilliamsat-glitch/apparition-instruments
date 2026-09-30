// Presentation only. Values and frequency samples come from shared response core.
const ns='http://www.w3.org/2000/svg';
const node=(tag,attributes={},value)=>{const n=document.createElementNS(ns,tag);for(const [key,v] of Object.entries(attributes))n.setAttribute(key,v);if(value!==undefined)n.textContent=value;return n;};
export function responseGraph(report,{compact=false}={}){
 const width=compact?360:760,height=compact?270:300,left=compact?38:52,right=18,top=24,bottom=42,plotWidth=width-left-right,plotHeight=height-top-bottom;
 const x=f=>left+Math.log10(f/20)/3*plotWidth,y=db=>top+(20-Math.max(-100,Math.min(20,db)))/120*plotHeight;
 const path=points=>points.map((p,i)=>(i?'L':'M')+x(p.frequency).toFixed(2)+' '+y(p.current).toFixed(2)).join(' ');
 const svg=node('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-labelledby':'forge-response-title forge-response-desc'});
 svg.append(node('title',{id:'forge-response-title'},`${report.channel} pickup electrical response`),node('desc',{id:'forge-response-desc'},`Frequency from 20 Hz to 20 kHz. Solid dark line shows the current circuit.${report.reference?' Dashed bronze line shows the same circuit without a treble bleed.':''} Output is decibels relative to an ideal source; values below −100 dB are displayed at the floor.`));
 for(const db of [20,0,-20,-40,-60,-80,-100]){svg.append(node('line',{x1:left,x2:width-right,y1:y(db),y2:y(db),class:db===0?'response-zero':'response-grid'}),node('text',{x:left-8,y:y(db)+4,'text-anchor':'end',class:'response-tick'},String(db)));}
 for(const f of [20,100,1000,5000,20000]){svg.append(node('line',{x1:x(f),x2:x(f),y1:top,y2:height-bottom,class:'response-grid'}),node('text',{x:x(f),y:height-bottom+20,'text-anchor':f===20?'start':f===20000?'end':'middle',class:'response-tick'},f>=1000?f/1000+'k':String(f)));}
 svg.append(node('text',{x:left,y:14,class:'response-axis'},'RELATIVE OUTPUT (dB)'),node('text',{x:left+plotWidth/2,y:height-4,'text-anchor':'middle',class:'response-axis'},'FREQUENCY (Hz)'));
 if(report.reference)svg.append(node('path',{d:path(report.reference),class:'response-reference',fill:'none'}));
 svg.append(node('path',{d:path(report.points),class:'response-current',fill:'none'}));
 return svg;
}
