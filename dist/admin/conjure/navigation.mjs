// Additive discovery only: specialist workspaces and authentication stay intact.
export function addConjureNavigation(document){
 const navigation=document.querySelector('nav[aria-label="Admin workspaces"]')||document.querySelector('.admin-navigation')||document.querySelector('.admin-tabs');
 if(!navigation||navigation.querySelector('a[href="/admin/conjure/"]'))return;
 const link=document.createElement('a');link.href='/admin/conjure/';link.textContent='Website editor';
 if(navigation.classList.contains('admin-tabs')){navigation.prepend(link);return;}
 const group=document.createElement('div'),label=document.createElement('p');label.textContent='Conjure';group.append(label,link);navigation.prepend(group);
}
