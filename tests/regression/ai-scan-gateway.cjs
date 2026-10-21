const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {pathToFileURL}=require('node:url');

async function run(){
 const functionDir=path.resolve(__dirname,'../../supabase/functions/website-ai-batch-scan');
 const policyPath=path.join(functionDir,'policy.mjs');
 const indexSource=fs.readFileSync(path.join(functionDir,'index.ts'),'utf8');
 const policySource=fs.readFileSync(policyPath,'utf8');
 const {handleRetiredScan}=await import(pathToFileURL(policyPath).href);
 let handler;
 assert.match(indexSource,/import \{handleRetiredScan\} from '\.\/policy\.mjs';/);
 vm.runInNewContext(indexSource.replace(/import \{handleRetiredScan\} from '\.\/policy\.mjs';/,''),{
  Deno:{serve(value){handler=value;},env:{get(){assert.fail('The retired endpoint must not read secrets or feature flags.');}}},
  handleRetiredScan,
  fetch(){assert.fail('The retired endpoint must not make an outbound request.');},
 });
 assert.equal(handler,handleRetiredScan);
 assert.doesNotMatch(indexSource+policySource,/\bfetch\s*\(|Deno\.env|OPENAI_API_KEY|AI_SCAN_ENABLED|consume_ai_scan_quota|api\.openai\.com|https?:\/\/(?!deck-sage\.com)/);
 assert.doesNotMatch(policySource,/\bimport\b|\bconsole\./);
 console.log('PASS The deployed entrypoint serves only the retirement handler, without model, secret, quota, network, or logging code');

 const endpoint='https://example.test/website-ai-batch-scan';
 const site='https://deck-sage.com';
 const originalFetch=globalThis.fetch;
 globalThis.fetch=()=>assert.fail('The retired endpoint must never call an external service.');
 try{
  for(const body of [undefined,'invalid multipart body','fixture-only-not-a-real-image']){
   const request=new Request(endpoint,{method:'POST',headers:{Origin:site},body});
   const guarded=new Proxy(request,{get(target,key){
    if(key==='method'||key==='headers')return Reflect.get(target,key,target);
    assert.fail(`The retired endpoint must not access request.${String(key)}.`);
   }});
   const response=await handler(guarded);
   assert.equal(response.status,410);
   assert.equal(response.headers.get('Access-Control-Allow-Origin'),site);
   assert.equal(response.headers.get('Content-Type'),'application/json');
   assert.equal(response.headers.get('Cache-Control'),'no-store');
   assert.equal(response.headers.get('Vary'),'Origin');
   const result=await response.json();
   assert.equal(result.code,'SCANNER_RETIRED');
   assert.match(result.error,/Refresh Deck Sage.*on-device scanner.*not processed/);
  }
  console.log('PASS Every accepted-origin POST returns 410 without reading an image, body, or feature switch');

  const preflight=await handler(new Request(endpoint,{method:'OPTIONS',headers:{Origin:site,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}}));
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),site);
  assert.equal(preflight.headers.get('Access-Control-Allow-Methods'),'POST, OPTIONS');
  assert.equal(preflight.headers.get('Access-Control-Allow-Headers'),'content-type');
  assert.equal(await preflight.text(),'');
  console.log('PASS Website preflight remains compatible with cached clients and exposes the 410 response');

  for(const origin of ['', 'null', 'https://example.test', 'https://deck-sage.com.evil.test', 'http://deck-sage.com']){
   for(const method of ['POST','OPTIONS','GET']){
    const response=await handler(new Request(endpoint,{method,headers:origin?{Origin:origin}:{}}));
    assert.equal(response.status,403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
   }
  }
  console.log('PASS Missing, null, untrusted, lookalike, and HTTP origins are rejected without permissive CORS');

  for(const method of ['GET','PUT','DELETE']){
   const response=await handler(new Request(endpoint,{method,headers:{Origin:site}}));
   assert.equal(response.status,405);
   assert.equal(response.headers.get('Allow'),'POST, OPTIONS');
  }
  console.log('PASS Unsupported methods retain safe 405 handling');
 }finally{globalThis.fetch=originalFetch;}
}

run().catch(error=>{console.error(error.stack);process.exitCode=1;});
