// Compatibility entry only. Authentication and business state belong to /admin/.
const target=new URL('../',document.baseURI);
const source=new URL(location.href);
for(const key of ['view','new'])if(source.searchParams.has(key))target.searchParams.set(key,source.searchParams.get(key));
location.replace(target.href);
