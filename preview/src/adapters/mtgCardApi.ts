import {cardRequest} from '../providers/staticCards';
export async function fetchCardByName(name: string) {
  const response=await cardRequest('/api/card?name='+encodeURIComponent(name));
  if(!response.ok)return null;
  const {card}=await response.json();
  return {...card.raw,image_url:card.imageUrl,art_crop_url:card.artUrl,oracle_text:card.oracleText};
}
