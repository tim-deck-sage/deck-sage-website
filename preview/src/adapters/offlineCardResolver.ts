import {cardRequest} from '../providers/staticCards';
export async function resolveOfflineCardsByIdentity(identities: any[]) {
  const response=await cardRequest('/api/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:identities.map(i=>i.name||'')})});
  const {cards}=await response.json();
  return identities.map((identity,index)=>({key:identity.oracleId||identity.name,identity,status:cards[index]?'resolved':'not_found',cardData:cards[index]?.raw}));
}
