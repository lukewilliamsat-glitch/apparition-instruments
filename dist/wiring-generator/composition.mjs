// Workbench geometry only. Electrical elements, terminal contracts and contacts
// stay in the source graph; callers receive a detached presentation projection.
export function composeWorkbench(circuit){
 const components=circuit.components.map(p=>({...p}));
 for(const device of components.filter(p=>p.type==='dpdt'&&p.mechanicalHost)){
  const host=components.find(p=>p.id===device.mechanicalHost);if(!host)continue;
  device.x=host.x;device.y=host.y+260;device.assemblyLabel=host.label;
 }
 return {...circuit,components};
}
