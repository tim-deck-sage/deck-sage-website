import {PaddleOCR} from '../../vendor/paddle-ocr.mjs';
import {createCatalogMatcher,deduplicatePredictions} from '../localScanMatcher.mjs';
import {inspectImageDimensions} from '../imageMemoryGuard.mjs';
let ocr,match,active;
const detection={textDetLimitSideLen:1536,textDetLimitType:'max',textDetMaxSideLimit:1536,textDetThresh:.3,textDetBoxThresh:.6,textDetUnclipRatio:1.5,textRecScoreThresh:0};
function bbox(poly){return {x0:Math.min(...poly.map(p=>p[0])),y0:Math.min(...poly.map(p=>p[1])),x1:Math.max(...poly.map(p=>p[0])),y1:Math.max(...poly.map(p=>p[1]))};}
function sourcePoly(poly,angle,w,h,scale){return poly.map(([x,y])=>{const p=angle===0?[x,y]:angle===90?[y,h-x]:angle===180?[w-x,h-y]:[w-y,x];return p.map(v=>v/scale);});}
function accepted(item){if(!item?.text||item.score<.7)return null;const found=match(item.text);return found?{...found,confidence:item.score}:null;}
async function cropBlob(cv,mat,rotate){
 const rgba=new cv.Mat();try{if(mat.channels()===4)mat.copyTo(rgba);else cv.cvtColor(mat,rgba,mat.channels()===1?cv.COLOR_GRAY2RGBA:cv.COLOR_RGB2RGBA);
 const canvas=new OffscreenCanvas(rgba.cols,rgba.rows),ctx=canvas.getContext('2d');ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba.data),rgba.cols,rgba.rows),0,0);
 if(!rotate)return await canvas.convertToBlob({type:'image/jpeg',quality:.9});
 const flipped=new OffscreenCanvas(canvas.width,canvas.height),out=flipped.getContext('2d');out.translate(canvas.width,canvas.height);out.rotate(Math.PI);out.drawImage(canvas,0,0);return await flipped.convertToBlob({type:'image/jpeg',quality:.9});
 }finally{rgba.delete();}
}
globalThis.__deckSageRecognize=async({cv,cropMats,detBoxes,recModel})=>{
 const baseline=await recModel.predict(cv,cropMats),matches=baseline.map(accepted),selected=baseline;
 for(let i=0;i<matches.length;i++)if(matches[i]){
  const originalPoly=sourcePoly(detBoxes[i].poly,active.angle,active.width,active.height,active.scale);
  active.predictions.push({...matches[i],text:selected[i].text,originalPoly,originalBox:bbox(originalPoly),sourceWidth:active.originalWidth,sourceHeight:active.originalHeight,angle:active.angle,cropBlob:await cropBlob(cv,cropMats[i],false)});
 }
 return selected;
};
export async function initialize({det,rec,names,wasmPaths}){
 match=createCatalogMatcher(names);
 ocr=await PaddleOCR.create({textDetectionModelName:'PP-OCRv6_tiny_det',textRecognitionModelName:'PP-OCRv6_tiny_rec',textDetectionModelAsset:{url:'local:det'},textRecognitionModelAsset:{url:'local:rec'},fetch:async url=>new Response(url==='local:det'?det:rec),textDetectionBatchSize:1,textRecognitionBatchSize:8,ortOptions:{backend:'wasm',wasmPaths,numThreads:1,simd:true,proxy:false}});
}
export async function scan(file,progress){
 await inspectImageDimensions(file);
 let original;
 try{original=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw Error('This browser cannot decode that image. Try a JPEG, PNG or WebP photo.');}
 const scale=Math.min(1,3072/Math.max(original.width,original.height)),width=Math.max(1,Math.round(original.width*scale)),height=Math.max(1,Math.round(original.height*scale));
 const source=new OffscreenCanvas(width,height);source.getContext('2d',{alpha:false}).drawImage(original,0,0,width,height);
 active={width,height,scale,originalWidth:original.width,originalHeight:original.height,predictions:[]};original.close();
 try{
  for(const [index,angle] of [0,90,180,270].entries()){
   active.angle=angle;progress(`Reading card titles · orientation ${index+1} of 4`);
   const rotated=new OffscreenCanvas(angle%180?height:width,angle%180?width:height),ctx=rotated.getContext('2d',{alpha:false});ctx.translate(rotated.width/2,rotated.height/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(source,-width/2,-height/2);
   const bitmap=await createImageBitmap(rotated);try{await ocr.predict(bitmap,detection);}finally{bitmap.close();rotated.width=1;rotated.height=1;}
  }
  const predictions=deduplicatePredictions(active.predictions);
  return {detectedNames:predictions.map(p=>p.name),uncertainNames:[],predictions};
 }finally{active=null;source.width=1;source.height=1;}
}
