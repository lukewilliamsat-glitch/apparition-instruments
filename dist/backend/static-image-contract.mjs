// Provider-neutral logical paths. Product/source identities never contain a host.
export function staticDeliveryOrigin(delivery){
 const origin=new URL(delivery.assetOrigin),base=delivery.assetBasePath??'';
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||typeof base!=='string'||base!==''&&!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/.test(base)||!/^\/assets\/catalogue-images\/manifest(?:\.[a-f0-9]{64})?\.json$/.test(delivery.manifestPath))throw Error('Invalid static image delivery configuration');
 return origin.origin;
}
export function staticAssetURL(path,delivery){
 const origin=staticDeliveryOrigin(delivery);
 if(!/^\/assets\/catalogue-images\/(?:[a-f0-9]{64}\.(?:png|jpg|webp)|manifest(?:\.[a-f0-9]{64})?\.json)$/.test(path))throw Error('Invalid static asset path');
 return origin+(delivery.assetBasePath??'')+path;
}
