import {canonical,validateDocument,intersects} from './kernel.mjs';
// Original operation-specific layout policies. Measurements are host-owned, never persisted.
const copy=structuredClone;
export const occupiedRows=layout=>Math.max(0,...Object.values(layout.placements).filter(e=>e.value.visible).map(e=>e.value.row+e.value.rows));
export function sectionExtent(layout,{visualMinimum=0}={}){const occupied=occupiedRows(layout),stored=layout.rows,gridHeight=stored*layout.grid.rowHeight+(stored-1)*layout.grid.gapY;return {occupied,stored,visualMinimum,gridHeight,renderedHeight:Math.max(gridHeight,visualMinimum)};}
export function resizeSection(doc,registry,{sectionId,breakpoint,rows}){if(!Number.isInteger(rows)||rows<1||rows>100000)throw Error('Invalid section extent.');const next=copy(doc),l=next.sections.find(s=>s.id===sectionId)?.layouts[breakpoint];if(!l)throw Error('Missing breakpoint.');l.rows=Math.max(rows,l.grid.minRows,occupiedRows(l));return validateDocument(next,registry);}
export function lineAt(lines,index,pitch){if(!lines?.length)return index*pitch;if(index<lines.length)return lines[index];return lines.at(-1)+(index-lines.length+1)*pitch;}
export function intrinsicRows(height,grid,{row=0,rowLines}={}){if(!Number.isFinite(height)||height<0||height>1000000)throw Error('Invalid intrinsic measurement.');const pitch=grid.rowHeight+grid.gapY,start=lineAt(rowLines,row,pitch);let rows=1;while(lineAt(rowLines,row+rows,pitch)-start-grid.gapY+0.01<height){if(++rows>100000-row)throw Error('Intrinsic measurement exceeds grid.');}return rows;}
export function reconcileText(doc,baseline,registry,{measure,blockId,operation='content',breakpoint,edges=''}){
 const next=copy(doc);
 for(const s of next.sections){const original=baseline.sections.find(x=>x.id===s.id);if(!original||!s.blocks[blockId]||s.blocks[blockId].type!=='text')continue;
  for(const [bp,l] of Object.entries(s.layouts)){if(operation==='direct'&&bp!==breakpoint)continue;const previous=original.layouts[bp];if(!previous)continue;const entry=l.placements[blockId],old=previous.placements[blockId].value,p=entry.value;if(p.locked)continue;
   const measurement=measure(next,bp,blockId),required=intrinsicRows(measurement.height,l.grid,{row:p.row,rowLines:measurement.rowLines});
   // Existing manual geometry is a conservative retained-height floor. Generated text can shrink.
   const rows=Math.max(required,operation==='direct'?p.rows:entry.source==='manual'?old.rows:registry.get(s.blocks[blockId]).minRows);
   if(operation==='direct'&&edges.includes('n')&&rows>p.rows){const bottom=p.row+p.rows;if(rows>bottom)throw Error('Text cannot fit while preserving the opposite edge. Widen it or resize from below.');p.row=bottom-rows;}
   p.rows=rows;
   if(operation==='content'){
    const delta=p.row+p.rows-(old.row+old.rows),map=previous.placements;
    // Only same-column, non-overlapping, movable followers. Deliberate overlap is never a dependency.
    for(const id of s.order){if(id===blockId)continue;const before=map[id].value,target=l.placements[id].value;if(before.row<old.row+old.rows||before.col!==old.col||before.cols!==old.cols||before.locked||!registry.can(s.blocks[id],'move'))continue;
     if(s.order.some(other=>other!==id&&intersects(before,map[other].value)))continue;
     target.row=before.row+delta;
    }
   }
   const minimum=Math.max(l.grid.minRows,occupiedRows(l)+l.grid.trailingRows),wasCompact=previous.rows===Math.max(previous.grid.minRows,occupiedRows(previous)+previous.grid.trailingRows);
   l.rows=operation==='content'&&wasCompact?minimum:Math.max(previous.rows,minimum);
  }
 }
 return validateDocument(next,registry);
}
export function settleLayout(candidate,baseline,registry,options,{limit=4}={}){
 let next=copy(candidate);for(let pass=0;pass<limit;pass++){const settled=reconcileText(next,baseline,registry,options);if(canonical(settled)===canonical(next))return settled;next=settled;}
 throw Error('Text layout did not settle. The previous valid draft has been preserved.');
}
export function deriveBreakpoint(doc,registry,{breakpoint='mobile',columns=8}){
 const next=copy(doc);for(const s of next.sections){const source=s.layouts.desktop;if(!source)continue;const existing=s.layouts[breakpoint],grid=existing?.grid??{...source.grid,columns};if(grid.columns<Math.max(...s.order.map(id=>registry.get(s.blocks[id])?.minCols??1)))throw Error('Breakpoint is too narrow for this block.');
  const placements={},ratio=grid.columns/source.grid.columns;
  for(const id of s.order){const old=existing?.placements[id],base=source.placements[id].value;if(old?.source==='manual'||base.locked&&old){placements[id]=copy(old);continue;}const min=registry.get(s.blocks[id])?.minCols??1,cols=Math.max(min,Math.min(grid.columns,Math.round(base.cols*ratio))),col=Math.max(0,Math.min(grid.columns-cols,Math.round(base.col*ratio)));placements[id]={source:'generated',value:{...base,col,cols}};}
  const layout={grid,placements,rows:Math.max(existing?.rows??grid.minRows,grid.minRows)};layout.rows=Math.max(layout.rows,occupiedRows(layout)+grid.trailingRows);s.layouts[breakpoint]=layout;
 }
 return validateDocument(next,registry);
}
