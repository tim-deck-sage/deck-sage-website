const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),esbuild=require('esbuild');
async function main(){
 const workers=[];class FakeWorker{constructor(){this.terminated=false;workers.push(this);}postMessage(message){this.message=message;}terminate(){this.terminated=true;}}
 const context={module:{exports:{}},Worker:FakeWorker,WebAssembly,OffscreenCanvas:class{},createImageBitmap(){},crypto:require('node:crypto').webcrypto,DOMException,URL};vm.createContext(context);
 vm.runInContext(esbuild.transformSync(fs.readFileSync(path.resolve(__dirname,'../../preview/src/aiScan.js'),'utf8'),{format:'cjs',loader:'js'}).code,context);
 const api=context.module.exports,first=api.scanAiPhoto({file:'old'}),firstRejected=assert.rejects(first,{name:'AbortError'}),staleResult=workers[0].onmessage,staleError=workers[0].onerror;
 api.releaseLocalScanner();await firstRejected;assert(workers[0].terminated);assert.equal(workers[0].onmessage,null);assert.equal(workers[0].onerror,null);
 const second=api.scanAiPhoto({file:'new'});staleResult({data:{type:'result',result:'WRONG'}});staleError({});assert.equal(workers[1].terminated,false);workers[1].onmessage({data:{type:'result',result:'new'}});assert.equal(await second,'new');
 // Reused-worker handlers also belong to one task, not a global pending slot.
 const secondHandler=workers[1].onmessage,third=api.scanAiPhoto({file:'third'});assert.equal(workers.length,2);secondHandler({data:{type:'result',result:'WRONG AGAIN'}});workers[1].onmessage({data:{type:'result',result:'third'}});assert.equal(await third,'third');
 api.releaseLocalScanner();const fourth=api.scanAiPhoto({file:'error'}),fourthRejected=assert.rejects(fourth,/could not start or ran out of memory/);workers[2].onerror({});await fourthRejected;assert(workers[2].terminated);
 console.log('PASS cancellation and stale worker/task events cannot settle or terminate replacement scans');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
