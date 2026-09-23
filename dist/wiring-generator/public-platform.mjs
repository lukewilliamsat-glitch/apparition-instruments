// Public availability is deliberately separate from the shared circuit engine.
export function requirePublicPlatform(state){
 if(state.guitar!=='les-paul')throw new Error('This platform is not currently available in the public Generator.');
 return state;
}
