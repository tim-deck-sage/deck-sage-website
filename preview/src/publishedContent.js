let cached=null,pending=null,generation=0;
const config=()=>globalThis.DECK_SAGE_PUBLISHER||null;

export function publisherConfig(){return config();}
export function clearPublishedContentCache(){cached=null;pending=null;generation++;}
export async function loadPublishedContent({force=false}={}){
 const settings=config();if(!settings?.enabled||!settings.endpoint)return {lore:[],songs:[],enabled:false};
 if(cached&&!force)return cached;if(pending&&!force)return pending;
 const requestGeneration=++generation;let request;
 request=fetch(settings.endpoint,{headers:{Accept:'application/json'},cache:'no-store'}).then(async response=>{const body=await response.json().catch(()=>({}));if(!response.ok)throw Error(body.error||'Published content is unavailable.');const items=Array.isArray(body.items)?body.items:[],result={enabled:true,lore:items.filter(item=>item.kind==='lore').map(item=>({id:`published-${item.id}`,name:item.commanderName||item.title,title:item.title,story:item.body||'',artworkUrl:item.artworkUrl,publishedAt:item.publishedAt,isPublished:true})),songs:items.filter(item=>item.kind==='song').map(item=>({id:`published-${item.id}`,commanderName:item.commanderName||item.title,songTitle:item.title,audioFile:item.audioUrl,artwork:item.artworkUrl,categories:item.categories?.length?item.categories:['fan-favorites'],publishedAt:item.publishedAt,isPublished:true}))};if(requestGeneration!==generation)return pending&&pending!==request?pending:cached||result;cached=result;return result;}).finally(()=>{if(pending===request)pending=null;});pending=request;return request;
}
