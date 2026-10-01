// Presentation intent only. Every lens consumes the original circuit unchanged.
export const presentationModes=['build','trace','explain'];
export const normalisePresentation=value=>presentationModes.includes(value)?value:'build';
export function presentationFor(circuit,mode='trace'){
 mode=presentationModes.includes(mode)?mode:'trace';
 return {circuit,mode,build:mode==='build',routing:mode==='build'?'build':'trace',showContacts:mode!=='build',showTechnicalLabels:mode!=='build'};
}
export const buildKey='Rear view · pot lugs left to right: 3 / 2 (wiper) / 1. Solid = signal or component lead; long dashes = ground; short dashes = shield. Silver = lug termination; bronze = casing solder. Crossing hops do not join. Verify lug functions on your hardware.';
