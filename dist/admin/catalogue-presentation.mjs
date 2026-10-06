// Presentation adapter only: moves existing controls; repositories and handlers stay intact.
export function prepareCatalogue(d){
 const path=d.location.pathname,root=path==='/admin/'||path==='/admin/index.html',settings=path.startsWith('/admin/catalogue-settings/'),master=path.startsWith('/admin/wiring-kit-master/');
 if(!root&&!settings&&!master)return;
 const main=d.querySelector('main.admin-main');if(!main||main.dataset.cataloguePrepared)return;main.dataset.cataloguePrepared='true';d.body.dataset.catalogueWorkspace='true';
 const header=main.querySelector('.admin-page-header'),actions=d.createElement('div');actions.className='admin-page-actions';
 for(const id of ['add-component','add-assembly']){const control=d.getElementById(id);if(control)actions.append(control);}if(actions.childElementCount)header.append(actions);
 const notes=[...main.querySelectorAll(':scope > p.storage-note')];if(notes.length){const help=d.createElement('details'),summary=d.createElement('summary');help.className='admin-workflow-help';summary.textContent='Workspace notes';help.append(summary,...notes);main.append(help);}
 if(root){const exports=[...main.querySelectorAll('section[aria-label$="migration export"]')],utilities=d.createElement('details'),summary=d.createElement('summary');utilities.className='admin-maintenance';summary.textContent='Private data exports';utilities.append(summary,...exports);main.append(utilities);
  if(new URLSearchParams(d.location.search).get('view')==='maintenance'){d.body.dataset.catalogueMaintenance='true';utilities.open=true;for(const n of main.querySelectorAll('.admin-filters,.admin-table-scroll,#empty'))n.hidden=true;actions.hidden=true;}
 }
 for(const id of ['status','option-status','draft-status']){const n=d.getElementById(id);if(n){n.classList.add('admin-workspace-feedback');n.setAttribute('aria-live','polite');}}
 for(const table of main.querySelectorAll('table'))if(!table.closest('.admin-table-scroll')){const wrap=d.createElement('div');wrap.className='admin-table-scroll';table.before(wrap);wrap.append(table);}
}
