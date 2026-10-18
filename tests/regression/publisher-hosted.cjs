'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const repo=path.resolve(__dirname,'../..');
const endpoint='https://mihmykgxbneuhlcxolzm.supabase.co/functions/v1/website-publisher';
const api='https://mihmykgxbneuhlcxolzm.supabase.co';
const origin='https://deck-sage.com';
const report={checks:[],startedAt:new Date().toISOString()};
function pass(name){report.checks.push(name);console.log('PASS',name);}
async function json(response){return response.json().catch(()=>({}));}

(async()=>{
 const feed=await fetch(endpoint,{headers:{Origin:origin,Accept:'application/json'}}),feedBody=await json(feed);assert.equal(feed.status,200);assert(Array.isArray(feedBody.items));assert.equal(feed.headers.get('access-control-allow-origin'),origin);pass('Hosted function is configured and returns the public publication feed with exact-origin CORS');
 const deniedOrigin=await fetch(endpoint,{headers:{Origin:'https://example.invalid'}});assert.equal(deniedOrigin.status,403);pass('Hosted function rejects unapproved browser origins');
 const noSession=new FormData();noSession.set('kind','lore');const deniedPublish=await fetch(endpoint,{method:'POST',headers:{Origin:origin},body:noSession});assert.equal(deniedPublish.status,401);assert.match((await json(deniedPublish)).error,/session expired/i);pass('Hosted uploads require a valid bounded publisher session');
 const configText=fs.readFileSync(path.join(repo,'preview/public/account-config.js'),'utf8'),match=/"publishableKey":"([^"]+)"/.exec(configText);assert(match);const key=match[1],headers={apikey:key,Accept:'application/json'};
 const tableRead=await fetch(`${api}/rest/v1/ds_publications?select=id&limit=1`,{headers});assert.equal(tableRead.ok,false);const rpcCall=await fetch(`${api}/rest/v1/rpc/ds_consume_publisher_login_attempt`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({p_key_hash:'0'.repeat(64),p_failed:true})});assert.equal(rpcCall.ok,false);pass('Publishable browser key cannot read publisher tables or invoke the privileged rate-limit RPC');
 report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'publisher-hosted-report.json'),JSON.stringify(report,null,2));
})().catch(error=>{report.failure=error.stack;console.error(error.stack);process.exitCode=1;});
