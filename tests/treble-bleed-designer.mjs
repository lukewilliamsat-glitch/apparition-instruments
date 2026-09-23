import assert from 'node:assert/strict';
import {defaults,fields,validateState,topologyOf} from '../dist/treble-bleed-designer/circuits.mjs';
import {audioTaper,responseAt,frequencyResponse,bleedAdmittance} from '../dist/treble-bleed-designer/engine.mjs';
import {graphGeometry} from '../dist/treble-bleed-designer/graph.mjs';
const near=(a,b,tol=1e-10)=>assert(Math.abs(a-b)<tol,`${a} != ${b}`);
near(audioTaper(0),0);near(audioTaper(5),.1);near(audioTaper(10),1);
for(let i=0;i<100;i++)assert(audioTaper((i+1)/10)>audioTaper(i/10));
// Independent analytic resistor-divider limit, no reactive components or tone branch.
for(const volume of [0,2,5,7,9,10]){
 const s={...defaults,volume,pickupL:0,pickupC:0,toneCap:0,cableC:0};
 const x=audioTaper(volume),lower=s.volumePot*1000*x,upper=s.volumePot*1000*(1-x),load=s.loadR*1e6;
 const z=lower===0?0:1/(1/lower+1/load),expected=z/(s.pickupR*1000+upper+z);
 for(const f of [20,1000,20000]){const actual=responseAt(s,f);near(actual[0],expected);near(actual[1],0);}
}
const f=1000,c=1e-9,r=150000,w=2*Math.PI*f;
assert.deepEqual(bleedAdmittance('none',f,c,r),[0,0]);near(bleedAdmittance('capacitor',f,c,r)[1],w*c);
near(bleedAdmittance('parallel',f,c,r)[0],1/r);near(bleedAdmittance('parallel',f,c,r)[1],w*c);
const zc=1/(w*c),series=bleedAdmittance('series',f,c,r);near(series[0],r/(r*r+zc*zc));near(series[1],zc/(r*r+zc*zc));
// Independent complex nodal solution via a 2x2 KCL determinant (different formulation from engine's impedance reduction).
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],div=(a,b)=>{const d=b[0]**2+b[1]**2;return [(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d];};
for(const type of ['none','capacitor','duncan','kinman','custom'])for(const volume of [.1,3,7,9.9])for(const frequency of [20,150,1000,3500,20000]){
 const s={...defaults,type,volume,topology:'series'},omega=2*Math.PI*frequency,x=audioTaper(volume),ys=div([1,0],[s.pickupR*1000,omega*s.pickupL]),yt=div([1,0],[s.tonePot*1000,-1/(omega*s.toneCap*1e-9)]);
 const yb=bleedAdmittance(topologyOf(s),frequency,s.bleedC*1e-9,s.bleedR*1000),yab=add([1/(s.volumePot*1000*(1-x)),0],yb);
 const aa=add(add(ys,yt),add([0,omega*s.pickupC*1e-12],yab)),bb=add(yab,[1/(s.volumePot*1000*x)+1/(s.loadR*1e6),omega*s.cableC*1e-12]);
 const expected=div(mul(ys,yab),sub(mul(aa,bb),mul(yab,yab))),actual=responseAt(s,frequency);near(actual[0],expected[0]);near(actual[1],expected[1]);
}
for(const type of ['none','capacitor','duncan','kinman','custom'])for(const topology of ['capacitor','parallel','series']){
 const initial={...defaults,type,topology},reference=frequencyResponse(initial).map(p=>p.reference);
 for(const volume of [0,.1,5,9.9,10]){const data=frequencyResponse({...initial,volume});assert.deepEqual(data.map(p=>p.reference),reference);assert(data.every(p=>Number.isFinite(p.current)&&Number.isFinite(p.reference)));if(volume===10)assert(data.every(p=>p.current===p.reference));if(volume===0)assert(data.every(p=>p.current===-100));
  for(const width of [280,360,768,1000]){const geometry=graphGeometry(data,width);assert(!/NaN|Infinity/.test(geometry.path('current')));near(geometry.x(200)-geometry.x(20),geometry.x(2000)-geometry.x(200));}
 }
}
const base=frequencyResponse({...defaults,type:'duncan'}).map(p=>p.current);
for(const key of Object.keys(fields).filter(k=>k!=='volume')){const data=frequencyResponse({...defaults,type:'duncan',[key]:defaults[key]*1.2}).map(p=>p.current);assert(data.some((v,i)=>Math.abs(v-base[i])>1e-7),key+' must affect response');}
for(const [key,field] of Object.entries(fields)){assert.throws(()=>validateState({...defaults,type:'duncan',[key]:NaN}));assert.throws(()=>validateState({...defaults,type:'duncan',[key]:field.max+1}));for(const value of [field.min,field.max])assert(frequencyResponse({...defaults,type:'duncan',[key]:value}).every(p=>Number.isFinite(p.current)));}
assert.deepEqual(frequencyResponse({...defaults,type:'none',bleedC:2,bleedR:100}),frequencyResponse({...defaults,type:'none'}));
assert.deepEqual(frequencyResponse({...defaults,type:'duncan'}),frequencyResponse({...defaults,type:'custom',topology:'parallel'}));
assert.deepEqual(frequencyResponse({...defaults,type:'kinman'}),frequencyResponse({...defaults,type:'custom',topology:'series'}));
console.log('Designer: analytic divider, independent KCL solution, RC topologies, audio taper, stable Volume 10 reference, every input, volume endpoints, supported bounds and responsive graph geometry passed.');
