import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';

const THEMES={
 Arena:{label:'ARENA',symbol:'◉',accent:'#4aa3ff',soft:'rgba(74,163,255,.14)'},
 Collectors:{label:'COLLECTORS',symbol:'◇',accent:'#d7b56d',soft:'rgba(215,181,109,.16)'},
 Commander:{label:'COMMANDER',symbol:'♜',accent:'#9bd65b',soft:'rgba(155,214,91,.15)'},
 Community:{label:'COMMUNITY',symbol:'◎',accent:'#caa8ff',soft:'rgba(202,168,255,.14)'},
 Competitive:{label:'COMPETITIVE',symbol:'♛',accent:'#ffcf5f',soft:'rgba(255,207,95,.15)'},
 Finance:{label:'FINANCE',symbol:'↗',accent:'#74ddb2',soft:'rgba(116,221,178,.14)'},
 MTGO:{label:'MTGO',symbol:'▣',accent:'#74c7ff',soft:'rgba(116,199,255,.14)'},
 'New Set':{label:'NEW SET',symbol:'✦',accent:'#ff8f61',soft:'rgba(255,143,97,.14)'},
 Products:{label:'PRODUCTS',symbol:'⬡',accent:'#e4b169',soft:'rgba(228,177,105,.15)'},
 Rules:{label:'RULES',symbol:'!',accent:'#ff6b6b',soft:'rgba(255,107,107,.14)'},
};
const DEFAULT_THEME={label:'DISPATCH',symbol:'☷',accent:'#f0dfc1',soft:'rgba(240,223,193,.12)'};
const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.toString():'';}catch{return '';}};
const themeFor=item=>THEMES[(item?.tags||[]).find(tag=>THEMES[tag])]||DEFAULT_THEME;
const shortDate=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleDateString(undefined,{month:'short',day:'numeric'}):'Recent';};
const longDate=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}):'Recent';};
const updatedText=data=>{if(!data?.generatedAt)return 'Update time unavailable';const date=new Date(data.generatedAt);if(!Number.isFinite(date.getTime()))return 'Update time unavailable';return `Last updated ${date.toLocaleString()}`;};

function Badge({item,large=false}){const theme=themeFor(item);return <span className={'news-badge'+(large?' large':'')} style={{'--news-accent':theme.accent,'--news-soft':theme.soft}}><span aria-hidden="true">{theme.symbol}</span>{theme.label}</span>;}
function Tags({tags=[]}){return <div className="news-tags" aria-label="Article tags">{tags.slice(0,4).map(tag=>{const theme=THEMES[tag]||DEFAULT_THEME;return <span key={tag} style={{'--news-accent':theme.accent}}>{tag}</span>;})}</div>;}
function Hero({item,large=false}){const theme=themeFor(item),image=safeUrl(item?.imageUrl);return <div className={'news-category-hero'+(large?' large':'')} style={{'--news-accent':theme.accent,'--news-soft':theme.soft}}><span aria-hidden="true">{theme.symbol}</span><strong>{theme.label}</strong>{image&&<img src={image} alt="" onError={event=>{event.currentTarget.hidden=true;}}/>}</div>;}
function NavButton({children,onClick,label}){return <button className="news-nav-button" type="button" onClick={onClick} aria-label={label||children}>{children}</button>;}

function NewsDetail({item,go,mode}){const theme=themeFor(item),articleUrl=safeUrl(item.articleUrl);return <article className="news-shell news-detail">
 <header className="news-detail-nav"><NavButton onClick={()=>go('news')}>‹ Back</NavButton><strong>Daily Dispatch</strong><NavButton onClick={()=>go('home')}>⌂ Home</NavButton></header>
 <div className="news-detail-body">
  <section className="news-article-heading" style={{'--news-accent':theme.accent}}><Badge item={item}/><p>{item.source||'MTG Dispatch'} <span>•</span> {longDate(item.publishedAt)}</p><h1>{item.title||'MTG News'}</h1></section>
  <Hero item={item} large/>
  <section className="news-copy-card"><span>SAGE SUMMARY</span><p>{item.summary||item.title||'No summary available.'}</p></section>
  <section className="news-copy-card why"><h2><span aria-hidden="true">ϟ</span> WHY IT MATTERS</h2><p>{item.whyItMatters||'Important MTG update.'}</p></section>
  <section className="news-tag-block"><h2>TAGS</h2><Tags tags={item.tags}/></section>
  {articleUrl&&<a className="news-source-button" href={articleUrl} target="_blank" rel="noreferrer">Read Source Article <span aria-hidden="true">↗</span></a>}
  <p className="news-attribution">Summary by Deck Sage from the linked source. {mode==='archive'?'Archived fallback content.':'Daily cached dispatch.'}</p>
 </div>
 </article>;
}

async function getJson(url,signal){const response=await fetch(url,{signal,headers:{Accept:'application/json'}});if(!response.ok)throw Error(`News request failed (${response.status}).`);return response.json();}
function normalizeArchive(snapshot){const articles=Array.isArray(snapshot?.articles)?snapshot.articles:[],newest=articles.map(item=>item.createdAt||item.publishedAt).filter(Boolean).sort().at(-1)||null;return {articles,dispatchDate:newest?.slice(0,10)||null,generatedAt:newest,freshness:'stale',mode:'archive'};}

export function NewsPage({go,articleIndex}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState('');
 const activeRequest=useRef(false);
 const load=useCallback(async(manual=false)=>{
  if(activeRequest.current)return;activeRequest.current=true;manual?setRefreshing(true):setLoading(true);setError('');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const endpoint=window.DECK_SAGE_NEWS?.endpoint;if(!endpoint)throw Error('Daily news is not configured.');const live=await getJson(endpoint+(manual?`?refresh=${Date.now()}`:''),controller.signal);if(!Array.isArray(live?.articles)||!live.articles.length)throw Error('The daily dispatch is empty.');setData({...live,mode:'live'});}
  catch(liveError){
   setError('The live daily dispatch could not be reached.');
   if(!data){try{setData(normalizeArchive(await getJson('/news-snapshot.json')));}catch{setData({articles:[],freshness:'stale',mode:'unavailable'});}}
  }
  finally{clearTimeout(timer);activeRequest.current=false;setLoading(false);setRefreshing(false);}
 },[data]);
 useEffect(()=>{void load(false);},[]);
 const articles=data?.articles||[],selected=useMemo(()=>{const index=Number(articleIndex);return Number.isInteger(index)&&index>=0?articles[index]||null:null;},[articleIndex,articles]);
 if(selected)return <NewsDetail item={selected} go={go} mode={data?.mode}/>;
 const topStory=articles[0],feed=articles.slice(1),archive=data?.mode==='archive',stale=data?.freshness!=='fresh';
 return <div className="news-shell" aria-busy={loading||refreshing}>
  <section className="news-masthead">
   <div className="news-actions"><NavButton onClick={()=>go('home')}>⌂ Home</NavButton><button className="news-refresh" type="button" disabled={refreshing||loading} onClick={()=>load(true)}><span aria-hidden="true">↻</span>{refreshing?'Updating':'Refresh'}</button></div>
   <div className="news-rule"/><p className="news-kicker">Sage Daily Dispatch</p><h1>SAGE DAILY DISPATCH</h1><p className="news-subtitle">MTG news curated daily by Sage</p><p className="news-refresh-text">{archive?'Archived fallback':stale?'Cached dispatch • update delayed':'Updated every 24 hours'} <span>•</span> {updatedText(data)}</p>
  </section>
  {error&&<div className="news-status warning" role="status"><strong>Live update unavailable.</strong> {archive?'Showing the clearly labeled archive fallback.':'Keeping the last loaded dispatch on screen.'}</div>}
  {archive&&<div className="news-status archive" role="status"><strong>Archived fallback.</strong> These stories are preserved from the original app cache and are not presented as today’s news. Source links and dates remain intact.</div>}
  {data?.mode==='live'&&stale&&<div className="news-status warning" role="status"><strong>Update delayed.</strong> This is the last successful daily dispatch from {data.dispatchDate||'an earlier date'}; it is not labeled as today’s news.</div>}
  {loading&&<div className="news-loading"><span className="spinner"/><strong>Sage is reading today’s cached MTG dispatch.</strong></div>}
  {!loading&&topStory&&<>
   <button className="news-top-story" type="button" onClick={()=>go('news/0')}><span className="news-top-accent"/><span className="news-top-header"><strong>TOP STORY</strong><Badge item={topStory} large/></span><Hero item={topStory} large/><span className="news-top-copy"><strong>{topStory.title}</strong><small>{topStory.source||'MTG Dispatch'} <span>•</span> {shortDate(topStory.publishedAt)}</small><span>{topStory.whyItMatters||topStory.summary||'Important MTG update.'}</span></span></button>
   <div className="news-feed-heading"><h2>MORE STORIES</h2><span>{feed.length} briefings</span></div>
   <div className="news-feed">{feed.map((item,index)=>{const theme=themeFor(item);return <button className="news-story" type="button" key={item.id||index} onClick={()=>go(`news/${index+1}`)} style={{'--news-accent':theme.accent}}><span className="news-story-accent"/><span className="news-story-content"><span className="news-story-meta"><Badge item={item}/><small>{item.source||'MTG Dispatch'} <span>•</span> {shortDate(item.publishedAt)}</small></span><strong>{item.title}</strong><span className="news-summary">{item.summary||item.title}</span><span className="news-why"><b>Why it matters</b>{item.whyItMatters||'Important MTG update.'}</span><Tags tags={item.tags}/></span></button>;})}</div>
  </>}
  {!loading&&!topStory&&<div className="news-empty"><span aria-hidden="true">☷</span><h2>Sage has not found any MTG news yet.</h2><button className="news-refresh" type="button" onClick={()=>load(true)}>Try again</button></div>}
  <footer className="news-provenance">Sources are fetched from DailyMTG, Magic Banned &amp; Restricted, Magic.gg, MTGO, EDHREC, Card Kingdom Blog, and MTGGoldfish. Every briefing links to its original publisher.</footer>
 </div>;
}
