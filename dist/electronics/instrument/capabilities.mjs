// Public capability entry point: validation + relationships + composable passive modifiers.
export {instrumentCapabilities as assessCapabilities,matchingReference,generatorConfiguration} from './configuration.mjs';
export const capabilityStates=Object.freeze(['SUPPORTED','INTENTIONALLY_UNSUPPORTED','INVALID']);
