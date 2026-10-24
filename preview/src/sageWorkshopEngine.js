import {cardFacts,planFacts,normalizeCanonicalCard} from '../public/canonical-evidence';

const clean=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const count=value=>Math.max(0,Math.floor(Number(value)||0));
const cardKey=card=>card?.oracleId||card?.oracle_id||clean(card?.name);
const sameCard=(left,right)=>Boolean(left&&right&&((cardKey(left)&&cardKey(left)===cardKey(right))||(!left.oracleId&&!left.oracle_id&&!right.oracleId&&!right.oracle_id&&clean(left.name)===clean(right.name))));
const cardsOf=deck=>[...(deck.commanders?.length?deck.commanders:deck.commanderCard?[deck.commanderCard]:[]),...(deck.cards||[])];

export function collectionLocations(state,selected){
 const locations=[];
 for(const [index,row] of (state.bulk||[]).entries())if(sameCard(row,selected))locations.push({kind:'bulk',label:'My bulk',quantity:count(row.quantity),variant:row.cardVariant||'Normal',index,owned:true});
 for(const deck of (state.decks||[]).filter(deck=>deck.status!=='deleted')){
  const planned=Boolean(deck.isDraft),rows=cardsOf(deck).filter(row=>sameCard(row,selected));
  const quantity=rows.reduce((sum,row)=>sum+count(row.quantity||1),0);
  if(quantity)locations.push({kind:planned?'planned':'deck',label:deck.name,deckId:deck.id,quantity,variant:[...new Set(rows.map(row=>row.cardVariant||'Normal'))].join(', '),owned:!planned});
 }
 return {locations,ownedCopies:locations.filter(row=>row.owned).reduce((sum,row)=>sum+row.quantity,0),plannedCopies:locations.filter(row=>!row.owned).reduce((sum,row)=>sum+row.quantity,0),bulkRows:locations.filter(row=>row.kind==='bulk')};
}

export function presentCardHomes(result,state,selected){
 const inventory=collectionLocations(state,selected);
 const decks=new Map((state.decks||[]).filter(deck=>deck.status!=='deleted').map(deck=>[deck.id,deck]));
 const destinations=(result?.results||[]).map(item=>{
  const deck=decks.get(item.deckId),planned=Boolean(deck?.isDraft),hasCommander=Boolean(deck&&(deck.commanders?.length||deck.commanderCard));
  const invalid=!deck?'This deck is no longer available.':!hasCommander?'A command zone is required before color identity or fit can be verified.':item.verdict==='Not legal for commander colors'?item.summary:item.verdict==='Already in deck'?'Commander singleton rules make another same-name copy invalid unless the card explicitly allows more.':'';
  return {...item,deck,planned,invalid,eligible:!invalid&&!planned&&item.score>=10,reviewOnly:planned&&!invalid};
 }).sort((a,b)=>Number(Boolean(a.invalid))-Number(Boolean(b.invalid))||b.score-a.score);
 return {...inventory,selected,result,destinations,promising:destinations.filter(item=>item.eligible).slice(0,4),planned:destinations.filter(item=>item.reviewOnly).slice(0,3)};
}

const textOf=card=>String(card?.oracleText??card?.oracle_text??'').toLowerCase();
const typeOf=card=>String(card?.typeLine??card?.type_line??'').toLowerCase();
const has=(card,pattern)=>pattern.test(textOf(card));
const named=(cards,predicate,limit=3)=>cards.filter(predicate).slice(0,limit).map(card=>card.name);
const unique=values=>[...new Set(values.filter(Boolean))];

const axes={
 air:{label:'Air pressure',plan:'Flying creatures and evasive combat can make ground defenses irrelevant.',answer:'Instant-speed creature answers, sweepers, or real flying/reach blockers.',detect:(cards,plans,commander)=>/flying/.test(textOf(commander))||cards.filter(card=>/flying/.test(textOf(card))||card.keywords?.includes('Flying')).length>=8},
 tokens:{label:'Token board',plan:'Repeated token production can widen the board and multiply payoffs.',answer:'Sweepers and early removal for the token engine matter more than raw removal totals.',detect:(cards,plans)=>plans.tokens},
 artifacts:{label:'Artifact engine',plan:'Artifacts may act as mana, bodies, sacrifice material, or a linked value engine.',answer:'Artifact interaction is most useful before an engine pays back its setup cost.',detect:(cards,plans)=>plans.artifacts},
 graveyard:{label:'Graveyard reuse',plan:'The graveyard may function as a renewable resource rather than a discard pile.',answer:'Graveyard exile and exile-based permanent answers interrupt recursion more cleanly than destruction.',detect:(cards,plans)=>plans.graveyard},
 sacrifice:{label:'Sacrifice value',plan:'Sacrifice outlets can turn removal or expendable bodies into value.',answer:'Answer the payoff or outlet before priority returns; exile can matter when recursion is present.',detect:(cards,plans)=>plans.sacrifice},
 spells:{label:'Spell chaining',plan:'A dense instant-and-sorcery plan may build value from casting and copying spells.',answer:'Cheap countermagic, tax effects, and pressure on the engine are more relevant than slow sorcery answers.',detect:(cards,plans)=>plans.spellslinger},
 enchantments:{label:'Enchantment engine',plan:'Persistent enchantments may carry the deck\'s resource engine.',answer:'Enchantment removal and flexible permanent answers keep the engine from compounding.',detect:(cards,plans)=>plans.enchantments},
 counters:{label:'Growing threats',plan:'+1/+1 counters can turn modest creatures into a fast scaling board.',answer:'Bounce, exile, or a well-timed sweeper can erase accumulated investment.',detect:cards=>cards.filter(card=>/\+1\/\+1 counter/.test(textOf(card))).length>=5}
};

export function buildOpponentProfile({commanders=[],seedDeck=null,seedCards=[],generatedAt=new Date().toISOString()}){
 const zone=commanders.filter(Boolean).map(normalizeCanonicalCard),resolved=seedCards.filter(Boolean).map(normalizeCanonicalCard),cards=resolved.length?resolved:zone;
 if(!zone.length)return {status:'insufficient',reason:'Choose at least one opposing commander.'};
 const synthetic={commanders:zone,cards:resolved.filter(card=>!zone.some(commander=>sameCard(commander,card)))},plans=planFacts(synthetic),detected=Object.entries(axes).filter(([,axis])=>axis.detect(cards,plans,zone[0])).map(([id,axis])=>({id,...axis}));
 const source=seedDeck?{type:'official-example',label:`Official example list: ${seedDeck.name}`,date:seedDeck.sourceDate||seedDeck.releaseDate||generatedAt.slice(0,10),url:seedDeck.officialSourceUrl||seedDeck.sourceUrl,catalogUrl:seedDeck.sourceUrl,confidence:'Example-backed, not a metagame claim'}:{type:'commander-rules',label:'Commander rules-text inference',date:generatedAt.slice(0,10),url:'https://magic.wizards.com/en/formats/commander',confidence:'Low confidence — many different 99-card builds are possible'};
 if(!detected.length)return {status:'insufficient',commanders:zone,source,reason:'The available commander rules and example-list evidence do not establish a specific plan. Sage will not invent one.'};
 return {status:'ready',commanders:zone,source,axes:detected,summary:`${zone.map(card=>card.name).join(' + ')} suggests ${detected.slice(0,3).map(axis=>axis.label.toLowerCase()).join(', ')}. Treat these as plans to prepare for, not a prediction of the hidden 99.`,threats:detected.map(axis=>axis.plan),counterplay:detected.map(axis=>axis.answer),multipleBuilds:seedDeck?'This official list is one documented build. The opponent may be playing a different shell.':'Commander text is the only build evidence. The hidden 99 may support a very different plan.'};
}

function answerSignals(cards){
 const signal=(label,predicate)=>({label,cards:named(cards,predicate,4)}),instant=card=>/instant/.test(typeOf(card))||/flash/.test(textOf(card));
 return {
  air:signal('answers at flying speed',card=>(instant(card)&&cardFacts(card).interaction)||/\bflying\b|\breach\b/.test(textOf(card))),
  tokens:signal('clears a wide board',card=>cardFacts(card).wipe),
  artifacts:signal('removes artifacts',card=>/destroy target artifact|exile target artifact|artifact or enchantment/.test(textOf(card))),
  graveyard:signal('exiles graveyards or recursive pieces',card=>/exile all cards from|exile target card from a graveyard|exile up to .* cards? from .* graveyard|players? can.t cast spells? from graveyards/.test(textOf(card))||/exile target (?:creature|permanent)/.test(textOf(card))),
  sacrifice:signal('interrupts outlets or payoffs',card=>(instant(card)&&/exile target (?:creature|permanent)|counter target activated ability|return target creature/.test(textOf(card)))),
  spells:signal('interacts on the stack or taxes casting',card=>/counter target spell|spells? (?:cost|your opponents cast).* more|each opponent can.t cast/.test(textOf(card))),
  enchantments:signal('removes enchantments',card=>/destroy target enchantment|exile target enchantment|artifact or enchantment/.test(textOf(card))),
  counters:signal('resets accumulated counters',card=>cardFacts(card).wipe||/return target creature|exile target creature/.test(textOf(card)))
 };
}

export function rankDecksForOpponent(profile,decks){
 if(profile?.status!=='ready')return {status:'insufficient',reason:profile?.reason||'Opponent evidence is incomplete.',rankings:[]};
 const actual=(decks||[]).filter(deck=>deck.status!=='deleted'&&!deck.isDraft&&String(deck.format||'Commander').toLowerCase()==='commander');
 if(!actual.length)return {status:'no-decks',reason:'No owned Commander decks are available to compare. Planned decks are kept separate.',rankings:[]};
 const rankings=actual.map(deck=>{
  const cards=cardsOf(deck).flatMap(card=>Array.from({length:Math.min(count(card.quantity||1),4)},()=>normalizeCanonicalCard(card))),signals=answerSignals(cards),matches=[];
  let score=0;
  for(const axis of profile.axes){const hit=signals[axis.id];if(hit?.cards.length){const contribution=Math.min(20,8+hit.cards.length*4);score+=contribution;matches.push({axis:axis.label,label:hit.label,cards:hit.cards,contribution});}else matches.push({axis:axis.label,label:'No clearly relevant answer found in the saved list',cards:[],contribution:0});}
  const resilience=named(cards,card=>cardFacts(card).protection||/return .* from your graveyard|indestructible/.test(textOf(card)),3);if(resilience.length)score+=Math.min(10,4+resilience.length*2);
  const plan=planFacts(deck),conflicts=[];
  if(profile.axes.some(axis=>axis.id==='tokens')&&plan.combat&&!plan.tokens&&!signals.tokens.cards.length)conflicts.push('A creature-combat plan may struggle if the opponent establishes a wider board first.');
  if(profile.axes.some(axis=>axis.id==='graveyard')&&plan.graveyard&&!signals.graveyard.cards.length)conflicts.push('This deck also leans on its graveyard but shows no clear way to break opposing recursion.');
  const covered=matches.filter(match=>match.cards.length).length,coverage=covered/profile.axes.length;
  return {deckId:deck.id,deckName:deck.name,commander:deck.commander,score:score-profile.axes.length*4,coverage,matched:matches.filter(match=>match.cards.length),missing:matches.filter(match=>!match.cards.length).map(match=>match.axis),resilience,conflicts,summary:covered?`${covered} of ${profile.axes.length} evidenced pressure points have relevant answers in this saved list.`:'No saved card clearly answers the inferred pressure points.'};
 }).sort((a,b)=>b.score-a.score||b.coverage-a.coverage||a.deckName.localeCompare(b.deckName));
 const best=rankings[0],ties=rankings.filter(item=>item.score===best.score&&item.coverage===best.coverage);
 return {status:best.coverage===0?'insufficient':'ready',reason:best.coverage===0?'None of the saved lists contains a clearly relevant answer to the inferred plan. Sage will not name a best deck.':'',rankings,tie:ties.length>1};
}

export const sageWorkshopRules={sameCard,axes};
