const assert=require('node:assert/strict');
const path=require('node:path');
const esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..');
const built=esbuild.buildSync({entryPoints:[path.join(root,'supabase/functions/website-daily-news/dailyNewsPolicy.ts')],bundle:true,platform:'node',format:'cjs',write:false});
const moduleValue={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(moduleValue,moduleValue.exports,require);
const policy=moduleValue.exports;

(async()=>{
 assert.equal(policy.DAILY_NEWS_SCHEDULE_UTC,'06:15');
 assert.equal(policy.utcDispatchDate(new Date('2026-10-24T23:59:59.999Z')),'2026-10-24');
 assert.equal(policy.utcDispatchDate(new Date('2026-10-25T00:00:00.000Z')),'2026-10-25');

 const secret='mock-scheduler-secret-with-at-least-32-bytes';
 const request=(body='{"source":"database-cron"}',headers={})=>new Request('https://example.invalid/news',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${secret}`,...headers},body});
 assert.equal(await policy.validSchedulerEnvelope(request(),secret),true);
 assert.equal(await policy.validSchedulerEnvelope(request(undefined,{origin:'https://deck-sage.com'}),secret),false);
 assert.equal(await policy.validSchedulerEnvelope(request(undefined,{authorization:'Bearer incorrect-secret-with-at-least-32-bytes'}),secret),false);
 assert.equal(await policy.validSchedulerEnvelope(request(undefined,{authorization:''}),secret),false);
 assert.equal(await policy.validSchedulerEnvelope(request(),''),false,'a missing production secret fails closed');
 assert.equal(await policy.validSchedulerEnvelope(request(),'short'),false,'an undersized production secret fails closed');
 assert.equal(await policy.validSchedulerEnvelope(request(undefined,{'content-type':'text/plain'}),secret),false);
 assert.equal(await policy.validSchedulerEnvelope(request('{"source":"database-cron","extra":true}'),secret),false);
 assert.equal(await policy.validSchedulerEnvelope(request('x'.repeat(257)),secret),false);

 const existing=await policy.claimDailyAttempt('2026-10-24',{findAttempts:async()=>[{status:'failed'}],begin:async()=>{throw Error('must not retry');}});
 assert.deepEqual(existing,{claimed:false,reason:'A refresh attempt already exists for this UTC day.'});

 let claimed=null,beginCalls=0,arrivals=0;let release;const barrier=new Promise(resolve=>{release=resolve;});
 const dependencies={findAttempts:async()=>{arrivals++;if(arrivals===2)release();await barrier;return [];},begin:async()=>{beginCalls++;if(claimed)return null;claimed='run-1';return claimed;}};
 const [first,second]=await Promise.all([policy.claimDailyAttempt('2026-10-24',dependencies),policy.claimDailyAttempt('2026-10-24',dependencies)]);
 assert.equal([first,second].filter(result=>result.claimed).length,1,'only one concurrent scheduler request claims the UTC day');
 assert.equal([first,second].filter(result=>!result.claimed&&/concurrent/.test(result.reason)).length,1);
 assert.equal(beginCalls,2,'both contenders reach the mocked atomic database claim; only one receives a run id');
 console.log('PASS daily-news bearer auth, scheduler envelope, UTC boundary, replay blocking, and concurrent single-claim policy');
})().catch(error=>{console.error(error);process.exit(1);});
