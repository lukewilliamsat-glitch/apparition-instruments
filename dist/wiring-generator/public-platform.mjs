// Public availability is deliberately separate from the shared circuit engine.
export function requirePublicPlatform(state){
 if(!['les-paul','sg','tele','strat','hss'].includes(state.guitar))throw new Error('This platform is not currently available in the public Generator.');
 return state;
}
