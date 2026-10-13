const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const built=esbuild.buildSync({stdin:{contents:"export * from './preview/src/providers/commanderDisplayArt';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false});
const loaded={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(loaded,loaded.exports,require);
const {commanderFallbackImage,commanderPrintingImage,createCommanderArtLookup,selectPreferredCommanderPrinting,SCRYFALL_REQUEST_SPACING_MS}=loaded.exports;
let checks=0;const pass=name=>{checks++;console.log('PASS COMMANDER ART '+name);};
const oracle='9307f7e9-bcd9-41f9-88f8-0fb9700a6b12',image=value=>({large:`https://cards.scryfall.io/large/${value}.jpg`,art_crop:`https://cards.scryfall.io/art_crop/${value}.jpg`});
const standard={id:'standard',oracle_id:oracle,name:'Raffine, Scheming Seer',games:['paper'],image_uris:image('standard'),released_at:'2022-01-01'};
const extended={id:'extended',oracle_id:oracle,name:standard.name,games:['paper'],frame_effects:['legendary','extendedart'],image_uris:image('extended'),highres_image:true,released_at:'2023-01-01'};
const full={id:'full',oracle_id:oracle,name:standard.name,games:['paper'],full_art:true,image_uris:image('full'),highres_image:true,released_at:'2021-01-01'};
const wrong={...full,id:'wrong',oracle_id:'wrong-oracle',image_uris:image('wrong')};

assert.equal(selectPreferredCommanderPrinting([standard,extended],oracle,standard.name).printingId,'extended');
pass('extended-art printing is preferred over the standard printing');
assert.equal(selectPreferredCommanderPrinting([extended,full,wrong],oracle,standard.name).printingId,'full');
pass('full-art ranks ahead of extended-art and a different oracle identity is rejected');
assert.equal(selectPreferredCommanderPrinting([standard],oracle,standard.name),null);
pass('a commander without a preferred treatment keeps its standard fallback');
assert.equal(commanderFallbackImage({premiumImageUrl:'premium',imageUrl:'standard',artCropUrl:'crop'}),'premium');
assert.equal(commanderFallbackImage({imageUrl:'standard',artCropUrl:'crop'}),'standard');
assert.equal(commanderFallbackImage({artCropUrl:'crop'}),'');
pass('fallbacks use complete card images and never art crops');
const dfc={id:'dfc',oracle_id:'dfc-oracle',name:'Front // Back',full_art:true,card_faces:[{name:'Front',image_uris:image('front')},{name:'Back',image_uris:image('back')}]};
assert.match(commanderPrintingImage(dfc,'Back'),/back\.jpg$/);
assert.equal(selectPreferredCommanderPrinting([dfc],'dfc-oracle','Back').imageUrl,commanderPrintingImage(dfc,'Back'));
pass('double-faced printings choose the requested face complete-card image');

(async()=>{
 let requests=0,clock=0;const waits=[];
 const lookup=createCommanderArtLookup({spacingMs:SCRYFALL_REQUEST_SPACING_MS,now:()=>clock,wait:async milliseconds=>{waits.push(milliseconds);clock+=milliseconds;},timeoutMs:500,fetchImpl:async url=>{requests++;const query=new URL(url).searchParams.get('q');const chosen=query.includes('Raffine')?[extended]:query.includes('Tymna')?[{...full,id:'tymna-full',oracle_id:'tymna-oracle',name:'Tymna the Weaver'}]:[];return {ok:true,status:200,json:async()=>({data:chosen,has_more:false})};}});
 const card={oracleId:oracle,name:standard.name,imageUrl:'saved-standard'};
 const [first,second,third]=await Promise.all([lookup(card),lookup({...card,imageUrl:'another-owned-print'}),lookup({oracleId:'tymna-oracle',name:'Tymna the Weaver',imageUrl:'tymna-standard'})]);
 assert.equal(first.printingId,'extended');assert.deepEqual(first,second);assert.equal(third.printingId,'tymna-full');assert.equal(requests,2);assert.deepEqual(waits,[SCRYFALL_REQUEST_SPACING_MS]);
 pass('identity cache deduplicates lookups while distinct requests are rate-spaced');
 const failed=createCommanderArtLookup({fetchImpl:async()=>({ok:false,status:503}),timeoutMs:500});
 assert.equal(await failed(card),null);assert.equal(await failed(card),null);
 pass('lookup failure is cached as a safe standard-image fallback');
 console.log(`${checks} commander display-art checks passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
