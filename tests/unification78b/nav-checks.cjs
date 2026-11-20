const assert=require('node:assert/strict');
module.exports=async (page,uri,name)=>{
 const p=uri.pathname.replace(/\/index\.html$/,'/');
 if(!p.startsWith('/admin/'))return;
 const nav=page.locator('nav[aria-label="Admin workspaces"]');
 const stock=nav.locator('[data-workspace=ironclad]');
 const calc=nav.locator('[data-workspace=landed-cost]');
 const component=nav.locator('[data-workspace=inventory]');
 const finance=nav.locator('[data-workspace=omniscience]');
 const togg=page.locator('[data-admin-menu]');
 const expectOne=async (l,path)=>{assert.equal(await l.count(),1);assert.equal(await l.getAttribute('href'),path);};
 await expectOne(stock,'/admin/ironclad/');
 await expectOne(calc,'/admin/ironclad/calculator/');
 await expectOne(component,'/admin/?view=inventory');
 if(name==='unified-c')await expectOne(finance,'/admin/omniscience/');
 else assert.equal(await finance.count(),0,'C must be absent on B');
 const crumb=page.locator('nav[aria-label=Breadcrumb] [aria-current=location]');
 const desc=page.locator('[data-workspace-description]');
 if(p==='/admin/ironclad/'){
  assert.equal(await stock.getAttribute('aria-current'),'page');
  assert.match(await crumb.innerText(),/Stock & purchasing \/ IRONCLAD/);
  assert.match(await desc.innerText(),/physical stock.*suppliers.*procurement/);
  assert.equal(await page.locator('main:not(.admin-access-gate) h1').count(),1);
  const available=page.locator('#armoury');
  await available.getByRole('button',{name:'Acquisition batches',exact:true}).click();
  await available.getByRole('heading',{name:'Acquisition batches',exact:true}).waitFor();
  await available.getByRole('button',{name:'Measurements',exact:true}).click();
  await available.getByRole('heading',{name:'Precision measurements',exact:true}).waitFor();
  await available.getByRole('button',{name:'Movements',exact:true}).click();
  await available.getByRole('heading',{name:/Stock movements/}).waitFor();
  assert.match(await crumb.innerText(),/IRONCLAD/,'workspace mount must leave breadcrumb in place');
 }else if(p==='/admin/ironclad/calculator/'){
  assert.equal(await calc.getAttribute('aria-current'),'page');
  assert.match(await crumb.innerText(),/Landed cost calculator/);
 }else if(p==='/admin/overview/'){
  await expectOne(page.locator('a[data-metric=inventory]'),'/admin/ironclad/');
  await expectOne(page.getByRole('link',{name:'Add Component',exact:true}),'/admin/?view=inventory&new=component');
 }else if(p==='/admin/omniscience/'){
  assert.equal(await finance.getAttribute('aria-current'),'page');
  assert.match(await crumb.innerText(),/Finance \/ OMNISCIENCE/);
  assert.match(await desc.innerText(),/BLACK LEDGER and ECLIPSE remain in Orders/);
  assert.equal(await page.locator('main:not(.admin-access-gate) h1').count(),1);
 }
 if(uri.searchParams.get('probe')==='nav-mobile'){
  assert.equal(await page.evaluate(()=>window.innerWidth),390);
  await togg.click();
  assert.equal(await togg.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');
  assert.equal(await togg.getAttribute('aria-expanded'),'false');
  assert.equal(await togg.evaluate(e=>e===document.activeElement),true);
  await togg.click();
  await Promise.all([page.waitForURL('**/admin/ironclad/'),stock.click()]);
  await page.waitForFunction(()=>document.body.classList.contains('admin-authorized'));
  assert.equal(await togg.getAttribute('aria-expanded'),'false');
  await togg.click();
  assert.equal(await stock.getAttribute('aria-current'),'page');
  assert.equal(await stock.evaluate(e=>e===document.activeElement),true);
 }else if(uri.searchParams.get('probe')==='nav-desktop'){
  await Promise.all([page.waitForURL('**/admin/ironclad/'),stock.click()]);
  await page.waitForFunction(()=>document.body.classList.contains('admin-authorized'));
  assert.equal(await stock.getAttribute('aria-current'),'page');
 }
};
