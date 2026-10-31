import {cardRequest} from './providers/staticCards';
import {cardDestination,isCustomCard} from './affiliateLinks';
const pending=new Map();
export function hasPurchaseMetadata(card){return [card?.tcgplayerId,card?.tcgplayer_id,card?.tcgplayerUrl,card?.purchase_uris?.tcgplayer,card?.raw?.tcgplayer_id,card?.raw?.purchase_uris?.tcgplayer].some(value=>value!==undefined&&value!==null);}
export function purchasePrintingMatches(source,resolved){
 const id=source?.oracleId||source?.oracle_id;if(id&&id!==(resolved?.oracleId||resolved?.oracle_id))return false;
 const expected=source?.scryfallId||source?.raw?.id||(source?.oracle_id&&source?.id!==source.oracle_id?source?.id:null)||String(source?.scryfallUrl||'').match(/([a-f0-9]{8}-[a-f0-9-]{27})\/?$/i)?.[1];
 if(expected&&expected!==(resolved?.scryfallId||resolved?.raw?.id))return false;
 return Boolean(resolved?.name&&String(source?.name||'').trim().toLowerCase()===resolved.name.trim().toLowerCase());
}
// Same-origin worker/catalog only. No TCGplayer API, credentials or live pricing.
export async function resolvePurchaseCard(card,request=cardRequest){
 if(isCustomCard(card))return null;
 if(!card||hasPurchaseMetadata(card))return cardDestination(card)?card:null;
 const id=card.oracleId||card.oracle_id,name=String(card.name||'').trim();if(!id&&!name)return null;
 const query=id?'id='+encodeURIComponent(id):'name='+encodeURIComponent(name),key=query;
 let task=pending.get(key);if(!task){task=request('/api/card?'+query).then(async response=>{if(!response.ok)return null;return (await response.json()).card;}).catch(()=>{pending.delete(key);return null;});pending.set(key,task);if(pending.size>512)pending.delete(pending.keys().next().value);}
 const resolved=await task;return purchasePrintingMatches(card,resolved)&&cardDestination(resolved)?resolved:null;
}
