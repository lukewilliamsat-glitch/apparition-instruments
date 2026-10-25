// Mounted by the existing Admin gate only after its authoritative membership check.
// No transport, fixture fallback, credentials, public catalogue read or write endpoint.
export async function mountAdminWorkspace({document}){
 const status=document.getElementById('command-status');
 status.textContent='Read-only COMMAND. The authenticated catalogue adapter is not activated. No product data has been requested.';
 return Object.freeze({lock(){document.getElementById('command-content').replaceChildren();},destroy(){}});
}
