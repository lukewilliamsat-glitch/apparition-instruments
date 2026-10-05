import {stable} from '../../hub-cms/body.mjs';
export {documentMetrics} from '../../authoring/document.mjs';
export const documentChanged=(saved,current)=>saved!==null&&saved!==stable(current);
