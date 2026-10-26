// Static generators edit markup only. They must not execute page code or load assets.
import {Window} from 'happy-dom';
export function createStaticWindow({url}={}){
 return new Window({...url?{url}:{},settings:{enableJavaScriptEvaluation:false,
  disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,
  disableCSSFileLoading:true,disableIframePageLoading:true}});
}
