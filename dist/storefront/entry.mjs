import {startStorefront} from './startup.mjs?build=b396ec59d317b58ed1c9cd94f8f65620cd50a04c';
// Closed route map: no user-controlled module URL and no extra catalogue read.
const routes=[
 ['components','component-status',()=>import('../components/components.mjs?v=p11&build=0f4b82d6f618ecc7e661c3b3ff13ca1b58b66ca4')],
 ['product','product-status',()=>import('../products/app.mjs?v=p11ef&build=0f4b82d6f618ecc7e661c3b3ff13ca1b58b66ca4')],
 ['basket','basket-content',()=>import('../basket/basket.mjs?build=0f4b82d6f618ecc7e661c3b3ff13ca1b58b66ca4')],
 ['checkout','checkout-content',()=>import('../checkout/checkout.mjs?build=0f4b82d6f618ecc7e661c3b3ff13ca1b58b66ca4')]
];
const selected=routes.find(([,id])=>document.getElementById(id));
if(selected)await startStorefront({document,route:selected[0],load:selected[2]});
