'use strict';
const crypto=require('node:crypto');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {normalize,stableId,validatePrevious,refresh}=require('../../preview/tools/refresh-precon-catalog.cjs');
const row={name:'Test Partners',code:'TST',fileName:'TestPartners_TST',type:'Commander Deck',releaseDate:'2026-10-22'};
const card=(name,count,id,extra={})=>({name,count,identifiers:{scryfallId:id,scryfallOracleId:id},colorIdentity:['U'],...extra});
const payload={meta:{date:'2026-10-21',version:'test'},data:{...row,commander:[card('Partner A',1,'a'),card('Partner B',1,'b')],displayCommander:[card('Display only',1,'x')],mainBoard:[card('Island',98,'c')],sideBoard:[]}};
const now=new Date('2026-10-21T23:59:59.999Z');
const d=normalize(row,payload,now);assert.equal(d.cardCount,100);assert.deepEqual(d.commanders,['Partner A','Partner B']);assert.equal(d.cards.length,3);assert.equal(d.status,'upcoming');assert.equal(normalize(row,payload,new Date('2026-10-22T00:00:00Z')).status,'released');
assert.equal(stableId(row),stableId({...row,fileName:'test_partners_TST'}));
const dfc=structuredClone(payload);dfc.data.mainBoard=[card('Face A // Face B',98,'c',{side:'a'}),card('Face A // Face B',98,'c',{side:'b'})];assert.equal(normalize(row,dfc,now).cardCount,100);
for(const qty of [0,-1,1.5,97,99]){const p=structuredClone(payload);p.data.mainBoard[0].count=qty;assert.throws(()=>normalize(row,p,now));}
const missing=structuredClone(payload);delete missing.data.mainBoard[0].identifiers;assert.throws(()=>normalize(row,missing,now),/Scryfall/);
const duplicate=structuredClone(payload);duplicate.data.mainBoard=[card('Partner A',98,'a')];assert.throws(()=>normalize(row,duplicate,now),/duplicated/);
assert.throws(()=>validatePrevious({schemaVersion:1,decks:[{id:'old',name:'Old Deck'}],coverage:{listedDecks:2}},{decks:[],coverage:{listedDecks:2}}),/missing/);
assert.throws(()=>validatePrevious({schemaVersion:1,sourceDate:'2026-10-21',decks:[],coverage:{listedDecks:2}},{sourceDate:'2026-10-20',decks:[],coverage:{listedDecks:2}}),/older/);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'precon-test-'));fs.writeFileSync(path.join(dir,'catalog.json'),'last known good');
(async()=>{
 await assert.rejects(refresh({output:dir,get:async()=>{throw Error('outage');}}),/outage/);assert.equal(fs.readFileSync(path.join(dir,'catalog.json'),'utf8'),'last known good');
 await assert.rejects(refresh({output:dir,get:async()=>({data:[]})}),/collapsed/);assert.equal(fs.readFileSync(path.join(dir,'catalog.json'),'utf8'),'last known good');
 const root=path.resolve(__dirname,'../../preview/public/precon-data'),catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
 assert.equal(catalog.schemaVersion,1);assert(catalog.decks.length>=150);assert.equal(new Set(catalog.decks.map(d=>d.id)).size,catalog.decks.length);
 for(const summary of catalog.decks){const deck=JSON.parse(fs.readFileSync(path.join(root,summary.file),'utf8'));assert.equal(deck.id,summary.id);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,summary.file))).digest('hex'),summary.sha256);assert.equal(deck.cards.filter(c=>c.role!=='sideboard').reduce((n,c)=>n+c.quantity,0),100);assert(deck.cards.every(c=>c.scryfallId&&c.oracleId&&Number.isInteger(c.quantity)&&c.quantity>0));assert.equal(deck.validation.complete,true);}
 assert(fs.existsSync(path.join(root,'LICENSE.txt')));assert.match(fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/nextjs.yml'),'utf8'),/node preview\/tools\/refresh-precon-catalog.cjs/);
 fs.rmSync(dir,{recursive:true,force:true});
 const fresh=fs.mkdtempSync(path.join(os.tmpdir(),'precon-update-'));
 const rows=Array.from({length:150},(_,i)=>({...row,name:'Deck '+i,fileName:'Deck'+i}));
 const filler=Array.from({length:851},()=>({type:'Secret Lair Drop'}));
 const get=async url=>{if(url.endsWith('DeckList.json.gz'))return {meta:{date:'2026-10-21'},data:[...rows,...filler]};const n=Number(url.match(/Deck(\d+)\.json/)[1]);const p=structuredClone(payload);p.data={...p.data,...rows.find(r=>r.fileName==='Deck'+n)};return p;};
 await refresh({output:fresh,get,now});let snapshot=fs.readFileSync(path.join(fresh,'catalog.json'),'utf8');assert.equal(JSON.parse(snapshot).decks.length,150);
 rows.push({...row,name:'Deck 150',fileName:'Deck150'});await refresh({output:fresh,get,now});snapshot=fs.readFileSync(path.join(fresh,'catalog.json'),'utf8');assert.equal(JSON.parse(snapshot).decks.length,151);
 rows.push(rows[0]);await assert.rejects(refresh({output:fresh,get,now}),/Duplicate deck identity/);assert.equal(fs.readFileSync(path.join(fresh,'catalog.json'),'utf8'),snapshot);rows.pop();rows.shift();
 await assert.rejects(refresh({output:fresh,get,now}),/mismatch|missing/);assert.equal(fs.readFileSync(path.join(fresh,'catalog.json'),'utf8'),snapshot);
 fs.rmSync(fresh,{recursive:true,force:true});console.log('PASS precon stable IDs, partner grouping, UTC releases, face dedup, malformed lists, outage preservation, coverage and complete snapshot');
})().catch(e=>{console.error(e);process.exitCode=1;});
