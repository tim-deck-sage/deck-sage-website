'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const esbuild=require('esbuild');
const repo=path.resolve(__dirname,'../..'),report={checks:[],startedAt:new Date().toISOString()};
function pass(name){report.checks.push(name);console.log('PASS',name);}

(async()=>{
 const policy=await import(pathToFileURL(path.join(repo,'supabase/functions/website-publisher/policy.mjs')));
 assert.equal(policy.validPinConfiguration('1234'),true);assert.equal(policy.validPinConfiguration('12345'),false);assert.equal(policy.validPinConfiguration('abcd'),false);assert(policy.constantTimeEqual('2468','2468'));assert(!policy.constantTimeEqual('2468','2469'));assert.equal(policy.SESSION_MS,15*60*1000);
 pass('Publisher PIN policy is exactly four digits and sessions are bounded to fifteen minutes');

 const jpg=Uint8Array.from([0xff,0xd8,0xff,1]),png=Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),webp=Uint8Array.from(Buffer.from('RIFFxxxxWEBP')),mp3=Uint8Array.from(Buffer.from('ID3track')),m4a=Uint8Array.from(Buffer.from('xxxxftypM4A ')),ogg=Uint8Array.from(Buffer.from('OggSdata')),wav=Uint8Array.from(Buffer.from('RIFFxxxxWAVE'));
 assert.equal(policy.imageKind(jpg).extension,'jpg');assert.equal(policy.imageKind(png).extension,'png');assert.equal(policy.imageKind(webp).extension,'webp');assert.equal(policy.imageKind(Uint8Array.from([1,2,3])),null);
 assert.equal(policy.audioKind(mp3).extension,'mp3');assert.equal(policy.audioKind(m4a).extension,'m4a');assert.equal(policy.audioKind(ogg).extension,'ogg');assert.equal(policy.audioKind(wav).extension,'wav');assert.equal(policy.audioKind(Uint8Array.from([1,2,3])),null);assert.equal(policy.MAX_ARTWORK_BYTES,4*1024*1024);assert.equal(policy.MAX_AUDIO_BYTES,6*1024*1024);
 pass('Artwork and audio formats are verified by bytes with clear 4 MB and 6 MB bounds');

 assert.equal(policy.validateFields({kind:'lore',title:'  A Story ',commanderName:'  Tim  ',body:'A complete commander story long enough.'}).value.title,'A Story');assert.match(policy.validateFields({kind:'lore',title:'Title',body:'short'}).error,/20 characters/);const song=policy.validateFields({kind:'song',title:'Theme',categories:[]}).value;assert.deepEqual(song.categories,['fan-favorites']);assert.equal(policy.validateFields({kind:'other',title:'No'}).error,'Choose Lore or Song.');
 pass('Lore and song metadata normalize predictably and default songs to one visible collection');

 const sql=fs.readFileSync(path.join(repo,'supabase/migrations/20261018224320_publisher_content.sql'),'utf8'),edge=fs.readFileSync(path.join(repo,'supabase/functions/website-publisher/index.ts'),'utf8'),config=fs.readFileSync(path.join(repo,'supabase/config.toml'),'utf8'),client=fs.readFileSync(path.join(repo,'preview/public/publisher-config.js'),'utf8'),html=fs.readFileSync(path.join(repo,'preview/public/index.html'),'utf8');
 for(const table of ['ds_publications','ds_publisher_sessions','ds_publisher_login_attempts'])assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
 assert.match(sql,/revoke all on function public\.ds_consume_publisher_login_attempt\(text, boolean, timestamptz\) from public, anon, authenticated/);assert.match(sql,/grant execute on function public\.ds_consume_publisher_login_attempt\(text, boolean, timestamptz\) to service_role/);assert.match(sql,/if not p_failed then[\s\S]*delete from public\.ds_publisher_login_attempts/);assert(!/grant (insert|update|delete)[^;]+to (anon|authenticated)/i.test(sql));assert.match(sql,/true,\s*\n\s*6291456/);assert.match(config,/\[functions\.website-publisher\][\s\S]*verify_jwt = false/);assert.match(client,/enabled:true/);assert.match(html,/img-src 'self' blob:/);assert.match(html,/media-src 'self' blob:/);
 pass('Migration keeps browser roles read-only, storage writes server-only, and the shipped client enabled');

 assert.match(edge,/ds_consume_publisher_login_attempt/);assert.match(edge,/p_failed:!pinMatches/);assert.match(edge,/PUBLISHER_ENABLED/);assert.match(edge,/ds_publisher_sessions/);assert.match(edge,/operation_id/);assert.match(edge,/rollback\(active\.client,uploaded\)/);assert.match(edge,/requestBytes\(req,MAX_REQUEST_BYTES\)/);assert.match(edge,/requestBytes\(req,MAX_JSON_BYTES\)/);assert.match(edge,/createClient\} from 'npm:@supabase\/supabase-js@2\.117\.3'/);assert(!/username/i.test(edge));assert(!/console\.(log|info).*pin/i.test(edge));await esbuild.transform(edge,{loader:'ts',target:'es2022'});
 pass('Edge Function parses, pins its dependency, rate-limits server-side, rolls back partial media, and has no username-admin path');

 report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'publisher-policy-report.json'),JSON.stringify(report,null,2));
})().catch(error=>{report.failure=error.stack;console.error(error.stack);process.exitCode=1;});
