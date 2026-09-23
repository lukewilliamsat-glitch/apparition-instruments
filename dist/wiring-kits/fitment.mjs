export const fitmentChecks=[
 {title:'Confirm the circuit',detail:'Check the pickup requirements and control layout. The Les Paul kit is a passive circuit with two volume controls and two tone controls.'},
 {title:'Check mounting depth',detail:'Measure the threaded bushing length needed through the guitar top or mounting plate, including washers and nuts. Choose short or long shaft from that measurement.'},
 {title:'Check holes and knobs',detail:'Confirm mounting-hole diameter and whether the knobs match the pot shaft diameter, spline pattern or solid-shaft fixing.'},
 {title:'Check spacing and clearance',detail:'Measure control-centre spacing and cavity depth. Allow space for capacitors, wiring, the cavity cover and any new jack or toggle.'},
 {title:'Record the existing layout',detail:'Keep clear photos of the wiring and note the guitar model, pickup model and measurements before choosing replacement parts.'}
];
export function populateFitment(root,{interactive=false}={}){
 for(const check of fitmentChecks){const item=document.createElement(interactive?'label':'li');if(interactive){const input=document.createElement('input');input.type='checkbox';item.append(input);}const text=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('span');title.textContent=check.title;detail.textContent=check.detail;text.append(title,detail);item.append(text);root.append(item);}
}
