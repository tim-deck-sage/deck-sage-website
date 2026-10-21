import {emptyLands,positive,compactCard} from './model';

const COLORS=['W','U','B','R','G'];
const BASIC_BY_COLOR={W:'Plains',U:'Island',B:'Swamp',R:'Mountain',G:'Forest'};
const NUMBER_WORDS={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
const normalized=value=>String(value||'').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const identityOf=card=>Array.from(new Set((card?.colorIdentity||card?.color_identity||[]).filter(color=>COLORS.includes(color)))).sort();
const rulesOf=card=>String(card?.oracleText??card?.oracle_text??'');
const typeOf=card=>String(card?.typeLine??card?.type_line??'');
const functionalId=card=>card?.oracleId?`oracle:${String(card.oracleId).toLowerCase()}`:card?.oracle_id?`oracle:${String(card.oracle_id).toLowerCase()}`:`name:${normalized(card?.name)}`;
const isBasic=card=>/\bbasic\s+(?:snow\s+)?land\b/i.test(typeOf(card))||['plains','island','swamp','mountain','forest','wastes'].includes(normalized(card?.name));
const isLand=card=>/\bland\b/i.test(typeOf(card));
const commanderLegal=card=>{
 const legality=card?.legalities?.commander;
 return legality===undefined||legality===null||legality==='legal';
};
const isCommanderCard=card=>commanderLegal(card)&&(/\blegendary\b/i.test(typeOf(card))&&(/\bcreature\b/i.test(typeOf(card))||(/\b(?:vehicle|spacecraft)\b/i.test(typeOf(card))&&card?.power!==undefined))||/\bcan be your commander\b/i.test(rulesOf(card)));
const subset=(child,parent)=>child.every(color=>parent.includes(color));

export function commanderCopyLimit(card){
 if(isBasic(card))return Infinity;
 const text=rulesOf(card).toLowerCase();
 if(/a deck can have any number of cards named/.test(text))return Infinity;
 const match=text.match(/a deck can have up to (one|two|three|four|five|six|seven|eight|nine|ten|\d+) cards named/);
 if(match)return NUMBER_WORDS[match[1]]||Number(match[1])||1;
 return 1;
}

function partnerKind(card){
 const text=rulesOf(card),lower=text.toLowerCase(),type=typeOf(card).toLowerCase();
 const withMatch=text.match(/partner with ([^\n.(]+)/i);
 const namedMatch=text.match(/partner\s*[—-]\s*([^\n.]+)/i);
 if(/\bchoose a background\b/i.test(text))return {kind:'background_lead'};
 if(/\bdoctor's companion\b/i.test(text))return {kind:'doctor_companion'};
 if(/\bfriends forever\b/i.test(text)||card?.keywords?.some(value=>String(value).toLowerCase()==='friends forever'))return {kind:'friends_forever'};
 if(/\blegendary\b/.test(type)&&/\bbackground\b/.test(type))return {kind:'background'};
 if(/\blegendary\b/.test(type)&&/\btime lord doctor\b/.test(type)&&!/\btime lord doctor\s+\w+/i.test(type))return {kind:'doctor'};
 if(withMatch)return {kind:'with',value:normalized(withMatch[1])};
 if(namedMatch)return {kind:'named',value:normalized(namedMatch[1])};
 if(/(?:^|\n)partner(?:\s|$|\()/i.test(text)||card?.keywords?.some(value=>String(value).toLowerCase()==='partner'))return {kind:'partner'};
 return {kind:'none'};
}

export function validateCommandZone(cards){
 const zone=(cards||[]).filter(Boolean);
 if(zone.length<1||zone.length>2)return {ok:false,reason:'Choose one commander or one legal two-card command zone.'};
 if(zone.some(card=>!isCommanderCard(card)&&partnerKind(card).kind!=='background'))return {ok:false,reason:'Every command-zone card must be eligible to be a commander.'};
 if(zone.some(card=>!commanderLegal(card)))return {ok:false,reason:'A command-zone card is not Commander legal in the local rules snapshot.'};
 if(zone.length===1){if(partnerKind(zone[0]).kind==='background')return {ok:false,reason:'A Background needs a commander with Choose a Background.'};return {ok:true,identity:identityOf(zone[0]),roles:['primary']};}
 const [left,right]=zone,a=partnerKind(left),b=partnerKind(right);let ok=false,roles=['primary','partner'];
 if(a.kind==='partner'&&b.kind==='partner')ok=true;
 if(a.kind==='friends_forever'&&b.kind==='friends_forever')ok=true;
 if(a.kind==='named'&&b.kind==='named'&&a.value===b.value)ok=true;
 if(a.kind==='with'&&b.kind==='with'&&a.value===normalized(right.name)&&b.value===normalized(left.name))ok=true;
 if((a.kind==='background_lead'&&b.kind==='background')||(b.kind==='background_lead'&&a.kind==='background')){ok=true;roles=a.kind==='background_lead'?['primary','background']:['background','primary'];}
 if((a.kind==='doctor_companion'&&b.kind==='doctor')||(b.kind==='doctor_companion'&&a.kind==='doctor')){ok=true;roles=a.kind==='doctor_companion'?['companion','doctor']:['doctor','companion'];}
 if(!ok)return {ok:false,reason:'These cards do not share a compatible Partner, Background, or Doctor pairing rule.'};
 return {ok:true,identity:Array.from(new Set([...identityOf(left),...identityOf(right)])).sort(),roles};
}

function inventoryRows(bulk){
 return (bulk||[]).map((card,index)=>({card,index,key:[functionalId(card),card.cardVariant||'Normal',card.setName||'',card.collectorNumber||'',index].join('|'),remaining:positive(card.quantity)}));
}
function findRows(rows,card){
 const id=functionalId(card),name=normalized(card.name);
 return rows.filter(row=>row.remaining>0&&(functionalId(row.card)===id||normalized(row.card.name)===name));
}
function take(rows,card,count,kind,allocations){
 let remaining=count;
 for(const row of findRows(rows,card)){
  const quantity=Math.min(remaining,row.remaining);if(!quantity)continue;
  row.remaining-=quantity;remaining-=quantity;allocations.push({sourceKey:row.key,sourceIndex:row.index,quantity,kind,name:row.card.name,card:{...compactCard(row.card),quantity}});if(!remaining)break;
 }
 return count-remaining;
}
function price(card){const value=card?.prices?.usd;return value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;}
function uniqueCards(cards){const seen=new Set();return (cards||[]).filter(card=>{if(!card?.name)return false;const id=functionalId(card);if(seen.has(id))return false;seen.add(id);return true;});}
function roleLabel(bucket){return ({direct_synergy:'commander synergy',indirect_engine:'engine support',ramp_fixing:'ramp and fixing',draw:'card advantage',interaction:'interaction',protection:'protection',payoff_finisher:'finishers',utility_land:'utility lands',uncertain:'review-worthy support'})[bucket]||bucket;}
function inferArchetype(commandZone,pool){
 const commanderText=commandZone.map(card=>rulesOf(card).toLowerCase()).join(' '),counts={goWide:0,spellslinger:0,voltron:0,graveyard:0};
 if(/create[^.]*token|creatures? (?:you control )?(?:get|have)|enters? (?:the battlefield )?under your control/.test(commanderText))counts.goWide+=4;
 if(/instant|sorcery|noncreature spell|magecraft|cast or copy/.test(commanderText))counts.spellslinger+=4;
 if(/aura|equipment|equipped|enchanted|commander damage/.test(commanderText))counts.voltron+=4;
 if(/graveyard|dies|discard|sacrifice|from your graveyard/.test(commanderText))counts.graveyard+=4;
 for(const item of pool){const features=item.features?.strategyFeatures||[],weight=Math.max(1,positive(item.card?.quantity));for(const feature of features){if(/token|creature_entry|tribal_lord/.test(feature))counts.goWide+=weight;if(/spell|instant_sorcery|cantrip|countermagic/.test(feature))counts.spellslinger+=weight;if(/aura|equipment|attachment|voltron/.test(feature))counts.voltron+=weight;if(/graveyard|recursion|creature_death|sacrifice|expendable_body/.test(feature))counts.graveyard+=weight;}}
 const [key,score]=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0],labels={goWide:'go-wide',spellslinger:'spellslinger',voltron:'Voltron',graveyard:'graveyard'};
 return score>0?labels[key]:'commander-led value';
}

export function buildBulkDeckProposal({commandZone,bulk,poolCards=[],catalogCards=[],name,now=new Date().toISOString(),minimumOwned=50}){
 const rows=inventoryRows(bulk),resolvedCommandZone=commandZone.map(card=>findRows(rows,card)[0]?.card||card),zone=validateCommandZone(resolvedCommandZone);if(!zone.ok)return {status:'invalid',reason:zone.reason};
 const allocations=[],commanders=[];let ownedSlots=0;
 resolvedCommandZone.forEach((card,index)=>{const before=allocations.length,owned=take(rows,card,1,'commander',allocations),ownedCard=allocations.slice(before).find(Boolean)?.card;ownedSlots+=owned;commanders.push({...compactCard(ownedCard||card),quantity:1,role:zone.roles[index]||(!index?'primary':'partner'),owned:Boolean(owned)});});
 const commandIds=new Set(resolvedCommandZone.map(functionalId)),usedNames=new Set(resolvedCommandZone.map(card=>normalized(card.name))),libraryTarget=100-resolvedCommandZone.length,landTarget=37;
 const chosen=[],basicLands=emptyLands(),pool=poolCards.map(item=>item.card?item:{card:item,assignedBucket:'uncertain',reasons:[]});let chosenSlots=0;
 let namedLandCount=0;
 for(const item of pool){const candidate=item.card,card=findRows(rows,candidate)[0]?.card||candidate;if(!card?.name||commandIds.has(functionalId(card))||usedNames.has(normalized(card.name))||isBasic(card)||!commanderLegal(card)||!subset(identityOf(card),zone.identity))continue;const limit=Math.min(commanderCopyLimit(card),libraryTarget-chosenSlots),available=findRows(rows,card).reduce((sum,row)=>sum+row.remaining,0),quantity=Math.min(available,limit);if(!quantity)continue;const before=allocations.length,got=take(rows,card,quantity,'library',allocations);if(!got)continue;for(const allocation of allocations.slice(before))chosen.push({...allocation.card,owned:true,proposalBucket:item.assignedBucket,proposalReasons:item.reasons||[]});chosenSlots+=got;ownedSlots+=got;usedNames.add(normalized(card.name));if(isLand(card))namedLandCount+=got;}
 const allowedBasics=zone.identity.length?zone.identity.map(color=>BASIC_BY_COLOR[color]):['Wastes'];
 let basicNeed=Math.max(0,landTarget-namedLandCount);
 for(const basicName of allowedBasics){const matching=rows.filter(row=>row.remaining>0&&normalized(row.card.name)===normalized(basicName));for(const row of matching){const open=libraryTarget-chosenSlots-Object.values(basicLands).reduce((a,b)=>a+b,0);if(!basicNeed||!open)break;const count=Math.min(row.remaining,basicNeed,open),got=take(rows,row.card,count,'basic',allocations);basicLands[basicName]+=got;basicNeed-=got;ownedSlots+=got;}}
 const archetype=inferArchetype(resolvedCommandZone,pool),proposalCards=[...chosen.map(card=>({...card,owned:true}))];
 const catalog=uniqueCards(catalogCards).filter(card=>!usedNames.has(normalized(card.name))&&!isBasic(card)&&commanderLegal(card)&&subset(identityOf(card),zone.identity));
 const plannedBasics={...basicLands};let basicCount=Object.values(plannedBasics).reduce((a,b)=>a+b,0),plannedCount=proposalCards.reduce((sum,card)=>sum+positive(card.quantity),0)+basicCount;
 for(const card of catalog){if(plannedCount>=libraryTarget)break;const land=isLand(card),nextNamed=namedLandCount+(land?1:0),reservedBasics=Math.max(0,landTarget-nextNamed-basicCount);if(plannedCount+1+reservedBasics>libraryTarget)continue;proposalCards.push({...compactCard(card),quantity:1,owned:false});usedNames.add(normalized(card.name));plannedCount+=1;if(land)namedLandCount=nextNamed;}
 let colorIndex=0;while(plannedCount<libraryTarget&&namedLandCount+basicCount<landTarget){const basic=allowedBasics[colorIndex++%allowedBasics.length];plannedBasics[basic]+=1;basicCount+=1;plannedCount+=1;}
 for(const card of catalog){if(plannedCount>=libraryTarget)break;if(usedNames.has(normalized(card.name)))continue;proposalCards.push({...compactCard(card),quantity:1,owned:false});usedNames.add(normalized(card.name));plannedCount+=1;}
 while(plannedCount<libraryTarget){const basic=allowedBasics[colorIndex++%allowedBasics.length];plannedBasics[basic]+=1;basicCount+=1;plannedCount+=1;}
 const missingCards=[...commanders.filter(card=>!card.owned).map(card=>({...card,price:price(card)})),...proposalCards.filter(card=>!card.owned).map(card=>({...card,price:price(card)}))];
 for(const basicName of allowedBasics){const missing=Math.max(0,plannedBasics[basicName]-basicLands[basicName]);if(missing)missingCards.push({name:basicName,typeLine:`Basic Land — ${basicName}`,colorIdentity:basicName==='Wastes'?[]:[Object.entries(BASIC_BY_COLOR).find(([,value])=>value===basicName)?.[0]].filter(Boolean),quantity:missing,owned:false,price:null,basic:true});}
 const bucketCounts={};for(const card of chosen)bucketCounts[card.proposalBucket]=(bucketCounts[card.proposalBucket]||0)+positive(card.quantity);
 const strong=Object.entries(bucketCounts).sort((a,b)=>b[1]-a[1]).slice(0,3);
 const gaps=['ramp_fixing','draw','interaction','protection'].filter(bucket=>(bucketCounts[bucket]||0)<({ramp_fixing:6,draw:5,interaction:5,protection:3})[bucket]).map(bucket=>`${roleLabel(bucket)}: ${bucketCounts[bucket]||0} owned candidates found`);
 if(basicNeed>0)gaps.push(`${basicNeed} of the planned ${landTarget} land slots are not currently represented by owned legal basics or selected lands.`);
 const totalPrice=missingCards.reduce((sum,card)=>sum+(card.price===null?0:card.price*positive(card.quantity)),0),unknownPrices=missingCards.reduce((sum,card)=>sum+(card.price===null?positive(card.quantity):0),0);
 const complete=plannedCount===libraryTarget;
 return {status:ownedSlots>=minimumOwned?'qualified':'below_threshold',threshold:minimumOwned,ownedSlots,totalSlots:100,coverage:ownedSlots/100,complete,commandZone:commanders,identity:zone.identity,name:name?.trim()||`${resolvedCommandZone.map(card=>card.name).join(' + ')} - bulk discovery`,ownedCards:chosen,basicLands,plannedCards:proposalCards,plannedBasicLands:plannedBasics,allocations,missingCards,purchaseSummary:{knownTotal:totalPrice,unknownPrices},strategy:{archetype,headline:strong.length?`Shape this as a ${archetype} deck with ${strong.map(([bucket])=>roleLabel(bucket)).join(', ')}.`:`The ${archetype} direction needs more owned evidence before it is coherent.`,evidence:strong.map(([bucket,count])=>`${count} owned ${roleLabel(bucket)} ${count===1?'card':'cards'}`)},gaps,generatedAt:now,libraryTarget,plannedCount:plannedCount+resolvedCommandZone.length};
}

export function applyBulkDeckProposal(state,proposal,{deckId,operationId,now=new Date().toISOString()}={}){
 if(proposal?.status!=='qualified')throw Error('This proposal has not reached the 50-owned-card threshold.');
 if(!proposal.complete||proposal.plannedCount!==100)throw Error('The reviewed proposal is not a complete 100-card plan.');
 if(!deckId||!operationId)throw Error('A stable deck and operation ID are required.');
 if(state.decks.some(deck=>deck.creationOperationId===operationId||deck.id===deckId))return state;
 const bulk=state.bulk.map(card=>({...card}));
 for(const allocation of proposal.allocations){let index=allocation.sourceIndex,row=bulk[index];const expected=allocation.sourceKey.split('|').slice(0,4).join('|'),actual=row?[functionalId(row),row.cardVariant||'Normal',row.setName||'',row.collectorNumber||''].join('|'):'';if(actual!==expected)index=bulk.findIndex(card=>[functionalId(card),card.cardVariant||'Normal',card.setName||'',card.collectorNumber||''].join('|')===expected&&positive(card.quantity)>=allocation.quantity);if(index<0||positive(bulk[index].quantity)<allocation.quantity)throw Error(`Bulk changed before confirmation: ${allocation.name} no longer has the reviewed copies.`);bulk[index]={...bulk[index],quantity:positive(bulk[index].quantity)-allocation.quantity};}
 const remainingBulk=bulk.filter(card=>Number(card.quantity)>0),commanders=proposal.commandZone.map(card=>{const {owned,...rest}=card;return rest;}),primary=commanders.find(card=>card.role==='primary')||commanders[0],movedPrintings=proposal.allocations.map(({sourceKey,sourceIndex,...allocation})=>allocation);
 const deck={id:deckId,name:proposal.name,format:'Commander',commander:commanders.map(card=>card.name).join(' + '),commanderCard:primary,commanders,playstyle:'balanced',cards:proposal.ownedCards.map(card=>{const {owned,proposalBucket,proposalReasons,...rest}=card;return rest;}),basicLands:{...emptyLands(),...proposal.basicLands},notes:`Created from My Bulk with ${proposal.ownedSlots}/100 owned legal slots. Review the saved proposal before purchasing missing cards.`,status:'active',createdAt:now,updatedAt:now,creationOperationId:operationId,bulkDiscoveryProposal:{version:1,ownedSlots:proposal.ownedSlots,totalSlots:100,identity:proposal.identity,strategy:proposal.strategy,gaps:proposal.gaps,plannedCards:proposal.plannedCards.map(compactCard),plannedBasicLands:proposal.plannedBasicLands,missingCards:proposal.missingCards.map(compactCard),purchaseSummary:proposal.purchaseSummary,movedPrintings,generatedAt:proposal.generatedAt}};
 return {...state,bulk:remainingBulk,decks:[...state.decks,deck]};
}

export const bulkDeckRules={functionalId,isBasic,isLand,isCommanderCard,identityOf,normalized};
