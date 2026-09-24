import {startKitBuilder} from './builder-shell.mjs';
import {createKitFamilyRepository} from './family-repository.mjs';
import {deploymentPath} from '../deployment.mjs';

const slug=new URLSearchParams(location.search).get('family')||document.querySelector('[data-kit-family]')?.dataset.kitFamily;
const repository=createKitFamilyRepository(),family=slug?await repository.builder(slug).catch(()=>null):null;
const route=family?new URL(deploymentPath(family.route),location.origin):null;
if(route&&route.pathname!==location.pathname){
 const params=new URLSearchParams(location.search);params.delete('family');for(const [key,value] of params)route.searchParams.set(key,value);location.replace(route.pathname+route.search);
}else await startKitBuilder(slug,{repository});
