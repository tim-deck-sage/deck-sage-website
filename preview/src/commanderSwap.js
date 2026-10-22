import {analyzeDeck} from '../source/app/utils/commander/deckAnalysisCore';
import {analyzeDeckBalance} from '../source/app/utils/deckBalanceAnalysis';
import {classifyCandidateCard} from '../source/app/utils/bulkCandidatePool/cardFeatureClassifier';
import {buildCommanderProfile} from '../source/app/utils/bulkCandidatePool/commanderProfile';
import {detectKnownCombos} from '../source/app/utils/commander/comboSignals';
import {validateCommandZone,bulkDeckRules,commanderCopyLimit} from './bulkDeckDiscovery';

const {functionalId,identityOf,isLand}=bulkDeckRules;
const quantity=c=>Math.max(0,Math.min(200,Math.floor(Number(c.quantity??1)||0)));
const normalize=c=>({...c,oracleText:c.oracleText||c.oracle_text||'',typeLine:c.typeLine||c.type_line||'',colorIdentity:identityOf(c),quantity:quantity(c)});
export const swapCommanders=deck=>(deck.commanders?.length?deck.commanders:deck.commanderCard?[deck.commanderCard]:[]).filter(c=>c.role!=='companion'||/doctor['’]s companion/i.test(c.oracleText||''));
// Each relation requires an expressed commander ability and concrete shell support.
// Creature types, popularity, combo counts and color overlap contribute no points.
const RELATIONS=[
 ['spell engine',['instant_sorcery_demand','noncreature_spell_demand','cast_copy_demand'],['cantrip','efficient_spell','spell_reuse','spell_copy','spell_token_engine'],5],
 ['Aura engine',['aura_demand','aura_tutor_demand'],['creature_aura','beneficial_aura','aura_tutor','aura_cast_value','aura_recursion'],5],
 ['blink / enters engine',['blink_demand','etb_demand'],['etb_value','blink_target','repeatable_blink','trigger_enhancer'],5],
 ['token conversion',['tokens'],['token_payoff','sacrifice','creature_death','damage_conversion'],4],
 ['sacrifice / death engine',['sacrifice','creature_death','expendable_body_demand'],['tokens','expendable_body','recursion','creature_death'],4],
 ['graveyard engine',['graveyard_engine'],['recursion','creature_death','expendable_body'],3],
 ['counter engine',['plus_counters','minus_counters','proliferate'],['plus_counters','minus_counters','proliferate'],3],
 ['mana conversion',['mana_engine'],['untap','mana_sink','power_matters'],4],
 ['activated engine',['tap_ability'],['untap','activation_support','haste'],3],
];

function engineFit(zone,rows,balance){
 const evidence=[],covered=new Set();let score=0;
 for(const commander of zone){
  const profile=buildCommanderProfile(normalize(commander)),text=normalize(commander).oracleText.toLowerCase();
  const addRelation=(label,hits,weight)=>{const distinct=[...new Map(hits.map(r=>[functionalId(r.card),r])).values()];if(distinct.length<2)return;const points=Math.min(6,distinct.length)*weight;score+=points;evidence.push({commander:commander.name,label,cards:distinct.slice(0,5).map(r=>r.card.name),count:distinct.length,points});distinct.forEach(r=>covered.add(functionalId(r.card)));};
  if(/tokens? would be created|twice that many[^.]*tokens?/i.test(text))addRelation('token multiplication',rows.filter(r=>r.features.strategyFeatures.includes('tokens')),6);
  if(/landfall|whenever a land enters|whenever a land you control enters/i.test(text))addRelation('landfall support',rows.filter(r=>/search your library[^.]*land|additional land|return[^.]*land[^.]*battlefield/i.test(r.card.oracleText)),5);
  if(/whenever you cast an enchantment|whenever an enchantment[^.]*enters/i.test(text))addRelation('enchantment triggers',rows.filter(r=>/enchantment/i.test(r.card.typeLine)),5);
  if(/whenever (?:you cast an? artifact|an? artifact[^.]*enters)/i.test(text))addRelation('artifact triggers',rows.filter(r=>/artifact/i.test(r.card.typeLine)),5);
  for(const [label,demand,support,weight] of RELATIONS){
   if(!demand.some(x=>profile.strategyFeatures.includes(x)))continue;
   let hits=rows.filter(r=>support.some(x=>r.features.strategyFeatures.includes(x)));
   // Counter polarities are not interchangeable.
   if(label==='counter engine')hits=hits.filter(r=>r.features.strategyFeatures.includes('proliferate')||profile.strategyFeatures.includes('proliferate')||['plus_counters','minus_counters'].some(x=>profile.strategyFeatures.includes(x)&&r.features.strategyFeatures.includes(x)));
   const distinct=[...new Map(hits.map(r=>[functionalId(r.card),r])).values()];
   if(distinct.length<2)continue;
   const points=Math.min(6,distinct.length)*weight;
   // A second commander sharing an engine does not double-count all of its support.
   const fresh=distinct.filter(r=>!covered.has(functionalId(r.card))).length;
   score+=points*(fresh?Math.max(.35,fresh/distinct.length):.25);
   distinct.forEach(r=>covered.add(functionalId(r.card)));
   evidence.push({commander:commander.name,label,cards:distinct.slice(0,5).map(r=>r.card.name),count:distinct.length,points});
  }
  // Direct mana amplification is tested against actual nonland mana producers.
  if(/whenever you tap a nonland permanent for mana/.test(text)){
   const hits=rows.filter(r=>!isLand(r.card)&&/\{t\}[^.]*:\s*add\b/i.test(r.card.oracleText));
   if(hits.length>=2){score+=Math.min(6,hits.length)*6;evidence.push({commander:commander.name,label:'extra mana from your nonland mana producers',cards:hits.slice(0,5).map(r=>r.card.name),count:hits.length,points:Math.min(6,hits.length)*6});hits.forEach(r=>covered.add(functionalId(r.card)));}
  }
 }
 if(evidence.length){
  const draw=zone.some(c=>/draw (?:a|two|three|\w+) cards?/i.test(c.oracleText||'')),ramp=zone.some(c=>/\badd \{|cost[^.]*less to cast/i.test(c.oracleText||''));
  if(draw&&balance.drawCount<8)score+=3;
  if(ramp&&balance.rampCount<10)score+=3;
 }
 return {score:Math.round(score*10)/10,evidence,covered};
}

export function swapPlan(deck,zone){
 const validation=validateCommandZone(zone);if(!validation.ok)return {ok:false,reason:validation.reason};
 const old=swapCommanders(deck),ids=new Set(zone.map(functionalId)),oldIds=new Set(old.map(functionalId));
 const shell=(deck.cards||[]).filter(c=>!oldIds.has(functionalId(c))),promoted=shell.filter(c=>ids.has(functionalId(c)));
 const remaining=shell.filter(c=>!ids.has(functionalId(c)));
 const invalid=remaining.filter(c=>!identityOf(c).every(x=>validation.identity.includes(x))).map(c=>({name:c.name,quantity:quantity(c)}));
 const basicColors={Plains:'W',Island:'U',Swamp:'B',Mountain:'R',Forest:'G'};
 for(const [name,n] of Object.entries(deck.basicLands||{}))if(n>0&&basicColors[name]&&!validation.identity.includes(basicColors[name]))invalid.push({name,quantity:Number(n)});
 const total=remaining.reduce((n,c)=>n+quantity(c),0)+Object.values(deck.basicLands||{}).reduce((n,v)=>n+Math.max(0,Number(v)||0),0)+zone.length;
 const removedOld=old.filter(c=>!ids.has(functionalId(c))),promotedCopies=promoted.reduce((n,c)=>n+quantity(c),0),countChange=100-total;
 const illegal=remaining.filter(c=>c.legalities?.commander&&c.legalities.commander!=='legal').map(c=>c.name);
 const unknown=remaining.filter(c=>!Array.isArray(c.colorIdentity)&&!Array.isArray(c.color_identity)||!c.legalities?.commander).map(c=>c.name);
 const totals=new Map();for(const c of remaining){const key=functionalId(c),entry=totals.get(key)||{card:c,total:0};entry.total+=quantity(c);totals.set(key,entry);}
 const duplicates=[...totals.values()].filter(e=>e.total>commanderCopyLimit(e.card)).map(e=>e.card.name);
 const sourceDuplicates=(deck.cards||[]).filter(c=>oldIds.has(functionalId(c))).map(c=>c.name);
 const companion=(deck.commanders||[]).some(c=>c.role==='companion'&&!/doctor['’]s companion/i.test(c.oracleText||''));
 const oldIdentity=[...new Set(old.flatMap(identityOf))],newColors=validation.identity.filter(c=>!oldIdentity.includes(c));
 return {ok:true,identity:validation.identity,newColors,invalid,illegal,unknown,duplicates,sourceDuplicates,promoted:promoted.map(c=>c.name),promotedCopies,removedOld:removedOld.map(c=>c.name),total,countChange,companion,dropIn:invalid.length===0&&newColors.length===0&&illegal.length===0&&unknown.length===0&&duplicates.length===0&&sourceDuplicates.length===0&&!companion&&countChange===0&&promotedCopies<=zone.length};
}

export function recommendCommanderSwaps(deck,catalog,{limit=12,mode='all'}={}){
 const all=[...new Map((catalog||[]).filter(c=>c.status==='legal'&&c.legalities?.commander==='legal').map(c=>[functionalId(c),normalize(c)])).values()];
 const lookup=new Map(all.map(c=>[functionalId(c),c])),old=swapCommanders(deck).map(c=>lookup.get(functionalId(c))||normalize(c));
 const current=validateCommandZone(old);
 if(!current.ok)return {notice:'Resolve the current command zone first: '+current.reason,recommendations:[]};
 const oldIds=new Set(old.map(functionalId)),shell=(deck.cards||[]).filter(c=>!oldIds.has(functionalId(c))).map(normalize),expanded=shell.flatMap(c=>Array.from({length:quantity(c)},()=>c));
 const balance=analyzeDeckBalance({name:deck.name,cards:shell,commanders:[],basicLands:deck.basicLands||{},targetSize:100}),analysis=analyzeDeck(expanded);
 const rows=shell.filter(c=>!isLand(c)).map(card=>({card,features:classifyCandidateCard({...card,functionalId:functionalId(card)})}));
 const baseline=engineFit(old,rows,balance),named=rows.length;
 const commanderSignals=detectKnownCombos(new Set([...old,...expanded].map(c=>c.name.trim().toLowerCase()))).filter(signal=>signal.pieces.some(name=>old.some(c=>c.name===name)));
 const summary={namedCards:named,total:expanded.length+Object.values(deck.basicLands||{}).reduce((n,v)=>n+(Number(v)||0),0),averageCmc:balance.averageCmc,ramp:balance.rampCount,draw:balance.drawCount,engines:baseline.evidence,winConditions:analysis.taggedCards.filter(c=>c.tags.includes('finisher')||c.tags.includes('comboPiece')).map(c=>c.name).slice(0,8),planSignals:balance.planSignals};
 if(named<20)return {notice:'Sage needs at least 20 named nonland shell cards before comparing commanders. Complete the list for a meaningful estimate.',summary,recommendations:[],baseline};
 const zones=all.filter(c=>validateCommandZone([c]).ok).map(c=>[c]),pairable=all.filter(c=>/partner|friends forever|background|time lord doctor/i.test(c.oracleText+' '+c.typeLine));
 for(let i=0;i<pairable.length;i++)for(let j=i+1;j<pairable.length;j++)if(validateCommandZone([pairable[i],pairable[j]]).ok)zones.push([pairable[i],pairable[j]]);
 const recommendations=[];
 for(const zone of zones){
  if(zone.length===old.length&&zone.every(c=>oldIds.has(functionalId(c))))continue;
  const plan=swapPlan(deck,zone),ids=new Set(zone.map(functionalId)),candidateRows=rows.filter(r=>!ids.has(functionalId(r.card)));
  const fit=engineFit(zone,candidateRows,balance);if(!fit.evidence.length)continue;
  const lost=baseline.evidence.filter(e=>!fit.evidence.some(f=>f.label===e.label));
  const dependent=rows.filter(r=>old.some(c=>!ids.has(functionalId(c))&&r.card.oracleText.toLowerCase().includes(c.name.toLowerCase())));
  const availableNames=new Set([...candidateRows.map(r=>r.card.name),...shell.filter(isLand).map(c=>c.name),...zone.map(c=>c.name)]);
  const lostSignals=commanderSignals.filter(signal=>!signal.pieces.every(name=>availableNames.has(name)));
  const dependencyPenalty=lost.reduce((n,e)=>n+Math.min(e.count,6)*2,0)+dependent.length*4+lostSignals.length*5;
  const invalidCount=plan.invalid.reduce((n,c)=>n+c.quantity,0),editPenalty=invalidCount*3+plan.newColors.length*4+Math.min(10,Math.abs(plan.countChange));
  const supports=[...new Set(fit.evidence.flatMap(e=>e.cards))];if(supports.length<3)continue;
  const mana=zone.map(c=>c.cmc),oldMana=old.map(c=>c.cmc),costKnown=mana.every(Number.isFinite)&&oldMana.every(Number.isFinite);
  const deploymentPenalty=costKnown?Math.max(0,mana.reduce((n,v)=>n+v,0)-oldMana.reduce((n,v)=>n+v,0))*2:0;
  const delta=Math.round((fit.score-baseline.score-dependencyPenalty-editPenalty-deploymentPenalty)*10)/10;
  const tradeoffs=['Triggers, activation costs, once-per-turn limits, sequencing and opponent interaction can change the outcome. Read the full rules before testing.'];
  if(dependent.length)tradeoffs.unshift('Cards explicitly naming a displaced commander need review: '+dependent.map(r=>r.card.name).join(', ')+'.');
  if(lostSignals.length)tradeoffs.unshift('Displaces recognized commander-dependent engine signals: '+lostSignals.map(s=>s.name+' ['+s.pieces.join(' + ')+']').join('; ')+'. These signals require rules review and are not verified combo lines.');
  if(lost.length)tradeoffs.unshift('Loses current command-zone support for '+lost.map(e=>e.label+' ('+e.cards.slice(0,3).join(', ')+')').join('; ')+'.');
  if(costKnown&&Math.max(...mana)>Math.max(...oldMana))tradeoffs.unshift('The most expensive commander costs '+Math.max(...mana)+' mana versus '+Math.max(...oldMana)+' now; a slower start and commander tax may outweigh this fit.');
  if(!costKnown)tradeoffs.push('Command-zone mana costs are incomplete in this snapshot; casting speed is not verified.');
  if(deploymentPenalty)tradeoffs.push('Deploying the whole proposed command zone costs '+mana.reduce((n,v)=>n+v,0)+' mana versus '+oldMana.reduce((n,v)=>n+v,0)+' now; the comparison deducts '+deploymentPenalty+' points for that delay.');
  if(zone.length===2)tradeoffs.push('Two commanders offer two sources of value, but deploying both takes mana and each tracks its own commander tax.');
  recommendations.push({zone,plan,delta,fitScore:fit.score,evidence:fit.evidence,lost,tradeoffs,retainsCurrent:zone.some(c=>oldIds.has(functionalId(c))),label:delta>=6&&plan.dropIn?'Plausible upgrade estimate':delta>=6?'Promising fit; deck edits required':'Alternative; no clear upgrade'});
 }
 recommendations.sort((a,b)=>b.delta-a.delta||Number(b.plan.dropIn)-Number(a.plan.dropIn)||a.zone.map(c=>c.name).join().localeCompare(b.zone.map(c=>c.name).join()));
 const clear=recommendations.some(r=>r.delta>=6&&r.plan.dropIn);
 const filtered=mode==='pairs'?recommendations.filter(r=>r.zone.length===2):mode==='dropIn'?recommendations.filter(r=>r.plan.dropIn):recommendations;
 return {summary,baseline,recommendations:filtered.slice(0,limit),noClearUpgrade:!clear,notice:clear?'Sage sees plausible improvements to test. These estimates compare demonstrated shell support, not proven win rates.':'No clear drop-in upgrade. Your current commander may already serve this shell well; alternatives below are experiments, not promises.',method:'Deterministic shell evidence v1. Capped engine support minus lost commander support, color-invalid copies, added colors and required count edits. No popularity, price, creature-type-only, or win-rate score. Narrow mechanic recognition may miss stronger choices.'};
}
