import {startStorefront} from './startup.mjs?build=b396ec59d317b58ed1c9cd94f8f65620cd50a04c';
// Closed route map: no user-controlled module URL and no extra catalogue read.
const routes=[
 ['components','component-status',()=>import('../components/components.mjs?v=p11&build=2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f')],
 ['product','product-status',()=>import('../products/app.mjs?v=p11ef&build=2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f')],
 ['basket','basket-content',()=>import('../basket/basket.mjs?build=2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f')],
 ['checkout','checkout-content',()=>import('../checkout/checkout.mjs?build=2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f')]
];
const selected=routes.find(([,id])=>document.getElementById(id));
if(selected)await startStorefront({document,route:selected[0],load:selected[2]});
