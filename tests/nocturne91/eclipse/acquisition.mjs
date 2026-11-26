import {assemblyMaterialCost} from './economics.mjs?build=sentinel77a-c1';

export function savedAssemblyRequirements(draft, order) {
  if (draft.currency !== 'GBP') return [];
  return draft.lines.flatMap((line,index)=>{
    const item=order.items[index];
    const parts=item?.snapshot?.stockRequirements;
    const savedId=item?.productId||item?.snapshot?.assemblyId||item?.snapshot?.componentId||'';
    if (line.costState !== 'unknown' || !['assembly','kit'].includes(item?.type) ||
      line.id !== 'line-'+index || line.productId !== savedId || line.quantity !== item.quantity ||
      !Array.isArray(parts) || !parts.length || parts.length > 100 ||
      parts.some(part=>!(/^[A-Za-z0-9_-]{1,100}$/.test(part?.componentId||'')) ||
        !Number.isSafeInteger(part.quantity) || part.quantity < 1 || part.quantity > 10000)) return [];
    return [{index,parts}];
  });
}

export async function estimateSavedAssemblies(draft, order, readCosts) {
  const saved=savedAssemblyRequirements(draft,order);
  const ids=[...new Set(saved.flatMap(({parts})=>parts.map(part=>part.componentId)))];
  if (!ids.length || ids.length > 100) return {document:draft,count:0};
  const {costs}=await readCosts(ids);
  const document=structuredClone(draft);
  let count=0;
  for (const {index,parts} of saved) {
    const estimate=assemblyMaterialCost(parts,costs);
    if (!Number.isSafeInteger(estimate.unitCostMicro)) continue;
    Object.assign(document.lines[index],{
      unitCostMicro:estimate.unitCostMicro,
      costState:'estimated',
      costProvenance:{basis:'assembly_estimate'},
      costSource:'Saved order BOM priced with current IRONCLAD component references. Historical batch costs and labour excluded.'
    });
    count++;
  }
  return {document,count};
}
