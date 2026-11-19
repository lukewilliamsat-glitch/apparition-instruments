const assert=require('node:assert/strict');
const fixtures={
 cap:'synthetic-capacitor',
 order:'AI-099901',
 refund:'AI-099880'
};
const publicRoutes=['/basket/','/contact/','/account/','/account/?fixture=customer','/account/order/','/account/order/?reference=AI-099901&fixture=customer','/checkout/success/','/checkout/success/?session_id=cs_live_DIAGNOSTICFIXTURE123','/wiring-generator/','/treble-bleed-designer/','/wiring-kits/build/','/wiring-kits/build/?family=les-paul','/les-paul-kits/','/wiring-kits/','/circuit-forge/projects/','/interactive-tools/','/news/','/privacy/','/terms/'];
const extraAdmin=['/admin/?view=inventory&probe=stock','/admin/?view=inventory&probe=mobile','/admin/site-operations/#news','/admin/site-operations/#announcements','/admin/site-operations/#commerce-offers','/admin/orders/?probe=session','/admin/orders/?probe=backend-error','/admin/orders/?probe=empty','/admin/delivery/?probe=non-live-draft'];
const shown=async(p,s)=>p.locator(s).first().waitFor({state:'visible',timeout:3500});
const hidden=async(p,s)=>p.locator(s).first().waitFor({state:'hidden',timeout:3500});
const text=async(p,s,pattern)=>{await shown(p,s);const t=await p.locator(s).first().innerText();assert.match(t,pattern,s);return t;};
const untilText=(p,s,pattern)=>p.waitForFunction(({s,pattern})=>RegExp(pattern,'i').test(document.querySelector(s)?.innerText||''),{s,pattern},{timeout:4000});
const click=async(p,s)=>p.locator(s).first().click({timeout:3000});
const fill=async(p,s,value)=>p.locator(s).first().fill(value,{timeout:3000});
function shouldAdmin(uri){return uri.pathname.startsWith('/admin/')&&!uri.searchParams.get('probe')?.startsWith('no-');}
async function assess(page,raw,role,result,name) {
 const uri=new URL(raw,'http://fixture.local'),p=uri.pathname,q=uri.searchParams,probe=q.get('probe');
 const actions={};
 const task=async(label,fn)=>{try{const state=await fn();actions[label]=state===false?'failed':'passed';}catch(e){actions[label]='failed';result.depthErrors.push({label,error:String(e).split('\n').slice(0,3).join('\n')});}};
 if(shouldAdmin(uri)){
  if(role==='expired'||role==='denied'||role==='anonymous'){
   await task('gate-denies-before-repository',async()=>{
    await shown(page,'.admin-access-gate');
    assert.equal(await page.evaluate(()=>document.body.classList.contains('admin-authorized')),false);
    assert.equal(result.requests.filter(x=>!/^\/(auth\/v1\/|rest\/v1\/admin_members$)/.test(x.path)&&x.authenticated).length,0);
   });
   return actions;
  }
  if(!(await page.evaluate(()=>document.body.classList.contains('admin-authorized'))))return {authorization:'blocked'};
  actions.authorization='passed';
 }
 if(p==='/admin/'||p==='/admin/command/'){
  if(q.get('view')==='assemblies'){
   await task('assembly-data',async()=>{await untilText(page,'#table-body','Les Paul');});
  }else if(q.get('view')==='maintenance'){
   await task('maintenance-actions',async()=>{
    await shown(page,'#preview-component-export');await click(page,'#preview-component-export');await page.waitForFunction(()=>[document.querySelector('#component-export-summary')?.textContent,document.querySelector('#status')?.textContent].some(s=>/Ready:|No saved Component record/.test(s||'')),{},{timeout:4000});
   });
  }else{
   await task('inventory-rows-search-reset',async()=>{
    await untilText(page,'#table-body','Synthetic tone capacitor');
    await fill(page,'#search','NO MATCH FOR SENTINEL');
    await shown(page,'#empty');
    await fill(page,'#search','Synthetic'); await untilText(page,'#table-body','Synthetic tone capacitor');
   });
   if(probe==='stock'){
    await task('stock-tab-and-cancel',async()=>{
     await page.getByRole('button',{name:/Update stock for Synthetic/}).first().click({timeout:3000});
     await shown(page,'#stock-dialog[open]');await page.keyboard.press('Escape');await hidden(page,'#stock-dialog[open]');
    });
   }else if(probe==='mobile'){
    await task('mobile-navigation',async()=>{
      await click(page,'.admin-icon-button');
      await shown(page,'a[data-workspace=orders]');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2));
      await page.keyboard.press('Escape');
    });
   }else{
    await task('component-editor-cancel',async()=>{
     await page.getByRole('button',{name:/Edit Synthetic/}).first().click({timeout:3000});
     await shown(page,'#component-dialog[open]');await page.keyboard.press('Escape');await hidden(page,'#component-dialog[open]');
    });
   }
  }
 }
 if(p==='/admin/overview/')await task('overview-and-linked-workspaces',async()=>{await shown(page,'#overview-content');await shown(page,'a[data-workspace=orders]');assert(await page.locator('#overview-content').innerText());});
 if(p==='/admin/orders/'){
  if(probe==='session'){
   await task('sign-out-and-sign-back-in',async()=>{
    const signout=page.getByRole('button',{name:'Sign Out',exact:true}).filter({visible:true}).first();
    const before=result.requests.filter(x=>x.path==='/rest/v1/orders').length;
    await signout.click({timeout:3000});await shown(page,'.admin-access-gate form');
    await fill(page,'.admin-access-gate input[name=email]','fixture-admin@example.invalid');
    await fill(page,'.admin-access-gate input[name=password]','test-only-password');
    await click(page,'.admin-access-gate form button[type=submit]');
    await page.waitForFunction(()=>document.body.classList.contains('admin-authorized'),{},{timeout:4500});
    await untilText(page,'#order-rows',fixtures.order);
    assert(result.requests.filter(x=>x.path==='/rest/v1/orders').length>before,'workspace must reload protected Orders over the new session');
   });
  }else if(probe==='backend-error'){
   await task('visible-repository-failure',()=>untilText(page,'#order-message','Synthetic Orders unavailable'));
  }else if(probe==='empty'){
   await task('empty-orders',()=>shown(page,'#orders-empty'));
  }else if(q.get('id')){
   await task('order-detail-initialisation',()=>text(page,'#detail-title',/AI-099901/));
   if(['fixed','deep'].includes(name))await task('existing-financial-revisions',async()=>{
    await shown(page,'[data-financial-record]');
    await click(page,'[data-financial-record] summary');
    await untilText(page,'[data-financial-record] ol','Revision 1');
   });
  }else if(q.get('new')==='external'){
   await task('external-order-form-and-available-product',async()=>{await shown(page,'#create-order-form');await untilText(page,'#external-product-picker','Synthetic tone capacitor');assert(!(await page.locator('#save-order').getAttribute('aria-hidden')));});
  }else if(q.get('view')==='aftercare'){
   await task('aftercare-queue-filter',async()=>{await untilText(page,'#aftercare-queue',fixtures.order);await page.getByLabel('Aftercare queue').selectOption('skipped');await untilText(page,'#aftercare-queue','No aftercare reminders');});
  }else if(q.get('view')==='attempts'){
   await task('checkout-attempts-filter',async()=>{await untilText(page,'#order-rows','AI-099902');assert(!(await page.locator('#order-rows').innerText()).includes(fixtures.order));});
  }else{
   await task('order-list-search-sorting',async()=>{
    await untilText(page,'#order-rows',fixtures.order);
    await fill(page,'#order-search','NO SENTINEL ORDER');
    await shown(page,'#orders-empty');await fill(page,'#order-search','AI-0999');await untilText(page,'#order-rows',fixtures.order);
    if(await page.locator('#order-sort').count())await page.locator('#order-sort').selectOption({index:1},{timeout:2500});await untilText(page,'#order-rows',fixtures.order);
   });
  }
 }
 if(p==='/admin/orders/build-sheet/')await task('build-sheet-saved-kit',()=>text(page,'#build-reference',/AI-10001/));
 if(p==='/admin/orders/invoice/')await task('invoice-historical-order',()=>text(page,'#reference',/AI-099901/));
 if(p==='/admin/site-operations/'){
  await task('open-state-and-commercial-list',async()=>{await untilText(page,'#store-current','Open for business');await untilText(page,'[data-commercial-status]','Destination configuration loaded');});
  if(uri.hash==='#news')await task('news-edit-preview-no-write',async()=>{await click(page,'#new-post');await fill(page,'#news-form [name=body]','Synthetic release notes');await click(page,'#preview-post');await untilText(page,'#news-preview','Synthetic release notes');});
  if(uri.hash==='#commerce-offers')await task('commerce-intentional-hold',()=>untilText(page,'[data-offer-studio]','Preview only'));
 }
 if(p==='/admin/delivery/')await task('legacy-tariff-and-draft',async()=>{
  await untilText(page,'#delivery-active','Legacy postage');
  await untilText(page,'#delivery-active','50');
  if(probe==='non-live-draft'){
   const form=page.locator('#delivery-form');
   const before=result.requests.filter(x=>x.path.endsWith('_write')).length;
   await fill(page,'#delivery-methods [name=description]','Synthetic Standard UK delivery');
   await form.getByRole('button',{name:'Save draft',exact:true}).click({timeout:3000});
   await untilText(page,'#delivery-status','Draft saved');
   assert.equal(result.requests.filter(x=>x.path.endsWith('_write')).length,before+1);
  }
 });
 if(p==='/admin/catalogue-settings/')await task('manufacturer-reference-guard',async()=>{
   await shown(page,'tr[data-option-key="fixture"]');
   const row=page.locator('tr[data-option-key="fixture"]');
   await row.getByRole('button',{name:'View references'}).click({timeout:3000});
   await untilText(page,'.catalogue-dependency-notice','Synthetic tone capacitor');
 });
 if(p==='/admin/email-templates/')await task('select-template-preview-cancel-dirty',async()=>{
   await shown(page,'#template-list button[data-key="aftercare:EBAY"]');
   await click(page,'#template-list button[data-key="aftercare:EBAY"]');
   await untilText(page,'#preview-context','SAMPLE ONLY');
   await fill(page,'#template-subject','Synthetic unsaved subject');
   await untilText(page,'#template-state','Unsaved changes');
 });
 if(p==='/admin/email-preview/')await task('preview-different-email-type',async()=>{
   await click(page,'[data-kind=dispatched][data-channel=EBAY]');await untilText(page,'#preview-status','NOT A REAL ORDER');
 });
 if(p==='/admin/hub-cms/')await task('cms-library-filter-and-open-draft',async()=>{
   await shown(page,'#cms-search');await fill(page,'#cms-search','No fixture article');
   await click(page,'#cms-new');await shown(page,'#cms-form');
 });
 if(p==='/admin/hub-media/')await task('media-template-state',async()=>{await shown(page,'#media-assets');await shown(page,'#media-form');assert(result.requests.some(r=>r.path.endsWith('/hub_media_assets')&&r.authenticated));});
 if(p==='/admin/conjure/')await task('conjure-frame-and-mode',async()=>{
   await page.locator('iframe').contentFrame().locator('.manifest-block').first().waitFor({state:'attached',timeout:4500});
   const edit=page.locator('[data-edit]');await edit.uncheck({timeout:3000});assert(!(await edit.isChecked()));
 });
 if(p==='/admin/wiring-kit-master/')await task('wiring-cost-stock-projection',async()=>{await shown(page,'#costing-values');assert(await page.locator('#costing-values dt').count()>1);assert(await page.locator('#stock-body tr').count()>0||await page.locator('#stock-empty').isVisible());});
 if(p==='/admin/ironclad/')await task('calculator-line-and-estimate',async()=>{
   const n=await page.locator('#estimate-lines fieldset').count();
   await click(page,'#add-estimate-line');assert.equal(await page.locator('#estimate-lines fieldset').count(),n+1);await shown(page,'#estimate-result');
 });
 if(p==='/')await task('homepage-render',async()=>{await shown(page,'main h1');assert(await page.locator('header a[href="/components/"]').count());});
 if(p==='/components/')await task('components-catalogue',async()=>{await shown(page,'main');assert(result.requests.some(x=>x.path.endsWith('/catalogue_components')));});
 if(p==='/products/bleed-cap/')await task('product-route-and-image',async()=>{await shown(page,'main h1');const img=page.locator('main img').first();await img.waitFor({timeout:3000});assert(await img.evaluate(x=>x.complete&&x.naturalWidth>0));});
 if(p==='/basket/')await task('basket-render-no-checkout',()=>shown(page,'#basket-content'));
 if(p==='/checkout/')await task('eligible-basket-to-delivery-without-payment',()=>text(page,'.checkout-order-form',/Secure checkout/));
 if(p==='/checkout/success/')await task('order-status-or-safe-missing-session',async()=>{await shown(page,'#order-message');if(q.has('session_id'))assert(result.requests.some(x=>x.path.endsWith('/checkout-status')));});
 if(p==='/account/')await task(q.has('fixture')?'customer-owned-order-list':'customer-signed-out-navigation',async()=>{
  if(q.has('fixture')){await shown(page,'#account-signed-in');await untilText(page,'#my-orders-list','AI-099901');}
  else {await shown(page,'#account-signed-out');await click(page,'button[data-view=recover]');await shown(page,'#recovery-request-form');}
 });
 if(p==='/account/order/')await task(q.has('fixture')?'customer-owned-order-detail':'missing-order-fails-closed',async()=>{
  if(q.has('fixture')){await untilText(page,'#order-title','AI-099901');await shown(page,'#order-detail');}
  else await untilText(page,'#order-status','Order not found');
 });
 if(p==='/contact/')await task('contact-fixture-validation-and-simulated-success',async()=>{
  const form='#enquiry-form ';
  await shown(page,'#enquiry-form');await click(page,form+'button[type=submit]');assert(!result.requests.some(e=>e.path.endsWith('/contact-enquiry')));
  await fill(page,form+'[name=name]','Synthetic auditor');
  await fill(page,form+'[name=email]','synthetic@example.invalid');
  await page.locator(form+'[name=category]').selectOption('general',{timeout:2500});
  await fill(page,form+'[name=message]','Synthetic unsent contact fixture');
  await click(page,form+'button[type=submit]');await shown(page,'#enquiry-success');
  assert.equal(result.requests.filter(e=>e.path.endsWith('/contact-enquiry')).length,1);
 });
 if(p==='/circuit-forge/')await task('circuit-forge-layout-and-tools',async()=>{await shown(page,'#forge-controls');await shown(page,'#forge-viewport');const before=await page.locator('#forge-zoom-value').textContent();await click(page,'#forge-zoom-in');assert.notEqual(await page.locator('#forge-zoom-value').textContent(),before);});
 if(p==='/circuit-forge/projects/')await task('forge-project-access-entry',()=>shown(page,'#forge-pro-root'));
 if(p==='/wiring-generator/')await task('wiring-diagram-output',async()=>{await shown(page,'#generator-form');await shown(page,'#generator-mount svg');});
 if(p==='/treble-bleed-designer/')await task('designer-graph',async()=>{await shown(page,'#designer-inputs');await shown(page,'#response-graph');});
 if(p==='/wiring-kits/build/'||p==='/les-paul-kits/')await task('kit-builder-selection-or-missing-family-guard',async()=>{
  if(p==='/wiring-kits/build/'&&!q.has('family'))await untilText(page,'#builder-status','Choose a supported Wiring Kit');
  else {await shown(page,'main.kit-main');assert(result.requests.some(x=>x.path.endsWith('/catalogue_wiring_kits')));}
 });
 if(p==='/wiring-kits/')await task('wiring-kit-family-catalogue',async()=>{await shown(page,'main');assert(result.requests.some(x=>x.path.endsWith('/catalogue_wiring_kits')));});
 if(['/interactive-tools/','/news/','/privacy/','/terms/'].includes(p))await task('public-content',()=>shown(page,'main'));
 return actions;
}
module.exports={assess,extraAdmin,publicRoutes};
