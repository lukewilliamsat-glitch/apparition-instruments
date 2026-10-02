// Workbench geometry only. Electrical elements, terminal contracts and contacts
// stay in the source graph; callers receive a detached presentation projection.
export function composeWorkbench(circuit){
 const components=circuit.components.map(p=>({...p}));
 for(const device of components.filter(p=>p.type==='dpdt'&&p.mechanicalHost)){
  const host=components.find(p=>p.id===device.mechanicalHost);if(!host)continue;
  device.x=host.x;device.y=host.y-110;device.assemblyLabel=host.label;
 }
 return {...circuit,components};
}

// One title anchor contract for drawing and protected routing regions.
export function componentTitlePosition(part){
 const x=['humbucker','singlecoil'].includes(part.type)?77:['blade','blade3','blade5','superswitch'].includes(part.type)?95:0;
 const y=part.physicalControl==='push-pull'?-155:part.type==='pot'?-12:['blade','blade3','blade5'].includes(part.type)?-58:-20;
 return {x,y};
}
