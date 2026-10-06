// Original Conjure policy: viewport-biased, nearest available band, no peer packing.
export function insertionArea(layout,type,{row=0}={}){
 const defaults={text:[12,4],image:[8,8],button:[6,2],line:[4,1],shape:[6,4]},[cols,rows]=defaults[type]||[6,4];
 row=Math.max(0,Math.round(row));const peers=Object.values(layout.placements).map(p=>p.value).filter(p=>p.visible);
 for(let attempts=0;attempts<peers.length+1;attempts++){const collisions=peers.filter(p=>p.col<Math.min(cols,layout.grid.columns)&&p.row<row+rows&&row<p.row+p.rows);if(!collisions.length)break;row=Math.max(...collisions.map(p=>p.row+p.rows));}
 return {col:0,row,cols:Math.min(cols,layout.grid.columns),rows,z:Math.max(0,...peers.map(p=>p.z))+1,visible:true,locked:false};
}
