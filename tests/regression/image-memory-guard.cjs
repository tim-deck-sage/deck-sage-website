const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..');
function png(width,height){const b=Buffer.alloc(33);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(width,16);b.writeUInt32BE(height,20);return b;}
function jpeg(width,height,progressive=false){const b=Buffer.alloc(23);b.set([255,216,255,progressive?194:192,0,17,8]);b.writeUInt16BE(height,7);b.writeUInt16BE(width,9);b[11]=3;b.set([255,217],21);return b;}
function chunk(type,payload){const b=Buffer.alloc(8+payload.length+(payload.length&1));b.write(type);b.writeUInt32LE(payload.length,4);payload.copy(b,8);return b;}
function webp(width,height,{lossless=false,extended=false,animated=false,canvasWidth=width}={}){
 const chunks=[];
 if(extended){const b=Buffer.alloc(10);b[0]=animated?2:0;b.writeUIntLE(canvasWidth-1,4,3);b.writeUIntLE(height-1,7,3);chunks.push(chunk('VP8X',b));}
 const b=Buffer.alloc(lossless?5:10);
 if(lossless){b[0]=47;b.writeUInt32LE(((width-1)|((height-1)<<14))>>>0,1);}else{b.set([157,1,42],3);b.writeUInt16LE(width,6);b.writeUInt16LE(height,8);}
 chunks.push(chunk(lossless?'VP8L':'VP8 ',b));const content=Buffer.concat(chunks),head=Buffer.alloc(12);head.write('RIFF');head.writeUInt32LE(content.length+4,4);head.write('WEBP',8);return Buffer.concat([head,content]);
}
async function main(){
 const {inspectImageDimensions:inspect,IMAGE_MEMORY_LIMITS:limits}=await import(pathToFileURL(path.join(root,'preview/src/imageMemoryGuard.mjs')));
 const read=b=>inspect(new Blob([b]));
 for(const [format,bytes]of [['jpeg',jpeg(4032,3024)],['jpeg',jpeg(4032,3024,true)],['png',png(4032,3024)],['webp',webp(4032,3024)],['webp',webp(4032,3024,{lossless:true})],['webp',webp(4032,3024,{extended:true})],['webp',webp(4032,3024,{lossless:true,extended:true})]]){
  const original=Buffer.from(bytes);assert.deepEqual(await read(bytes),{width:4032,height:3024,format});assert.deepEqual(bytes,original);
 }
 assert.equal((await read(png(8000,4000))).width,8000);
 assert.equal((await read(png(16384,1))).width,16384);
 for(const bytes of [png(8001,4000),jpeg(6000,6000),webp(6000,6000),png(16385,1),png(0xffffffff,0xffffffff)])await assert.rejects(()=>read(bytes),/32 megapixels/);
 for(const bytes of [png(0,1),jpeg(0,1),webp(0,1),webp(100,100,{animated:true,extended:true}),webp(100,100,{canvasWidth:200,extended:true}),Buffer.from('<svg width="999999" height="999999"></svg>'),Buffer.alloc(20),png(1,1).subarray(0,20),jpeg(1,1).subarray(0,10)])await assert.rejects(()=>read(bytes),/dimensions could not be checked safely/);
 const app=Buffer.from([255,225,0,6,1,2,3,4]),withMetadata=Buffer.concat([Buffer.from([255,216]),app,jpeg(100,200).subarray(2)]);assert.equal((await read(withMetadata)).height,200);
 const badSegment=Buffer.from(withMetadata);badSegment.writeUInt16BE(65535,4);await assert.rejects(()=>read(badSegment),/dimensions could not/);
 const tooMuchMetadata=Buffer.alloc(limits.maxHeaderBytes+100);tooMuchMetadata.set([255,216]);for(let p=2;p+65537<tooMuchMetadata.length;p+=65537){tooMuchMetadata.set([255,225,255,255],p);}await assert.rejects(()=>read(tooMuchMetadata),/dimensions could not/);
 let requested=0;await assert.rejects(()=>inspect({size:1_000_000_000,slice(start,end){assert.equal(start,0);requested=end;return new Blob([Buffer.alloc(end)]);}}),/dimensions could not/);assert.equal(requested,limits.maxHeaderBytes);
 const unreadable={size:100,slice(){return {arrayBuffer(){throw Error('Fixture read failure');}};}};await assert.rejects(()=>inspect(unreadable),/Fixture read failure/);
 // Execute the actual decode entrypoints with decoder traps, not browser stubs.
 let decodes=0,fallbacks=0;const context={inspectImageDimensions:inspect,createImageBitmap(){decodes++;throw Error('Decoder reached');},FileReader:class{constructor(){fallbacks++;}},Error};vm.createContext(context);
 const appSource=fs.readFileSync(path.join(root,'preview/src/app.jsx'),'utf8');vm.runInContext(appSource.slice(appSource.indexOf('async function createBatchPhotoThumbnail('),appSource.indexOf('const HOME_FEATURES=')),context);
 const runtime=fs.readFileSync(path.join(root,'preview/src/local-scanner/runtime.js'),'utf8');vm.runInContext(runtime.slice(runtime.indexOf('export async function scan(')).replace('export async','async'),context);
 for(const name of ['createBatchPhotoThumbnail','scan']){await assert.rejects(()=>context[name](new Blob([png(6000,6000)])),/32 megapixels/);await assert.rejects(()=>context[name](new Blob([Buffer.alloc(40)])),/dimensions could not/);}
 assert.equal(decodes,0);assert.equal(fallbacks,0);
 // Run the actual queue and thumbnail function with controlled decode gates.
 const owners=new Set(),gates=new Map(),started=[],closed=[];let active=0,maxActive=0;
 const queueContext={Promise,DOMException,inspectImageDimensions:async()=>{},createImageBitmap(file){started.push(file.id);active++;maxActive=Math.max(maxActive,active);return new Promise(resolve=>gates.set(file,()=>resolve({width:32,height:48,file,close(){closed.push(file.id);active--;}})));},document:{createElement(){let source;return {getContext(){return {fillStyle:'',fillRect(){},drawImage(image){source=image;}};},toDataURL(){if(source.file.fail)throw Error('Fixture thumbnail error');return source.file.id;}};}}};vm.createContext(queueContext);
 vm.runInContext(appSource.slice(appSource.indexOf('let batchThumbnailTail='),appSource.indexOf('const HOME_FEATURES=')),queueContext);
 const tick=()=>new Promise(resolve=>setImmediate(resolve)),enqueue=file=>{owners.add(file);return queueContext.queueBatchPhotoThumbnail(file,()=>owners.has(file)).then(value=>({value}),error=>({error}));};
 const one={id:'one'},stale={id:'stale'},failure={id:'failure',fail:true},last={id:'last'},q1=enqueue(one),q2=enqueue(stale),q3=enqueue(failure),q4=enqueue(last);
 await tick();assert.deepEqual(started,['one']);const staleJob=vm.runInContext('Array.from(batchThumbnailJobs)',queueContext).find(job=>job.file===stale);
 owners.delete(stale);queueContext.discardObsoleteBatchThumbnails();assert.equal((await q2).error.name,'AbortError');assert.equal(staleJob.file,null);assert.equal(staleJob.ownsFile,null);assert.equal(active,1);
 gates.get(one)();assert.equal((await q1).value,'one');await tick();assert.deepEqual(started,['one','failure']);gates.get(failure)();assert.match((await q3).error.message,/Fixture thumbnail error/);await tick();assert.deepEqual(started,['one','failure','last']);gates.get(last)();assert.equal((await q4).value,'last');await tick();assert.equal(active,0);assert.equal(maxActive,1);assert.deepEqual(closed,['one','failure','last']);
 const inFlight={id:'in-flight'},discardedQueue={id:'discarded-queue'},fresh={id:'fresh'},qa=enqueue(inFlight),qb=enqueue(discardedQueue);await tick();owners.delete(inFlight);owners.delete(discardedQueue);queueContext.discardObsoleteBatchThumbnails();assert.equal((await qa).error.name,'AbortError');assert.equal((await qb).error.name,'AbortError');assert.equal(vm.runInContext('batchThumbnailJobs.size',queueContext),0);const qc=enqueue(fresh);await tick();assert(!started.includes('fresh'),'Active decode must finish disposal before a new one starts');gates.get(inFlight)();await tick();assert(started.includes('fresh'));gates.get(fresh)();assert.equal((await qc).value,'fresh');
 const checkAfter={id:'check-after'},checkBefore={id:'check-before'},qd=enqueue(checkAfter),qe=enqueue(checkBefore);await tick();owners.delete(checkAfter);owners.delete(checkBefore);gates.get(checkAfter)();assert.equal((await qd).error.name,'AbortError');assert.equal((await qe).error.name,'AbortError');assert(!started.includes('check-before'));assert.equal(active,0);assert.equal(maxActive,1);assert.equal(vm.runInContext('batchThumbnailJobs.size',queueContext),0);
 // File-header reads are asynchronous: obsolete selections must never stage.
 const pendingReads=new Map(),staged=[],selection={pendingSelections:{current:new Map()},mounted:{current:true},scanLock:{current:false},saveLock:{current:false},busy:false,epoch:0,liveEpoch:0,MAX_FILE_BYTES:12*1024*1024,MAX_TOTAL_BYTES:80*1024*1024,stagedFiles:{current:Array(20).fill(null)},validationCount:0,errors:{},previews:{}};
 selection.accounts={getSnapshot:()=>({epoch:selection.liveEpoch})};selection.inspectImageDimensions=file=>new Promise((resolve,reject)=>pendingReads.set(file,{resolve,reject}));selection.setValidating=update=>selection.validationCount=update(selection.validationCount);selection.setErrors=update=>selection.errors=update(selection.errors);selection.setPreviewState=update=>selection.previews=update(selection.previews);selection.invalidateWork=clear=>{if(clear!==false)selection.pendingSelections.current.clear();};selection.stageBatchPhoto=(index,file)=>staged.push({index,file});vm.createContext(selection);
 const ui=fs.readFileSync(path.join(root,'preview/src/AiBatchUpload.jsx'),'utf8');vm.runInContext(ui.slice(ui.indexOf(' async function choose('),ui.indexOf(' function remove(')),selection);
 const pick=(index,file)=>selection.choose(index,{target:{files:[file],value:'chosen'}}),old={size:100},newer={size:100},other={size:100};
 const a=pick(0,old),b=pick(0,newer),c=pick(1,other);pendingReads.get(newer).resolve();await b;pendingReads.get(other).resolve();await c;pendingReads.get(old).resolve();await a;assert.deepEqual(staged.map(item=>item.file),[newer,other]);assert.equal(selection.validationCount,0);
 const discarded={size:100},d=pick(2,discarded);selection.invalidateWork();pendingReads.get(discarded).resolve();await d;assert.equal(staged.length,2);
 const switched={size:100},e=pick(2,switched);selection.liveEpoch++;pendingReads.get(switched).resolve();await e;assert.equal(staged.length,2);selection.liveEpoch=0;
 const invalid={size:100},f=pick(2,invalid);pendingReads.get(invalid).reject(Error('Too many pixels'));await f;assert.match(selection.errors[2],/Too many pixels/);assert.equal(staged.length,2);
 selection.stagedFiles.current=Array.from({length:20},(_,i)=>i<6?{file:{size:12*1024*1024}}:null);const almost={size:5*1024*1024},over={size:5*1024*1024},g=pick(6,almost),h=pick(7,over);pendingReads.get(almost).resolve();await g;pendingReads.get(over).resolve();await h;assert.equal(staged.length,3);assert.match(selection.errors[7],/80 MB/);assert.equal(selection.validationCount,0);
 if(process.env.DECK_SAGE_PRIVATE_PHOTOS){for(const name of ['IMG_1213.jpeg','IMG_1211.jpeg','IMG_1210.jpeg']){const filename=path.join(process.env.DECK_SAGE_PRIVATE_PHOTOS,name),size=fs.statSync(filename).size,fd=fs.openSync(filename,'r'),head=Buffer.alloc(Math.min(size,limits.maxHeaderBytes));try{fs.readSync(fd,head,0,head.length,0);}finally{fs.closeSync(fd);}const dimensions=await inspect({size,slice(start,end){return new Blob([head.subarray(start,end)]);}});console.log('PASS private benchmark dimensions',name,dimensions.width+'×'+dimensions.height);}}
 console.log('PASS JPEG/PNG/WebP headers, caps, malformed/unknown formats, bounded reads, immutable bytes, before-decode rejection, stale/concurrent selections, and serialized thumbnail disposal/cancellation/recovery');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
