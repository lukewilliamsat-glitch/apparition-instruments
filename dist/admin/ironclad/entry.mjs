import {mountArmoury} from './app.mjs';
import {createArmouryRepository} from './repository.mjs';
const root=document.querySelector('#armoury');
const mounted=mountArmoury(root,createArmouryRepository());
document.addEventListener('admin:conceal',()=>{mounted.dispose();root.replaceChildren();},{once:true});
