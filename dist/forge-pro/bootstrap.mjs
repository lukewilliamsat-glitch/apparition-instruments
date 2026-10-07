import {customerAuth} from '../account/client.mjs';
import {createForgeRepository} from './repository.mjs';
import {createForgeProjectApp} from './app.mjs';
createForgeProjectApp({root:document.getElementById('forge-pro-root'),status:document.getElementById('forge-pro-status'),auth:customerAuth,repository:createForgeRepository({auth:customerAuth})}).start();
