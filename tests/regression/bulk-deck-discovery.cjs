const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const built=esbuild.buildSync({stdin:{contents:"export * from './preview/src/bulkDeckDiscovery';export {baseState} from './preview/src/model';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false});
const loaded={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(loaded,loaded.exports,require);
const {buildBulkDeckProposal,applyBulkDeckProposal,validateCommandZone,commanderCopyLimit,baseState}=loaded.exports;
let checks=0;const pass=name=>{checks++;console.log('PASS BULK DISCOVERY '+name);};
const card=(name,overrides={})=>({name,oracleId:'oracle-'+name.toLowerCase().replace(/\W+/g,'-'),quantity:1,cardVariant:'Normal',typeLine:'Creature — Elf',oracleText:'',colorIdentity:['G'],legalities:{commander:'legal'},prices:{usd:'1.25'},...overrides});
const leader=(name='Marwyn, the Nurturer',overrides={})=>card(name,{typeLine:'Legendary Creature — Elf Druid',oracleText:'Whenever another Elf enters, put a +1/+1 counter on Marwyn. {T}: Add an amount of {G}.',...overrides});
const pool=(bulk,bucket='direct_synergy')=>bulk.map(value=>({card:value,assignedBucket:bucket,reasons:['Shared Elf plan']}));
const catalog=(count,colors=['G'])=>Array.from({length:count},(_,index)=>card('Catalog '+index,{oracleId:'catalog-'+index,colorIdentity:colors,typeLine:index%5===0?'Land':'Creature — Elf'}));

{
 const commander=leader(),cards49=Array.from({length:48},(_,index)=>card('Elf 49 '+index)),bulk49=[commander,...cards49],below=buildBulkDeckProposal({commandZone:[commander],bulk:bulk49,poolCards:pool(cards49),catalogCards:catalog(80)});
 assert.equal(below.ownedSlots,49);assert.equal(below.status,'below_threshold');
 const extra=card('Threshold Elf'),bulk50=[...bulk49,extra],qualified=buildBulkDeckProposal({commandZone:[commander],bulk:bulk50,poolCards:pool([...cards49,extra]),catalogCards:catalog(80)});
 assert.equal(qualified.ownedSlots,50);assert.equal(qualified.status,'qualified');assert.equal(qualified.plannedCount,100);assert.equal(qualified.complete,true);pass('threshold is exact at 49/50 and a qualified plan contains exactly 100 slots');
}
{
 const commander=leader(),forest=card('Forest',{typeLine:'Basic Land — Forest',quantity:500}),proposal=buildBulkDeckProposal({commandZone:[commander],bulk:[commander,forest],poolCards:pool([forest]),catalogCards:catalog(80)});
 assert.equal(proposal.ownedSlots,38);assert.equal(proposal.status,'below_threshold');assert.equal(proposal.allocations.find(item=>item.name==='Forest').quantity,37);pass('large basic-land piles cannot manufacture a 50-card hit or exceed the planned land floor');
}
{
 const commander=leader(),ring=card('Sol Ring',{typeLine:'Artifact',quantity:70,colorIdentity:[]}),wrong=card('Wrong Color',{colorIdentity:['U'],quantity:20}),proposal=buildBulkDeckProposal({commandZone:[commander],bulk:[commander,ring,wrong],poolCards:pool([ring,wrong]),catalogCards:catalog(90)});
 assert.equal(proposal.allocations.find(item=>item.name==='Sol Ring').quantity,1);assert.equal(proposal.allocations.some(item=>item.name==='Wrong Color'),false);assert.equal(proposal.ownedSlots,2);pass('singleton and color identity rules reject duplicate and off-color padding');
}
{
 const commander=leader(),rats=card('Relentless Rats',{typeLine:'Creature — Rat',oracleText:'A deck can have any number of cards named Relentless Rats.',colorIdentity:['B'],quantity:60}),blackLeader=leader('Rat King',{colorIdentity:['B']}),proposal=buildBulkDeckProposal({commandZone:[blackLeader],bulk:[blackLeader,rats],poolCards:pool([rats]),catalogCards:catalog(50,['B'])});
 assert.equal(commanderCopyLimit(rats),Infinity);assert.equal(proposal.ownedSlots,61);assert.equal(proposal.status,'qualified');pass('Oracle copy-limit exceptions use genuinely owned copies without applying the ordinary singleton cap');
}
{
 const left=leader('Alpha Partner',{oracleText:'Partner',colorIdentity:['G']}),right=leader('Beta Partner',{oracleText:'Partner',colorIdentity:['U']}),cards=Array.from({length:98},(_,index)=>card('GU Card '+index,{colorIdentity:index%2?['G']:['U']})),proposal=buildBulkDeckProposal({commandZone:[left,right],bulk:[left,right,...cards],poolCards:pool(cards),catalogCards:[]});
 assert.equal(validateCommandZone([left,right]).ok,true);assert.deepEqual(proposal.identity,['G','U']);assert.equal(proposal.ownedSlots,100);assert.equal(proposal.plannedCount,100);assert.equal(proposal.complete,true);pass('two owned Partners plus 98 legal unique cards form an exact 100-card proposal with combined identity');
}
{
 const lead=leader('Background Seeker',{oracleText:'Choose a Background',colorIdentity:['G']}),background=card('Blue Study',{typeLine:'Legendary Enchantment — Background',colorIdentity:['U']}),bad=leader('Unrelated Legend',{colorIdentity:['U']});assert.equal(validateCommandZone([lead,background]).ok,true);assert.equal(validateCommandZone([lead,bad]).ok,false);pass('Background and incompatible paired command zones are distinguished');
}
{
 const left=leader('Dustin, Gadget Genius',{oracleText:'Friends forever',colorIdentity:['U']}),right=leader('Lucas, the Sharpshooter',{oracleText:'Friends forever',colorIdentity:['R']});assert.equal(validateCommandZone([left,right]).ok,true);pass('Friends forever is accepted as its shared paired-command-zone variant');
}
{
 const commander=leader('Seven Leader',{colorIdentity:['B']}),seven=card('Sevenfold Shadow',{colorIdentity:['B'],quantity:20,oracleText:'A deck can have up to seven cards named Sevenfold Shadow.'}),proposal=buildBulkDeckProposal({commandZone:[commander],bulk:[commander,seven],poolCards:pool([seven]),catalogCards:catalog(90,['B'])});assert.equal(commanderCopyLimit(seven),7);assert.equal(proposal.allocations.find(item=>item.name==='Sevenfold Shadow').quantity,7);assert.equal(proposal.plannedCount,100);assert.equal(proposal.complete,true);pass('numeric Oracle copy exceptions cap owned movement and still produce exactly 100 slots');
}
{
 const commander=leader('Legal Leader'),banned=card('Banned Candidate',{quantity:60,legalities:{commander:'banned'}}),{legalities,...normalizedPoolCard}=banned,proposal=buildBulkDeckProposal({commandZone:[commander],bulk:[commander,banned],poolCards:pool([normalizedPoolCard]),catalogCards:catalog(80)});assert.equal(proposal.ownedSlots,1);assert.equal(proposal.allocations.some(item=>item.name==='Banned Candidate'),false);assert.equal(validateCommandZone([leader('Banned Leader',{legalities:{commander:'banned'}})]).ok,false);pass('original inventory legality blocks banned cards even when the app pool normalization omits legality metadata');
}
{
 const fixtures=[['go-wide','Create two 1/1 green creature tokens. Creatures you control get +1/+1.',['tokens','token_payoff']],['spellslinger','Whenever you cast an instant or sorcery spell, copy it.',['instant_sorcery_spell','spell_copy']],['Voltron','Whenever an Aura becomes attached to this creature, it gets +2/+2.',['creature_aura','voltron_scaling']],['graveyard','You may cast creature cards from your graveyard.',['recursion','creature_death']]];
 for(const [archetype,oracleText,features] of fixtures){const commander=leader(archetype+' Leader',{oracleText}),owned=Array.from({length:49},(_,index)=>card(archetype+' Card '+index,{oracleText})),poolCards=owned.map(value=>({card:value,assignedBucket:'direct_synergy',reasons:['Matches the commander engine'],features:{strategyFeatures:features}})),proposal=buildBulkDeckProposal({commandZone:[commander],bulk:[commander,...owned],poolCards,catalogCards:catalog(80)});assert.equal(proposal.status,'qualified');assert.equal(proposal.strategy.archetype,archetype);assert.match(proposal.strategy.headline,new RegExp(archetype,'i'));assert(proposal.strategy.evidence.length>0);assert(proposal.gaps.length>0);}
 pass('go-wide, spellslinger, Voltron, and graveyard fixtures expose strategy, evidence, and role gaps');
}
{
 const commander=leader('Foil Leader',{cardVariant:'Foil',setName:'Exact Set',collectorNumber:'7'}),owned=Array.from({length:49},(_,index)=>card('Owned '+index,{cardVariant:index===0?'Foil':'Normal'})),bulk=[commander,...owned],proposalA=buildBulkDeckProposal({commandZone:[commander],bulk,poolCards:pool(owned),catalogCards:catalog(80)}),proposalB=buildBulkDeckProposal({commandZone:[commander],bulk,poolCards:pool(owned.slice().reverse()),catalogCards:catalog(80)});assert.equal(bulk.length,50);assert.equal(proposalA.status,'qualified');assert.equal(proposalB.status,'qualified');
 const state=baseState();state.bulk=bulk;const before=state.bulk.reduce((sum,item)=>sum+item.quantity,0),created=applyBulkDeckProposal(state,proposalA,{deckId:'deck-one',operationId:'operation-one',now:'2026-10-18T00:00:00.000Z'}),after=created.bulk.reduce((sum,item)=>sum+item.quantity,0),deck=created.decks[0];assert.equal(before-after,proposalA.ownedSlots);assert.equal(deck.commanderCard.name,commander.name);assert.equal(deck.commanderCard.cardVariant,'Foil');assert.equal(deck.commanderCard.setName,'Exact Set');assert.equal(deck.cards.find(item=>item.name==='Owned 0').cardVariant,'Foil');assert.equal(deck.bulkDiscoveryProposal.plannedCards.length>0,true);assert(deck.bulkDiscoveryProposal.movedPrintings.some(item=>item.name===commander.name&&item.card.cardVariant==='Foil'));assert.equal(applyBulkDeckProposal(created,proposalA,{deckId:'deck-one',operationId:'operation-one'}),created);assert.equal(state.bulk.length,50);pass('overlapping previews are read-only, confirmation conserves inventory and exact printings, and repeated operation application is idempotent');
 assert.throws(()=>applyBulkDeckProposal({...state,bulk:state.bulk.filter(item=>item.name!=='Owned 0')},proposalA,{deckId:'deck-two',operationId:'operation-two'}),/Bulk changed before confirmation/);pass('revalidation prevents stale or insufficient inventory from creating a deck');
}
{
 const commander=leader('Unowned Leader'),owned=Array.from({length:50},(_,index)=>card('Owned Shell '+index)),proposal=buildBulkDeckProposal({commandZone:[commander],bulk:owned,poolCards:pool(owned),catalogCards:catalog(80)});assert.equal(proposal.status,'qualified');assert.equal(proposal.commandZone[0].owned,false);assert.equal(proposal.missingCards.some(item=>item.name==='Unowned Leader'),true);
 assert(proposal.purchaseSummary.unknownPrices>0);pass('an unowned commander is labeled unowned and missing prices remain unknown rather than zero');
}
console.log(checks+' bulk discovery checks passed.');
