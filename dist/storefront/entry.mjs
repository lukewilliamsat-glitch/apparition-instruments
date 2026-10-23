import {startStorefront} from './startup.mjs';
// Closed route map: no user-controlled module URL and no extra catalogue read.
const routes=[
 ['components','component-status',()=>import('../components/components.mjs?v=p11')],
 ['product','product-status',()=>import('../products/app.mjs?v=p11ef')],
 ['basket','basket-content',()=>import('../basket/basket.mjs')],
 ['checkout','checkout-content',()=>import('../checkout/checkout.mjs')]
];
const selected=routes.find(([,id])=>document.getElementById(id));
if(selected)await startStorefront({document,route:selected[0],load:selected[2]});
