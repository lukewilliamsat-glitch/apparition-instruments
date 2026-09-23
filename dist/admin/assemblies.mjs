// Development-local assembly records reference component IDs. No component stock is copied or written.
export const assemblyStorageKey='apparition.admin.assemblies.v1';
export function createAssemblyStore(storage){
 function list(){let raw;try{raw=storage.getItem(assemblyStorageKey);}catch{throw new Error('Browser storage is unavailable.');}if(raw===null)return [];try{const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.items))throw new Error();const ids=new Set(),skus=new Set();for(const a of data.items){if(!a.id||ids.has(a.id)||!a.sku||skus.has(a.sku.toLowerCase())||!a.name||!Array.isArray(a.bom))throw new Error();ids.add(a.id);skus.add(a.sku.toLowerCase());}return data.items;}catch{throw new Error('Saved assemblies could not be read. No data was reset.');}}
 function write(items){try{storage.setItem(assemblyStorageKey,JSON.stringify({version:1,items}));}catch{throw new Error('Assemblies could not be saved. Browser storage may be full or disabled.');}}
 function save(input,id=null){const items=list(),index=items.findIndex(a=>a.id===id);if(id&&index<0)throw new Error('Assembly no longer exists.');const name=String(input.name??'').trim(),sku=String(input.sku??'').trim(),category=String(input.category??'').trim();if(!name||!sku||!category)throw new Error('Enter an assembly name, SKU and category.');if(name.length>300||sku.length>80||category.length>100)throw new Error('Assembly name, SKU or category is too long.');if(items.some(a=>a.id!==id&&a.sku.toLowerCase()===sku.toLowerCase()))throw new Error('That assembly SKU already exists.');if(!Array.isArray(input.bom))throw new Error('Invalid bill of materials.');const bom=input.bom.map(row=>{const quantity=Number(row.quantity);if(!row.componentId||typeof row.quantity==='boolean'||!Number.isSafeInteger(quantity)||quantity<=0)throw new Error('Each BOM row needs a component and a positive whole-number quantity.');return {componentId:String(row.componentId),quantity};});const record={id:id||crypto.randomUUID(),name,sku,category,active:!!input.active,bom};if(index<0)items.push(record);else items[index]=record;write(items);return record;}
 function remove(id){const items=list();if(!items.some(a=>a.id===id))throw new Error('Assembly no longer exists.');write(items.filter(a=>a.id!==id));}
 return {list,save,remove};
}

// Calculated on demand from central inventory. Duplicate component rows are combined.
export function aggregateRequirements(bom,{fractional=false}={}){
 const warnings=[],required=new Map();
 if(!Array.isArray(bom))return {required,warnings:['Invalid bill of materials.']};

 for(const [index,row] of bom.entries()){
  const quantity=Number(row?.quantity);
  if(!row?.componentId||typeof row.quantity==='boolean'||!(fractional?Number.isFinite(quantity)&&quantity<=Number.MAX_SAFE_INTEGER:Number.isSafeInteger(quantity))||quantity<=0){warnings.push('BOM row '+(index+1)+(fractional?' needs a component and a positive quantity.':' needs a component and a positive whole-number quantity.'));continue;}
  const total=(required.get(row.componentId)||0)+quantity;if(!(fractional?Number.isFinite(total)&&total<=Number.MAX_SAFE_INTEGER:Number.isSafeInteger(total))){warnings.push('Total quantity is too large for component '+row.componentId+'.');continue;}required.set(row.componentId,total);
 }
 return {required,warnings};
}

export function calculateBuildable(bom,inventory){
 const {required,warnings}=aggregateRequirements(bom);
 const capacities=[];
 for(const [id,requiredQuantity] of required){
  const component=inventory.find(p=>p.id===id);
  if(!component){warnings.push('Missing component: '+id+'.');continue;}
  if(!component.active){warnings.push('Inactive component: '+component.name+'.');continue;}
  if(!Number.isSafeInteger(component.stock)||component.stock<0){warnings.push('Invalid stock for '+component.name+'.');continue;}
  capacities.push({id,name:component.name,requiredQuantity,stock:component.stock,capacity:Math.floor(component.stock/requiredQuantity)});
 }
 if(warnings.length||!capacities.length)return {quantity:null,limiting:[],warnings};
 const quantity=Math.min(...capacities.map(p=>p.capacity));return {quantity,limiting:capacities.filter(p=>p.capacity===quantity),warnings:[]};
}
