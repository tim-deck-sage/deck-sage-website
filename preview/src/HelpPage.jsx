import React,{useMemo,useState} from 'react';
import {EditorialHeader} from './EditorialHome';

const GUIDE_GROUPS=[
 {id:'library',number:'01',eyebrow:'BEGIN WITH THE ARCHIVE',title:'Start with the card library',summary:'Find a card by name, rules text, type, color, or rarity.',body:["Type at least part of a name, or switch to Rules & types to search abilities. Filter by mana, card type, rarity, and commander colors. Open any card for its rules, faces, legality, and metadata."],route:'cards',action:'Open the card library'},
 {id:'decks',number:'02',eyebrow:'SHAPE THE IDEA',title:'Build your deck',summary:'Create a list, choose its commander, and let the Sage help you review it.',body:["Create a deck, choose a commander, and add named cards. Paste a decklist to import multiple cards. Basic lands are counted separately. Review balance, Sage power, strategy, and candidate upgrades."],route:'decks',action:'Go to my decks'},
 {id:'bulk',number:'03',eyebrow:'DISCOVER WHAT YOU OWN',title:'Put your bulk to work',summary:'Catalog spare cards and uncover the deck shells already in your collection.',body:["Add copies and variants to bulk. Move a specific quantity into a deck; only moved copies leave bulk. The app's commander discovery and candidate-pool engine can reveal a new deck shell."],route:'bulk',action:'Explore my bulk'},
 {id:'storage',number:'04',eyebrow:'KEEP THE THREAD',title:'Keep your work',summary:'Keep a private collection across your devices.',body:["Sign in with your username and password to open your private collection. Check the saved status before leaving, and export backups for important changes. Old beta data stays separate from new accounts."],route:'settings',action:'Open settings & backup'},
 {id:'scanning',number:'05',eyebrow:'LET THE LENS HELP',title:'AI card scanning',summary:'Stage photos, review every result, and add cards only when you are ready.',body:["Open Batch upload cards from Bulk or a deck and choose up to 20 JPEG, PNG or static WebP photos, each at most 12 MB and 32 MP. Press Scan staged photos to read names on this device. The first scan downloads about 11 MB of scanner files; photos and crops are never uploaded. Use View scan to inspect the actual photo crops, correct names and quantities, choose one destination, and confirm once to add the cards."],route:'batch-upload/bulk',action:'Open batch upload'},
 {id:'connected',number:'06',eyebrow:'KNOW WHAT IS CONNECTED',title:'Connected features',summary:'A plain-language account of shared workspaces, news, recognition, and cost.',body:["A verified account and password protect your private collection. Online friends, store connections, and push messages are not connected. Daily news is updated from a shared server cache; opening or refreshing the page never generates a paid summary. Card-name recognition runs locally in the browser, without uploading photos. Store plans and contacts are private drafts within your signed-in workspace. All user features are free; there are no paid account or store-owner tiers."]},
];

function Arrow(){return <span aria-hidden="true">↗</span>;}
function count(value){return Number(value||0).toLocaleString();}

export function HelpPage({state,status,accountSnapshot,brand,avatar}){
 const [query,setQuery]=useState('');
 const [openIds,setOpenIds]=useState(()=>new Set(['library']));
 const dataSections=useMemo(()=>[
  ...GUIDE_GROUPS,
  {id:'data',number:'07',eyebrow:'READ THE FINE PRINT',title:'About card data & analysis',summary:'Where the catalog comes from, when it refreshes, and what the estimates mean.',body:[`${count(status?.scryfallCards??status?.fullDataCards)} current Oracle identities were downloaded from Scryfall's public bulk feed, alongside ${count(status?.historicalCards)} preserved historical app records. The catalog checks for a validated refresh each day; the status shown in Card Library is the last successful refresh, not a promise that a scheduled run will start at an exact minute. Rules, multi-face data, colors, legalities, Scryfall gameplay tags, and representative-printing prices are stored locally. Card images load from Scryfall when online.`,"The app's local analytical engines provide estimates based on their original snapshot. They do not represent a trained model, official rulings, an official bracket certification, or a current market appraisal. Cards without complete metadata are labeled."],external:{href:'https://scryfall.com/docs/api/bulk-data',label:'Scryfall bulk data documentation'}},
  {id:'privacy',number:'08',eyebrow:'YOUR COLLECTION, EXPLAINED',title:'Privacy & storage',summary:'What remains local, what reaches the test backend, and what leaves the browser.',body:["Public browsing needs no account. After verified account setup, your collection syncs privately through Supabase. Email is used for account recovery; your ZIP is stored privately for future geographic advertising. Old beta data stays isolated. Card-image and current-value requests to Scryfall reveal the requested image or card identifier to that service.","Account setup requires Terms and Privacy acceptance. Optional device permissions are requested only for features that use them. An exported backup contains personal collection data; share it intentionally."]},
 ],[status]);
 const normalized=query.trim().toLowerCase();
 const visible=dataSections.filter(section=>!normalized||[section.eyebrow,section.title,section.summary,...section.body].join(' ').toLowerCase().includes(normalized));
 const visibleIds=new Set(visible.map(section=>section.id));
 const openSection=id=>{const target=document.getElementById('help-'+id);setOpenIds(previous=>new Set(previous).add(id));target?.scrollIntoView({block:'start'});target?.querySelector('summary')?.focus();};
 const toggleSection=(id,isOpen)=>setOpenIds(previous=>{const next=new Set(previous);if(isOpen)next.add(id);else next.delete(id);return next;});
 return <div className="help-guide-route editorial-deck-page">
  <a className="help-skip" href="#help-guide" onClick={event=>{event.preventDefault();document.getElementById('help-guide')?.focus();document.getElementById('help-guide')?.scrollIntoView();}}>Skip to the guide</a>
  <EditorialHeader state={state} accountSnapshot={accountSnapshot} brand={brand} avatar={avatar} current="help"/>
  <section className="help-hero" aria-labelledby="help-title">
   <picture><source media="(max-width:650px)" srcSet="/help/guide-mobile.webp"/><img src="/help/guide-hero.webp" width="1920" height="715" alt="" fetchPriority="high"/></picture>
   <div className="help-hero-copy"><span className="help-kicker">THE PLANESWALKER'S FIELD GUIDE</span><h1 id="help-title">Every path<br/>needs <em>a map.</em></h1><p>The Deck Sage collection and deckbuilding tools, gathered into one clear guide. Begin with a question; leave with your next step.</p><button type="button" onClick={()=>openSection('library')}>Open the field guide <Arrow/></button></div>
   <div className="help-hero-foot"><span>HOW TO USE DECK SAGE</span><span>08 ENTRIES IN THE GUIDE</span></div>
  </section>
  <section className="help-guide" aria-labelledby="help-guide-title">
   <header className="help-guide-intro" id="help-guide" tabIndex={-1}><span className="help-kicker">A CLEAR WAY FORWARD</span><h2 id="help-guide-title">Find the answer.<br/><em>Keep your momentum.</em></h2><p>Search the guide, choose a chapter, or read from the beginning. Each entry opens in place so the path stays easy to follow.</p></header>
   <div className="help-guide-layout">
    <aside className="help-index" aria-label="Guide index"><span>FIELD GUIDE INDEX</span><nav>{dataSections.map(section=><button type="button" key={section.id} disabled={!visibleIds.has(section.id)} aria-label={`Open ${section.title}`} onClick={()=>openSection(section.id)}><small>{section.number}</small><strong>{section.title}</strong></button>)}</nav><a href="/support/">Still need help? Contact support <Arrow/></a></aside>
    <div className="help-reading-room">
     <label className="help-search"><span>SEARCH THE FIELD GUIDE</span><span className="help-search-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={'Try “scanner”, “backup”, or “privacy”'} aria-describedby="help-results"/>{query&&<button type="button" onClick={()=>setQuery('')}>Clear</button>}</span></label>
     <p id="help-results" className="help-results" role="status">{visible.length} of {dataSections.length} guide entries</p>
     <div className="help-entries">{visible.map(section=>{
      const isOpen=normalized?true:openIds.has(section.id);
      return <details id={'help-'+section.id} key={section.id} open={isOpen} onToggle={event=>{if(!normalized)toggleSection(section.id,event.currentTarget.open);}}>
       <summary><span>{section.number}</span><span><small>{section.eyebrow}</small><h3>{section.title}</h3><em>{section.summary}</em></span><i aria-hidden="true"/></summary>
       <div className="help-entry-body">{section.body.map((paragraph,index)=><p key={index}>{paragraph}</p>)}{section.route&&<a href={'#/'+section.route}>{section.action}<Arrow/></a>}{section.external&&<a href={section.external.href} target="_blank" rel="noreferrer">{section.external.label}<Arrow/></a>}</div>
      </details>;
     })}</div>
     {!visible.length&&<div className="help-empty"><span className="help-kicker">NO MATCH IN THE MARGINS</span><h3>Try a broader search.</h3><p>Search by a feature, an action, or a concern such as storage or privacy.</p><button type="button" onClick={()=>setQuery('')}>Clear the search</button></div>}
    </div>
   </div>
  </section>
  <section className="help-closing" aria-labelledby="help-closing-title"><div><span className="help-kicker">THE LIBRARY IS YOURS</span><h2 id="help-closing-title">Ready for the next chapter?</h2><p>Return to your collection, search for a card, or ask the Sage for a second look.</p></div><nav aria-label="Continue using Deck Sage"><a href="#/decks">My decks <Arrow/></a><a href="#/cards">Card library <Arrow/></a><a href="#/sage">Sage's Workshop <Arrow/></a></nav></section>
 </div>;
}
