const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..');

function load(entry){
 const built=esbuild.buildSync({stdin:{contents:`export * from './${entry}';`,resolveDir:root},bundle:true,platform:'node',format:'cjs',write:false});
 const value={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(value,value.exports,require);return value.exports;
}

(async()=>{
 const model=load('preview/src/model.js'),primary={name:'Alpha',oracleId:'alpha'},partner={name:'Beta',oracleId:'beta'},companion={name:'Gamma',oracleId:'gamma'};
 assert.equal(model.addInventory([{...primary,quantity:9999}],primary,1)[0].quantity,9999,'inventory additions keep the documented quantity ceiling');
 const owned=model.ownedCards({bulk:[],decks:[{cards:[],basicLands:{},commanderCard:primary,commanders:[{...primary,role:'primary'},{...partner,role:'partner'},{...companion,role:'companion'}]}]});
 assert.deepEqual(owned.map(card=>card.name),['Alpha','Beta','Gamma'],'every distinct saved command-zone or companion card remains owned');
 assert.throws(()=>model.parseDecklist('x'.repeat(100001)),/100,000 characters/);
 assert.throws(()=>model.parseDecklist('x'.repeat(501)),/500 characters/);

 globalThis.DECK_SAGE_PUBLISHER={enabled:true,endpoint:'https://publisher.invalid/feed'};
 const responses=[];globalThis.fetch=()=>new Promise(resolve=>responses.push(resolve));
 const publications=load('preview/src/publishedContent.js'),older=publications.loadPublishedContent(),newer=publications.loadPublishedContent({force:true});
 responses[1](new Response(JSON.stringify({items:[{id:'new',kind:'lore',title:'Fresh'}]}),{status:200,headers:{'content-type':'application/json'}}));
 await newer;
 responses[0](new Response(JSON.stringify({items:[{id:'old',kind:'lore',title:'Stale'}]}),{status:200,headers:{'content-type':'application/json'}}));
 assert.equal((await older).lore[0].title,'Fresh');
 assert.equal((await publications.loadPublishedContent()).lore[0].title,'Fresh','an older request cannot overwrite a forced refresh');

 let terminated=0;globalThis.location={origin:'https://deck-sage.invalid'};globalThis.Worker=class{postMessage(){}terminate(){terminated++;}};
 const cards=load('preview/src/providers/staticCards.js');
 await assert.rejects(()=>cards.cardRequest('/api/status',{timeoutMs:10}),/took too long/);
 assert.equal(terminated,1,'a stalled card worker is reset after the bounded timeout');

 const workshop=load('preview/src/sageWorkshopEngine.js'),legend=(name,color,text='Whenever you attack, create a 1/1 creature token.')=>({name,oracleId:name.toLowerCase(),typeLine:'Legendary Creature — Sage',oracleText:text,colorIdentity:[color],legalities:{commander:'legal'}});
 const invalid=workshop.buildOpponentProfile({commanders:[legend('Alpha Sage','W'),legend('Beta Sage','U')]});
 assert.equal(invalid.status,'insufficient');assert.match(invalid.reason,/compatible Partner, Background, or Doctor/);

 const news=fs.readFileSync(path.join(root,'supabase/functions/website-daily-news/index.ts'),'utf8');
 const newsPolicy=fs.readFileSync(path.join(root,'supabase/functions/website-daily-news/dailyNewsPolicy.ts'),'utf8');
 assert(news.includes("redirect:'manual'"));assert(news.includes('candidate.hostname===configured.hostname'));assert(news.includes('MAX_SOURCE_BYTES=2_000_000'));assert(news.includes('validSchedulerEnvelope(req,schedulerSecret)'));assert(news.includes("Deno.env.get('DAILY_NEWS_SCHEDULER_SECRET')"));assert(newsPolicy.includes('constantTimeEqual'));assert(newsPolicy.includes('A refresh attempt already exists for this UTC day.'));assert(newsPolicy.includes('MAX_SCHEDULER_BODY_BYTES=256'));
 const app=fs.readFileSync(path.join(root,'preview/src/app.jsx'),'utf8');assert.equal((app.match(/<main\b/g)||[]).length,1,'the SPA exposes one main landmark');assert(app.includes('mainRef.current?.focus({preventScroll:true})'));assert(app.includes('This page could not be found'));
 for(const file of ['BulkDeckDiscoveryPage.jsx','CardValuePage.jsx','SageWorkshop.jsx'])assert(!fs.readFileSync(path.join(root,'preview/src',file),'utf8').includes('<main'),'feature pages do not nest main landmarks: '+file);
 console.log('PASS hardening contracts: inventory bounds/ownership, import limits, publication ordering, worker timeout, command-zone validation, and bounded same-host news fetching');
})().catch(error=>{console.error(error);process.exit(1);});
