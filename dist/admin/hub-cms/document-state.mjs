import {stable} from '../../hub-cms/body.mjs';
export function documentMetrics(body){let words=0;function walk(n){if(n.type==='text')words+=(n.text.trim().match(/\S+/g)||[]).length;if(!n.type.startsWith('protected'))for(const c of n.content||[])walk(c);}for(const doc of Object.values(body?.slots||{}))walk(doc);return {words,minutes:Math.max(1,Math.ceil(words/200))};}
export const documentChanged=(saved,current)=>saved!==null&&saved!==stable(current);
