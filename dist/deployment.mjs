export const deploymentRoot=new URL('.',import.meta.url);

export function deploymentPath(value){
 if(!value?.startsWith('/')||!/^https?:$/.test(deploymentRoot.protocol)||deploymentRoot.pathname==='/'||value.startsWith(deploymentRoot.pathname))return value;
 const url=new URL(value.slice(1),deploymentRoot);
 return url.pathname+url.search+url.hash;
}
