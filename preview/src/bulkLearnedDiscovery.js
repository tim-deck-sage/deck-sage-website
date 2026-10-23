import {readBulkRelationships} from './bulkRelationsClient';
import {relationshipCautions} from './bulkRelationsCore';
import {buildBulkDeckProposal,bulkDeckRules} from './bulkDeckDiscovery';
import {classifyCandidateCard} from '../source/app/utils/bulkCandidatePool/cardFeatureClassifier';
import {buildBulkCandidatePool} from '../source/app/utils/bulkCandidatePool/buildBulkCandidatePool';
const {functionalId}=bulkDeckRules;
const qty=c=>Math.max(0,Math.floor(Number(c.quantity??1)||0));
const printingKey=c=>[functionalId(c),c.cardVariant||'Normal',c.setName||'',c.collectorNumber||'',c.scryfallId||'',c.printingIdentity||''].join('|');
export function restoreBulkAllocationSources(proposal,bulk){return {...proposal,allocations:proposal.allocations.map(a=>({...a,sourceKey:[functionalId(bulk[a.sourceIndex]),bulk[a.sourceIndex].cardVariant||'Normal',bulk[a.sourceIndex].setName||'',bulk[a.sourceIndex].collectorNumber||'',a.sourceIndex].join('|')}))};}
export function assertBulkReviewSources(current,reviewed,allocations){
 const used=new Map();for(const a of allocations){const before=reviewed?.[a.sourceIndex],now=current[a.sourceIndex];if(!before||!now||printingKey(before)!==printingKey(now))throw Error('Bulk changed before confirmation. Review the refreshed exact copies.');used.set(a.sourceIndex,(used.get(a.sourceIndex)||0)+a.quantity);}
 for(const [index,n] of used)if(qty(current[index])<n)throw Error('Bulk changed before confirmation. The reviewed quantities are no longer available.');
}
const feature=card=>classifyCandidateCard({...card,functionalId:functionalId(card),manaValue:Number(card.cmc??0)});
function planFromRelationships(row,bulk,catalogCards=[],queryZone){
 const zone=row.commandZone.map(c=>bulk.find(x=>x.oracleId===c.oracleId)||queryZone?.find(x=>x.oracleId===c.oracleId));if(zone.some(c=>!c))throw Error('A reviewed commander could not be resolved.');
 const byId=new Map(bulk.map(c=>[c.oracleId,c])),coreIds=new Set(row.core.map(c=>c.oracleId)),ranked=row.ranked.map(c=>byId.get(c.oracleId)).filter(Boolean),chosen=[...row.core.map(c=>byId.get(c.oracleId)).filter(Boolean)],used=new Set(chosen.map(c=>c.oracleId)),target=Math.max(0,100-zone.length-37);
 const add=c=>{if(chosen.length>=target||used.has(c.oracleId)||relationshipCautions(c,zone).some(x=>x.reviewOnly))return;chosen.push(c);used.add(c.oracleId);};
 // Core first, then bounded structural support. These role counts are hints, not readiness.
 for(const [role,min] of [['draw',4],['interaction',4],['protection',2],['ramp_fixing',4]]){let count=chosen.filter(c=>feature(c).structuralRoles.includes(role)).length;for(const c of ranked){if(count>=min||chosen.length>=target)break;if(!used.has(c.oracleId)&&feature(c).structuralRoles.includes(role)){add(c);count++;}}}
 for(const c of ranked)add(c);
 const owned=new Set(bulk.filter(c=>qty(c)>0).map(c=>c.oracleId)),safeCatalog=catalogCards.filter(c=>!owned.has(c.oracleId)&&!relationshipCautions(c,zone).some(x=>x.reviewOnly)),poolCards=chosen.map(card=>{const features=feature(card);return {card,features,assignedBucket:features.structuralRoles[0]||'uncertain',reasons:[coreIds.has(card.oracleId)?'Learned Commander association; check the current abilities.':'Owned support candidate; role hints can be conditional.']};}),proposal=buildBulkDeckProposal({commandZone:zone,bulk,poolCards,catalogCards:safeCatalog});
 const roles={};for(const card of proposal.ownedCards)for(const role of feature(card).structuralRoles)roles[role]=(roles[role]||0)+1;
 const core=row.core.map(c=>({oracleId:c.oracleId,name:c.name,card:byId.get(c.oracleId)})),cautions=[...row.core,...row.reviewOnly].flatMap(c=>(c.cautions||[]).map(x=>({...x,name:c.name,oracleId:c.oracleId}))),unsupported=row.status==='unsupported_commander';
 const strategy={...proposal.strategy,headline:unsupported?'A color-compatible starting pool; this leader is outside the Sage’s learned map.':'A possible core from learned Commander card relationships, with owned support cards to review.',evidence:[unsupported?'Learned commander relationships unavailable.':core.length+' distinct cards in the learned core.',row.coverage.known+' of '+row.coverage.compatible+' compatible nonland cards recognized.','Mana, final roles and actual interactions still need your review.']};
 return {...proposal,strategy,learnedReview:{available:!unsupported,small:row.status==='small_learned_group',coverage:row.coverage,core,roles,cautions,abilities:row.abilities,source:'learned_association'},gaps:[...proposal.gaps,...(unsupported?['The learned library does not cover this commander. This does not rule out a deck.']:[]),'Learned associations do not verify combos, consistency, color fixing or playability.']};
}
export async function discoverLearnedBulk(bulk,catalog,options){
 const found=await readBulkRelationships(bulk,catalog,options);return {...found,results:found.results.map(row=>planFromRelationships(row,bulk))};
}
export async function reviewLearnedBulk(zone,bulk,catalog,catalogCards,options){
 const found=await readBulkRelationships(bulk,catalog,{...options,queryZones:[zone]}),row=found.results[0];if(!row)throw Error('The selected command zone could not be studied.');
 if(row.status==='unsupported_commander'){
  const combined={...zone[0],oracleId:'proposal:'+zone.map(c=>c.oracleId).join('+'),name:zone.map(c=>c.name).join(' + '),typeLine:'Legendary Creature',oracleText:zone.map(c=>c.oracleText||'').join('\n'),colorIdentity:[...new Set(zone.flatMap(c=>c.colorIdentity))],metadataIssues:[],unsupportedMechanics:[]},pool=await buildBulkCandidatePool({commander:combined,bulk,resolveOffline:async()=>[],resolveOracle:async()=>null,yieldControl:()=>new Promise(r=>setTimeout(r,0))});
  if(options.signal?.aborted)throw new DOMException('Cancelled','AbortError');
  row.ranked=pool.cards.map(r=>({oracleId:r.card.oracleId}));row.core=[];row.reviewOnly=[];
 }
 return planFromRelationships(row,bulk,catalogCards,zone);
}
