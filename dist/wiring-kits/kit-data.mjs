import {kitDefinitions as original} from './kit-seed.mjs';
import {componentRepository} from '../admin/component-repository.mjs';
import {kitBindings} from '../admin/kit-bindings.mjs';
import {createAssemblyStore,lesPaulKitAssembly,lesPaulKitDefinitionId,normaliseKitDefinition} from '../admin/assemblies.mjs';
import {resolveMappedComponent,availableBuilderValues} from './builder-options.mjs';
import {extendPotentiometerDefinition} from './kit-component-discovery.mjs';
const componentSnapshot=component=>({id:component.id,sku:component.sku,name:component.name,productTitle:component.productTitle||component.name,manufacturer:component.manufacturer,active:component.active,inKits:component.inKits,category:component.category,specification:structuredClone(component.specs||{}),kitPrice:component.kitPrice});
const currentKitAssembly=()=>{if(typeof window==='undefined')return lesPaulKitAssembly;return createAssemblyStore(window.localStorage).list().find(assembly=>assembly.id===lesPaulKitDefinitionId||assembly.kind==='wiring-kit'&&assembly.kitDefinition?.family==='les-paul')||lesPaulKitAssembly;};
export function configuredKitDefinitions(records,assembly=lesPaulKitAssembly){
 const definitions=structuredClone(original),kit=definitions['les-paul'];
 for(const [id,binding] of Object.entries(kitBindings)){
  if(binding.group==='shaft')continue;
  const item=records.find(p=>p.id===id),option=kit[binding.group][binding.option];
  option.enabled=!!(item?.active&&item.inKits&&item.category===binding.category);
  option.price=option.enabled&&Number.isSafeInteger(item.kitPrice)?item.kitPrice:NaN;
  if(item){if(binding.group!=='shaft')option.label=item.productTitle||item.name;if(item.description)option.description=item.description;option.componentId=id;option.component={id:item.id,sku:item.sku,name:item.name,productTitle:item.productTitle||item.name,manufacturer:item.manufacturer,specification:structuredClone(item.specs||{})};}
 }
 const definition=extendPotentiometerDefinition(normaliseKitDefinition(assembly.kitDefinition),records),groups=definition.builderOptions,resolver=definition.componentResolvers.find(item=>item.key==='potentiometers'),resolverGroups=resolver.groupKeys.map(key=>groups.find(group=>group.key===key)),mappings=resolver.mappings,permittedComponentIds=definition.permittedComponentIds,components=records.filter(item=>mappings.some(mapping=>mapping.componentId===item.id)).map(componentSnapshot);kit.builderEnabled=!!(assembly.active&&definition.builderEnabled);const builderModel={groups:resolverGroups,mappings,permittedComponentIds,components,resolverKey:resolver.key,enabled:kit.builderEnabled};
 kit.basePrice=definition.basePrice;kit.showOnWiringKits=!!(assembly.active&&definition.showOnWiringKits);kit.builderModel=builderModel;kit.defaults={...kit.defaults,...definition.defaults};
 for(const group of groups){kit[group.key]=Object.fromEntries(group.values.map(value=>{const enabled=kit.builderEnabled&&value.enabled&&mappings.some(mapping=>mapping.selection[group.key]===value.key&&resolveMappedComponent(builderModel,mapping.selection,records));return [value.key,{label:value.label,price:0,description:'',enabled}];}));kit.defaults[group.key]=group.defaultValue;}
 const defaultPot=resolveMappedComponent(builderModel,{pots:kit.defaults.pots,shaft:kit.defaults.shaft},components);if(defaultPot)kit.included='4 × '+(defaultPot.component.productTitle||defaultPot.component.name)+', two tone capacitors, internal wiring and consumables, hand assembly and electrical testing / QC.';
 return definitions;
}
export function resolveKitComponent(kit,selection){return resolveMappedComponent(kit.builderModel,selection,kit.builderModel.components);}
export function availableKitValues(kit,groupKey,selection){return availableBuilderValues(kit.builderModel,groupKey,selection,kit.builderModel.components);}
export async function loadConfiguredKitDefinitions(repository=componentRepository(),assembly=currentKitAssembly()){return configuredKitDefinitions(await repository.list(),assembly);}
export const kitDefinitions=await loadConfiguredKitDefinitions();
export const lesPaul=kitDefinitions['les-paul'];
export const formatKitPrice=pence=>Number.isFinite(pence)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100):'Price unavailable';
export const upgradeLabel=pence=>Number.isFinite(pence)?pence===0?'Included':pence>0?'+'+formatKitPrice(pence):'−'+formatKitPrice(Math.abs(pence)):'Price not set';
