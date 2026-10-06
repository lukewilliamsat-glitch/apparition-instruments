// The command-centre read model is introduced in checkpoint B. No production writes.
export function bootOverview({document=globalThis.document}={}){document.querySelector('#overview-status').textContent='Your Apparition workspaces are available in the application navigation.';}
if(globalThis.document?.querySelector('#overview-status'))bootOverview();
