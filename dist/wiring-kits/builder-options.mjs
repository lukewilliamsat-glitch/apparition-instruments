const clean=(value,max=120)=>String(value??'').trim().slice(0,max);
export function normaliseBuilderGroups(value){
 if(!Array.isArray(value))throw new Error('Builder option groups must be a list.');
 const groupKeys=new Set();return value.map((group,index)=>{
  const key=clean(group?.key),label=clean(group?.label,200);if(!key||groupKeys.has(key)||!label||!Array.isArray(group.values))throw new Error('Each Builder option group needs a unique key, label and values.');groupKeys.add(key);
  const valueKeys=new Set(),values=group.values.map((option,valueIndex)=>{const optionKey=clean(option?.key),optionLabel=clean(option?.label,200);if(!optionKey||valueKeys.has(optionKey)||!optionLabel)throw new Error('Each Builder option value needs a unique key and label.');valueKeys.add(optionKey);return {key:optionKey,label:optionLabel,order:Number.isFinite(Number(option.order))?Number(option.order):valueIndex,enabled:option.enabled!==false};}).sort((a,b)=>a.order-b.order);
  const defaultValue=clean(group.defaultValue),defaultOption=values.find(option=>option.key===defaultValue);if(!defaultOption||group.enabled!==false&&!defaultOption.enabled)throw new Error('Each enabled Builder option group needs an enabled default value.');
  return {key,label,order:Number.isFinite(Number(group.order))?Number(group.order):index,enabled:group.enabled!==false,defaultValue,values};
 }).sort((a,b)=>a.order-b.order);
}
export function normaliseVariantMappings(value,groups){
 if(!Array.isArray(value))throw new Error('Builder component mappings must be a list.');const keys=groups.map(group=>group.key),seen=new Set();
 return value.map(mapping=>{const selection={};for(const key of keys){selection[key]=clean(mapping?.selection?.[key]);if(!groups.find(group=>group.key===key).values.some(option=>option.key===selection[key]))throw new Error('A Builder component mapping contains an unknown option value.');}const signature=keys.map(key=>key+'='+selection[key]).join('&');if(seen.has(signature))throw new Error('Builder component mappings must be unique.');seen.add(signature);const componentId=mapping.componentId==null||mapping.componentId===''?null:clean(mapping.componentId);return {selection,componentId};});
}
export function normaliseComponentResolvers(value,groups){
 if(!Array.isArray(value))throw new Error('Builder component resolvers must be a list.');const keys=new Set(),groupMap=new Map(groups.map(group=>[group.key,group]));
 return value.map(resolver=>{const key=clean(resolver?.key),label=clean(resolver?.label,200),componentCategory=clean(resolver?.componentCategory),groupKeys=[...new Set((resolver?.groupKeys||[]).map(groupKey=>clean(groupKey)))];if(!key||keys.has(key)||!label||!componentCategory||!groupKeys.length||groupKeys.some(groupKey=>!groupMap.has(groupKey)))throw new Error('Each Component resolver needs a unique key, label, category and valid option groups.');keys.add(key);const resolverGroups=groupKeys.map(groupKey=>groupMap.get(groupKey));return {key,label,componentCategory,groupKeys,mappings:normaliseVariantMappings(resolver.mappings,resolverGroups)};});
}
export function builderDefaults(groups){return Object.fromEntries(groups.filter(group=>group.enabled).map(group=>[group.key,group.defaultValue]));}
const eligible=(component,permitted)=>!!(component?.active&&component.inKits&&permitted.has(component.id));
export function resolveMappedComponent(model,selection,components){
 if(model.enabled===false)return null;const {groups,mappings,permittedComponentIds}=model;
 const activeGroups=groups.filter(group=>group.enabled),chosen={};for(const group of activeGroups){const value=selection?.[group.key];if(!group.values.some(option=>option.key===value&&option.enabled))return null;chosen[group.key]=value;}
 const mapping=mappings.find(candidate=>activeGroups.every(group=>candidate.selection[group.key]===chosen[group.key]));if(!mapping?.componentId)return null;const component=components.find(item=>item.id===mapping.componentId);return eligible(component,new Set(permittedComponentIds))?{component,mapping,selection:chosen}:null;
}
export function availableBuilderValues(model,groupKey,selection,components){
 const group=model.groups.find(item=>item.key===groupKey);if(!group?.enabled)return new Set();return new Set(group.values.filter(value=>value.enabled&&resolveMappedComponent(model,{...selection,[groupKey]:value.key},components)).map(value=>value.key));
}
