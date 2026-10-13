const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

async function run(){
 const policyPath=path.resolve(__dirname,'../../supabase/functions/website-ai-batch-scan/policy.mjs');
 const {gatewayAvailability}=await import(pathToFileURL(policyPath).href);
 const mockKey='fixture-only-not-a-real-secret';

 assert.deepEqual(gatewayAvailability(undefined,mockKey),{status:503,error:'AI Scan is disabled.'});
 assert.deepEqual(gatewayAvailability('false',mockKey),{status:503,error:'AI Scan is disabled.'});
 assert.deepEqual(gatewayAvailability('TRUE',mockKey),{status:503,error:'AI Scan is disabled.'});
 console.log('PASS Missing, false, and non-exact enable values block a request even when an API key exists');

 assert.deepEqual(gatewayAvailability('true',''),{status:503,error:'AI Scan is not configured.'});
 console.log('PASS Enabling the gateway without an API key remains blocked');

 assert.equal(gatewayAvailability('true',mockKey),null);
 console.log('PASS Only an exact true enable value plus an API key admits gateway processing');
}

run().catch(error=>{console.error(error.stack);process.exitCode=1;});
