import {CardBuyLink,DeckBuyLinks,AffiliateNotice} from './AffiliatePurchase';
import React,{useEffect,useMemo,useState} from 'react';
import {cardRequest} from './providers/staticCards';
import {commanderFallbackImage,getPreferredCommanderArt} from './providers/commanderDisplayArt';

const normalized=value=>String(value||'').trim().toLowerCase();
const treatmentLabels={full_art:'Full-art printing',borderless:'Borderless printing',extendedart:'Extended-art printing'};

function exactCommander(card,name){
 const wanted=normalized(name),names=[card?.name,...(Array.isArray(card?.faces)?card.faces.map(face=>face?.name):[])].map(normalized);
 return Boolean(card?.oracleId&&wanted&&names.includes(wanted));
}

function storyPreview(story){
 const parts=String(story?.story||'').split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean);
 const hook=parts.find(value=>value.length>20&&!/:$/.test(value));
 return hook||parts[0]||'';
}

function CommanderPrinting({story,record}){
 const preferred=record?.preferred||null,fallback=record?.card?commanderFallbackImage(record.card):'',preferredUrl=preferred?.imageUrl||'';
 const [failed,setFailed]=useState(()=>new Set());
 useEffect(()=>setFailed(new Set()),[preferredUrl,fallback]);
 const source=preferredUrl&&!failed.has(preferredUrl)?preferredUrl:fallback&&!failed.has(fallback)?fallback:'';
 const isPreferred=source===preferredUrl&&Boolean(preferredUrl),treatment=isPreferred?preferred?.treatment:'fallback';
 const label=isPreferred?(treatmentLabels[treatment]||'Preferred art printing'):'Standard printing';
 const sourceUrl=isPreferred?preferred?.sourceUrl:record?.card?.scryfallUrl;
 const artist=isPreferred?preferred?.artist:record?.card?.artist;
 return <figure className="lore-printing" data-art-treatment={treatment} data-art-printing={isPreferred?preferred?.printingId||'':''} data-commander-oracle-id={record?.card?.oracleId||''}>
  <div className="lore-printing-stage">{source?<img src={source} alt={`${story.name} card — ${label.toLowerCase()}`} loading="lazy" decoding="async" onError={()=>setFailed(current=>new Set(current).add(source))}/>:<span className="lore-printing-placeholder" aria-label={`${story.name} card artwork unavailable`}><span>{story.name.slice(0,1)}</span><small>{record?.loading?'Opening the card archive…':'Card artwork unavailable'}</small></span>}</div>
  <figcaption><CardBuyLink card={record?.card||{name:story.name}}/><strong>{label}</strong>{artist&&<span>Art by {artist}</span>}{sourceUrl&&<a href={sourceUrl} target="_blank" rel="noreferrer">View exact printing on Scryfall <span aria-hidden="true">↗</span></a>}</figcaption>
 </figure>;
}

export function CommanderLorePage({stories,error,setModal}){
 const [query,setQuery]=useState(''),[source,setSource]=useState('all'),[artByName,setArtByName]=useState(()=>new Map());
 const names=useMemo(()=>[...new Set(stories.map(story=>story.name).filter(Boolean))],[stories]);
 const namesKey=names.join('\u0000');
 useEffect(()=>{
  let active=true;
  setArtByName(previous=>{const next=new Map(previous);for(const name of names)if(!next.has(name))next.set(name,{loading:true,card:null,preferred:null});return next;});
  if(!names.length)return()=>{active=false;};
  cardRequest('/api/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names})}).then(response=>response.json()).then(async body=>{
   const cards=Array.isArray(body?.cards)?body.cards:[];
   const records=await Promise.all(names.map(async(name,index)=>{const card=exactCommander(cards[index],name)?cards[index]:null;return [name,{loading:false,card,preferred:card?await getPreferredCommanderArt(card):null}];}));
   if(active)setArtByName(new Map(records));
  }).catch(()=>{if(active)setArtByName(new Map(names.map(name=>[name,{loading:false,card:null,preferred:null}])));});
  return()=>{active=false;};
 },[namesKey]);
 const visible=useMemo(()=>{const needle=normalized(query);return stories.filter(story=>(source==='all'||(source==='published')===Boolean(story.isPublished))&&(!needle||normalized([story.name,story.title,story.story].join(' ')).includes(needle)));},[stories,query,source]);
 const openStory=story=>{const record=artByName.get(story.name),artworkUrl=record?.preferred?.imageUrl||commanderFallbackImage(record?.card);setModal({type:'story',story:{...story,...(artworkUrl?{artworkUrl}:{})}});};
 return <div className="lore-page">
  <a className="editorial-skip" href="#lore-chronicles">Skip to chronicles</a>
  <section className="lore-hero" aria-labelledby="lore-title">
   <picture><source media="(max-width: 650px)" srcSet="/commander-lore/chronicle-hero-mobile.webp"/><img src="/commander-lore/chronicle-hero-desktop.webp" alt="" width="1920" height="1080" fetchPriority="high"/></picture>
   <div className="lore-hero-copy"><span className="lore-kicker">THE COMMANDER CHRONICLES</span><h1 id="lore-title">Beyond the card.<br/><em>Into the story.</em></h1><p>Set down your deck and draw closer to the fire. Meet the characters behind the cards through the original Commander Lore archive.</p><a className="lore-hero-link" href="#lore-chronicles">Explore the chronicles <span aria-hidden="true">↓</span></a></div>
   <div className="lore-hero-foot"><span>DECK SAGE · FIELD NOTES FROM THE MULTIVERSE</span><span>{stories.length} chronicles in the archive</span></div>
  </section>
  <section className="lore-index" id="lore-chronicles" aria-labelledby="lore-index-title">
   <div className="lore-index-intro"><span className="lore-kicker">A LIVING ARCHIVE</span><h2 id="lore-index-title">Every legend leaves<br/><em>a trail of ink.</em></h2><p>Search the archive, then open a chronicle to read the preserved story in full. Each commander is paired with an exact-identity card printing.</p></div>
   {error&&<p className="lore-notice" role="status">Newly published lore is temporarily unavailable. The original archive remains open.</p>}
   <div className="lore-tools" role="search"><label><span>Search the chronicles</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search a commander or passage…"/></label><label><span>Archive source</span><select value={source} onChange={event=>setSource(event.target.value)}><option value="all">All chronicles</option><option value="archive">Original archive</option><option value="published">Publisher additions</option></select></label><p aria-live="polite"><strong>{visible.length}</strong> of {stories.length} chronicles</p></div>
  </section>
  <div className="lore-stream">{visible.map((story,index)=>{const preview=storyPreview(story),record=artByName.get(story.name)||{loading:true,card:null,preferred:null};return <article className="lore-chapter" key={story.id} data-lore-id={story.id} data-published={story.isPublished?'true':'false'}>
   <div className="lore-art-column"><span className="lore-chapter-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><CommanderPrinting story={story} record={record}/></div>
   <div className="lore-chapter-copy"><span className="lore-kicker">{story.isPublished?'NEW FROM THE PUBLISHER':'COMMANDER CHRONICLES'}</span><h2>{story.name}</h2>{story.title&&story.title!==story.name&&<strong className="lore-story-title">{story.title}</strong>}<p>{preview}</p><button type="button" className="lore-read" onClick={()=>openStory(story)}>Read the full chronicle <span aria-hidden="true">→</span></button></div>
  </article>;})}{!visible.length&&<div className="lore-empty"><span className="lore-kicker">NO MATCHING CHRONICLE</span><h2>The ink is quiet here.</h2><p>Try another commander name or return to the complete archive.</p><button type="button" onClick={()=>{setQuery('');setSource('all');}}>Clear the search</button></div>}</div>
  <aside className="lore-method" aria-label="Artwork and story notes"><div><span className="lore-kicker">ABOUT THE ARCHIVE</span><h2>Stories preserved.<br/><em>Printings verified.</em></h2></div><div><p>These stories are narrative interpretations, not official Wizards of the Coast lore publications.</p><p>Card art uses exact Oracle identity and eligible Scryfall printing metadata. Full-art is preferred, then borderless, then extended art; when none is available, the standard full-card image is labeled as the fallback.</p><a href="https://scryfall.com" target="_blank" rel="noreferrer">Card data and printing links by Scryfall <span aria-hidden="true">↗</span></a></div></aside>
 </div>;
}
