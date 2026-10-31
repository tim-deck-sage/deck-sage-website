// Presentation-only commerce helpers. Never imported by recommendation/scoring code.
export const MASS_ENTRY_URL='https://www.tcgplayer.com/massentry';
export const TCGPLAYER_HOME_URL='https://www.tcgplayer.com/';
export const AFFILIATE_DISCLOSURE='Affiliate link — Deck Sage may earn a commission on qualifying purchases.';
const plainUrl=value=>{try{if(typeof value!=='string'||value!==value.trim()||/[\s\\]/.test(value))return null;const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port?url:null;}catch{return null;}};
const productId=value=>/^[1-9]\d{0,11}$/.test(String(value||''))?String(value):null;
export const isCustomCard=card=>Boolean(card&&(card.isCustom===true||card.custom===true||card.isGenerated===true||['custom','ai-generated','generated-art','user-created-card'].includes(card.dataSource)));
export function cardDestination(card){
 if(!card||isCustomCard(card))return null;
 const id=productId(card.tcgplayerId??card.tcgplayer_id??card.raw?.tcgplayer_id);
 const supplied=card.tcgplayerUrl??card.purchase_uris?.tcgplayer??card.raw?.purchase_uris?.tcgplayer;
 if(supplied){let url=plainUrl(supplied);
  // Scryfall supplies its OWN affiliate wrapper. Extract only the merchant
  // destination; never reuse its account, tracking URL, or attribution parameters.
  if(url?.hostname==='partner.tcgplayer.com'&&/^\/c\/\d+\/\d+\/21018\/?$/.test(url.pathname))url=plainUrl(url.searchParams.get('u'));
  if(!url||!['tcgplayer.com','www.tcgplayer.com'].includes(url.hostname)||!/^\/product\/[1-9]\d*(?:\/[^?#]*)?\/?$/.test(url.pathname))return null;const match=url.pathname.match(/^\/product\/(\d+)/);if(id&&match[1]!==id)return null;url.search='';url.hash='';return url.href;}
 return id?'https://www.tcgplayer.com/product/'+id:null;
}
export function affiliateLink(destination,config){
 if(!config?.enabled||config.deepLinkingApproved!==true)return {href:null,reason:'Purchasing links are awaiting affiliate setup.'};
 const target=plainUrl(destination),tracking=plainUrl(config.trackingUrl);
 if(!target||!['tcgplayer.com','www.tcgplayer.com'].includes(target.hostname)||!(/^\/product\/[1-9]\d*(?:\/[^?#]*)?\/?$/.test(target.pathname)||target.href===MASS_ENTRY_URL||target.href===TCGPLAYER_HOME_URL))return {href:null,reason:'No verified TCGplayer destination for this printing.'};
 // Full Impact URL only. Campaign ID alone and vanity links are insufficient.
 if(!tracking||!/^\/c\/[1-9]\d*\/[1-9]\d*\/21018\/?$/.test(tracking.pathname)||!Array.isArray(config.approvedTrackingHosts)||!config.approvedTrackingHosts.includes(tracking.hostname)||tracking.hash)return {href:null,reason:'Purchasing links are awaiting a verified full Impact tracking URL.'};
 const exactAllowed=Array.isArray(config.allowedDestinationUrls)&&config.allowedDestinationUrls.includes(target.href);
 const prefixAllowed=Array.isArray(config.allowedDestinationPrefixes)&&config.allowedDestinationPrefixes.some(prefix=>{const allowed=plainUrl(prefix);return allowed&&allowed.origin===target.origin&&(allowed.pathname==='/'||target.pathname===allowed.pathname||target.pathname.startsWith(allowed.pathname.endsWith('/')?allowed.pathname:allowed.pathname+'/'));});
 if(!exactAllowed&&!prefixAllowed)return {href:null,reason:'This destination has not been approved for deep linking.'};
 tracking.searchParams.set('u',target.href);return {href:tracking.href,reason:null};
}
const safeName=value=>typeof value==='string'&&value.trim()&&!/[\r\n\[\]<>]/.test(value)?value.trim():null;
export function massEntryList(deck){
 const rows=new Map(),cards=deck?.cards||[],savedCommanders=deck?.commanders?.length?deck.commanders:deck?.commanderCard?[deck.commanderCard]:[];
 const identity=card=>card?.oracleId||card?.oracle_id||String(card?.name||'').toLowerCase();
 const commanders=[...new Map(savedCommanders.map(card=>[identity(card),card])).values()];
 const commanderIds=new Set(commanders.map(identity));
 // Saved decks occasionally repeat the command zone in the main list: include it once.
 const items=[...cards.filter(card=>!commanderIds.has(identity(card))),...commanders.map(card=>({...card,quantity:1})),...Object.entries(deck?.basicLands||{}).map(([name,quantity])=>({name,quantity}))];
 for(const card of items){const name=safeName(card.name),q=Number(card.quantity??1);if(!name||!Number.isInteger(q)||q<0||q>9999)throw Error('Review invalid deck names or quantities before copying.');if(!q)continue;const set=String(card.setCode||''),number=String(card.collectorNumber||'');const printing=/^[A-Za-z0-9]{2,10}$/.test(set)&&/^[A-Za-z0-9★-]{1,12}$/.test(number)?` [${set.toUpperCase()}] ${number}`:'';const key=name+printing;rows.set(key,(rows.get(key)||0)+q);if(rows.get(key)>9999)throw Error('Deck quantity exceeds Mass Entry export limit.');}
 if(!rows.size)throw Error('Add cards to the deck before copying.');
 return [...rows].map(([name,q])=>`${q} ${name}`).join('\n');
}
export function recommendationPurchaseOptions(items=[]){
 const options=new Map();
 for(const item of items){const card=item?.card||item,name=safeName(card?.name);if(!name)continue;const destination=cardDestination(card),product=destination?.match(/\/product\/(\d+)/)?.[1];
  const key=product?'product:'+product:card.scryfallId?'printing:'+card.scryfallId:'card:'+name.toLowerCase()+'|'+String(card.setCode||'').toLowerCase()+'|'+String(card.collectorNumber||'');
  if(!options.has(key))options.set(key,{key,card,name});
 }
 return [...options.values()];
}
export function selectedRecommendationsList(options,selections={}){
 const cards=[];for(const option of options){const choice=selections[option.key];if(!choice?.selected)continue;const quantity=Number(choice.quantity??1);if(!Number.isInteger(quantity)||quantity<1||quantity>9999)throw Error('Use a whole purchase quantity from 1 to 9999 for each selected card.');cards.push({...option.card,quantity});}
 if(!cards.length)throw Error('Select at least one card to copy.');
 return massEntryList({cards});
}
