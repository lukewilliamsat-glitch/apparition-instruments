// Validated five-way control contracts, independent of placement or artwork.
// Targets are pickup positions. The selector's second pole switches tone inputs.
export function fiveWayAssignments(layout,controlLayout='1V2T') {
 if(!['SSS','HSS'].includes(layout))throw Error('Unsupported five-way pickup layout.');
 const all=['neck','middle','bridge'];
 if(controlLayout==='1V1T'&&layout==='HSS')return {masterVolume:all,masterTone:all};
 if(controlLayout!=='1V2T')throw Error('Unsupported five-way control layout.');
 return {masterVolume:all,neckTone:['neck'],middleTone:layout==='HSS'?['middle','bridge']:['middle']};
}
export const fiveWayThrow=Object.freeze({bridge:1,middle:2,neck:3});
