import {kitDefinitions as original} from './kit-seed.mjs';
import {componentRepository} from '../admin/component-repository.mjs';
import {lesPaulKitAssembly,lesPaulKitDefinitionId,normaliseKitDefinition} from '../admin/assemblies.mjs';
import {assemblyRepository} from '../admin/assembly-repository.mjs';
import {resolveMappedComponent,availableBuilderValues} from './builder-options.mjs';
import {extendPotentiometerDefinition,discoverKitCandidates,toneCapacitance} from './kit-component-discovery.mjs';
const componentSnapshot=component=>({id:component.id,sku:component.sku,name:component.name,productTitle:component.productTitle||component.name,manufacturer:component.manufacturer,active:component.active,inKits:component.inKits,category:component.category,stock:component.stock,description:component.description||'',specification:structuredClone(component.specs||{}),kitPrice:component.kitPrice});
export function configuredKitDefinitions(records,assembly=lesPaulKitAssembly){
 const definitions=structuredClone(original),kit=definitions['les-paul'];
 const definition=extendPotentiometerDefinition(normaliseKitDefinition(assembly.kitDefinition),records),groups=definition.builderOptions,resolver=definition.componentResolvers.find(item=>item.key==='potentiometers'),resolverGroups=resolver.groupKeys.map(key=>groups.find(group=>group.key===key)),mappings=resolver.mappings,permittedComponentIds=definition.permittedComponentIds,components=records.filter(item=>mappings.some(mapping=>mapping.componentId===item.id)).map(componentSnapshot);kit.builderEnabled=!!(assembly.active&&definition.builderEnabled);const builderModel={groups:resolverGroups,mappings,permittedComponentIds,components,resolverKey:resolver.key,enabled:kit.builderEnabled};
 kit.basePrice=definition.basePrice;kit.id=assembly.id;kit.name=assembly.name;kit.family=definition.family;kit.showOnWiringKits=!!(assembly.active&&definition.showOnWiringKits);kit.builderModel=builderModel;kit.records=records.map(componentSnapshot);kit.defaults={...kit.defaults,...definition.defaults};kit.defaultWarnings=[];
 for(const group of groups){kit[group.key]=Object.fromEntries(group.values.map(value=>{const enabled=kit.builderEnabled&&value.enabled&&mappings.some(mapping=>mapping.selection[group.key]===value.key&&resolveMappedComponent(builderModel,mapping.selection,records));return [value.key,{label:value.label,price:0,description:'',enabled}];}));kit.defaults[group.key]=group.defaultValue;}
 const discovered=discoverKitCandidates(records);
 const catalogue=category=>discovered[category].filter(item=>permittedComponentIds.includes(item.id)).sort((a,b)=>(a.productTitle||a.name).localeCompare(b.productTitle||b.name));
 const physical=(item,quantity=1)=>({label:item.productTitle||item.name,description:item.description||'',componentId:item.id,component:componentSnapshot(item),price:Number.isSafeInteger(item.kitPrice)?item.kitPrice:NaN,quantity,enabled:kit.builderEnabled,value:item.category==='capacitors'?toneCapacitance(item):item.specs?.Capacitor||'',series:item.specs?.Series||'',topology:item.specs?.Topology||''});
 kit.capacitors=Object.fromEntries(catalogue('capacitors').map(item=>[item.id,physical(item)]));
 if(!Object.keys(kit.capacitors).length){kit.capacitors.unavailable={label:'No eligible tone capacitors',description:'Permit an active capacitor in the Kit Definition.',componentId:null,price:NaN,value:'0.022',enabled:false};kit.defaultWarnings.push('No eligible tone capacitors are configured.');}
 kit.bleed={none:{...kit.bleed.none,componentId:null,quantity:0},...Object.fromEntries(catalogue('treble-bleeds').map(item=>[item.id,physical(item,2)]))};
 kit.selector={none:{...kit.selector.none,componentId:null,quantity:0},...Object.fromEntries(catalogue('switches').map(item=>[item.id,physical(item)]))};
 kit.jack={none:{...kit.jack.none,componentId:null,quantity:0},...Object.fromEntries(catalogue('jacks').map(item=>[item.id,physical(item)]))};
 const preferred=(role,options,fallback='none')=>{const id=definition.defaults.componentIds?.[role];if(id&&options[id])return id;if(id)kit.defaultWarnings.push('Unavailable default '+role+': '+id);return Object.keys(options).find(key=>key!==fallback)||fallback;};
 kit.defaults.neckCap=preferred('neckCapacitor',kit.capacitors,'');kit.defaults.bridgeCap=preferred('bridgeCapacitor',kit.capacitors,'');kit.defaults.caps=kit.defaults.neckCap===kit.defaults.bridgeCap?kit.defaults.neckCap:'mixed';
 for(const [key,role] of [['bleed','trebleBleed'],['selector','selector'],['jack','jack']]){const id=definition.defaults.componentIds?.[role];kit.defaults[key]=id?preferred(role,kit[key]):'none';}
 if(kit.defaults.wiring==='50s'&&kit.defaults.bleed!=='none')kit.defaultWarnings.push('Treble bleed default cannot be used with 50s wiring; None is selected.');
 const potDefault=resolveMappedComponent(builderModel,{pots:kit.defaults.pots,shaft:kit.defaults.shaft},components);
 if(!potDefault)kit.defaultWarnings.push('Unavailable default potentiometer and shaft combination. Select a valid configuration before adding to basket.');
 return definitions;
}
export function resolveKitComponent(kit,selection){return resolveMappedComponent(kit.builderModel,selection,kit.builderModel.components);}
export function availableKitValues(kit,groupKey,selection){return availableBuilderValues(kit.builderModel,groupKey,selection,kit.builderModel.components);}
export async function loadConfiguredKitDefinitions(repository=componentRepository(),assembly=null,definitions=assemblyRepository()){
 const [records,kits]=await Promise.all([repository.list(),assembly?Promise.resolve([assembly]):definitions.list()]);
 const selected=assembly||kits.find(item=>item.id===lesPaulKitDefinitionId||item.kind==='wiring-kit'&&item.kitDefinition?.family==='les-paul');
 if(!selected)throw new Error('Les Paul Wiring Kit Definition is unavailable.');
 return configuredKitDefinitions(records,selected);
}
export const kitDefinitions=await loadConfiguredKitDefinitions();
export const lesPaul=kitDefinitions['les-paul'];
export const formatKitPrice=pence=>Number.isFinite(pence)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100):'Price unavailable';
export const upgradeLabel=pence=>Number.isFinite(pence)?pence===0?'Included':pence>0?'+'+formatKitPrice(pence):'−'+formatKitPrice(Math.abs(pence)):'Price not set';
