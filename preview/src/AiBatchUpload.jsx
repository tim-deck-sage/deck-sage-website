import React,{useEffect,useRef,useState} from 'react';
import {addInventory,positive} from './model';
import {inspectImageDimensions} from './imageMemoryGuard.mjs';
import {aiScanConfig,buildReviewEntries,chooseCandidate,matchScanName,scanAiPhoto,releaseLocalScanner} from './aiScan';

const MAX_FILE_BYTES=12*1024*1024,MAX_TOTAL_BYTES=80*1024*1024;
const stoppedPhotoStates=states=>Object.fromEntries(Object.entries(states).map(([index,value])=>[index,['queued','scanning'].includes(value.status)?{status:'cancelled',error:'Not finished. Retry to scan this photo.'}:value]));
const releaseResult=value=>{for(const prediction of value?.predictions||[])if(prediction.cropUrl?.startsWith('blob:'))URL.revokeObjectURL(prediction.cropUrl);};
function keepLocalCrops(value){
 const predictions=[];
 try{for(const prediction of value.predictions||[]){const {cropBlob,...rest}=prediction;predictions.push({...rest,cropUrl:cropBlob?URL.createObjectURL(cropBlob):rest.cropUrl});}return {...value,predictions};}
 catch(error){releaseResult({predictions});throw error;}
}
function reviewEntryIdentity(entry){
 const cardId=entry.status==='matched'&&(entry.card?.oracleId||entry.card?.id);
 if(cardId)return `card:${cardId}`;
 const name=String(entry.name||'').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 return `name:${name}:${entry.status}`;
}
function mergeReviewEntries(previous,added){
 // A reviewer may have corrected the original detection to a different card.
 // Derive identity from the CURRENT selection, never the original scan key.
 const merged=previous.map(entry=>({...entry,key:reviewEntryIdentity(entry)}));
 for(const source of added){const entry={...source,key:reviewEntryIdentity(source)},existing=merged.find(item=>reviewEntryIdentity(item)===entry.key);if(existing){existing.quantity=positive(existing.quantity)+positive(entry.quantity);existing.photoIndexes=[...new Set([...(existing.photoIndexes||[]),...(entry.photoIndexes||[])])];existing.scanSources=[...(existing.scanSources||[]),...(entry.scanSources||[])];}else merged.push(entry);}
 return merged;
}
function ScanSourceImage({source,photo,index}){
 const [dimensions,setDimensions]=useState(null),[failed,setFailed]=useState(false),url=photo?.url;
 const points=(source.originalPoly||[]).map(point=>Array.isArray(point)?point.join(','):`${point.x},${point.y}`).join(' ');
 return <figure className="scan-source-figure"><figcaption><strong>Photo {source.photoIndex+1}{index?` · match ${index+1}`:''}</strong><span>{photo?.file?.name||'Source photo'}</span></figcaption>{source.cropUrl?<div className="scan-crop"><img src={source.cropUrl} alt={`Actual scanned card crop from Photo ${source.photoIndex+1}`}/></div>:<p className="scan-image-note">No separate crop is available. Use the source photo below.</p>}{source.text&&<p className="scan-image-note">Read from photo: <strong>{source.text}</strong></p>}<details className="scan-source-context" open><summary>Source photo context</summary>{url&&!failed?<div className="scan-source-image"><img src={url} alt={`Source Photo ${source.photoIndex+1} showing where this card was scanned`} onLoad={event=>setDimensions({width:source.sourceWidth||event.currentTarget.naturalWidth,height:source.sourceHeight||event.currentTarget.naturalHeight})} onError={()=>setFailed(true)}/>{dimensions&&points&&<svg aria-hidden="true" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} preserveAspectRatio="xMidYMid meet"><polygon points={points}/></svg>}</div>:<p className="scan-image-note">{failed?'This browser cannot display this source photo. The scan crop is shown above.':'Loading the source photo…'}</p>}</details></figure>;
}
function ScanSourceDialog({entry,photos,onClose}){
 const dialog=useRef(null),closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{
  const element=dialog.current,previous=document.activeElement,marker=`scan-${Date.now()}-${Math.random()}`,url=location.href;
  history.pushState({...history.state,deckSageScanPreview:marker},'',url);element.showModal();
  const popped=()=>{if(history.state?.deckSageScanPreview!==marker)closeRef.current();};window.addEventListener('popstate',popped);
  return()=>{window.removeEventListener('popstate',popped);element.close();if(location.href===url&&history.state?.deckSageScanPreview===marker)history.back();if(previous?.isConnected)previous.focus();};
 },[]);
 const sources=entry.scanSources?.length?entry.scanSources:(entry.photoIndexes||[]).map(photoIndex=>({photoIndex}));
 return <dialog ref={dialog} className="scan-source-dialog" aria-labelledby="scan-source-title" aria-describedby="scan-source-description" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}><header><div><span>YOUR SCAN</span><h2 id="scan-source-title">{entry.name||'Scanned card'}</h2></div><button type="button" autoFocus className="scan-dialog-close" aria-label="Close scan preview" onClick={onClose}>×</button></header><p id="scan-source-description">These are images from your photo, not catalog artwork. Check the printed name, then return to review to correct it.</p><div className="scan-source-grid">{sources.map((source,index)=><ScanSourceImage key={`${source.photoIndex}-${index}`} source={source} photo={photos[source.photoIndex]} index={index}/>)}</div><footer><button type="button" className="button outline" onClick={onClose}>Back to review</button><small>Temporary images are cleared after a confirmed save or when you discard this batch. Your original files stay on your device.</small></footer></dialog>;
}

export function AiBatchUpload({state,go,notify,update,accounts,batchUploads,stageBatchPhoto,batchScan,setBatchScan,completeBatchScan,accountSnapshot,originType,originId,ui}){
 const {Icon,Button,PageHeader,Empty}=ui,requestedDeck=originType==='deck',deck=requestedDeck?state.decks.find(item=>item.id===originId):null,isDeck=Boolean(deck),returnPath=requestedDeck?(isDeck?'decks/'+deck.id:'decks'):'bulk',originLabel=isDeck?deck.name:requestedDeck?'My decks':'My bulk';
 const [errors,setErrors]=useState({}),[previewState,setPreviewState]=useState(()=>Object.fromEntries(batchUploads.map((photo,index)=>photo?[index,'loading']:null).filter(Boolean))),[deckChoice,setDeckChoice]=useState(()=>batchScan.destination==='bulk'||batchScan.destination==='deck'?'':batchScan.destination),[scanPreview,setScanPreview]=useState(null),controllers=useRef(new Map()),reviewController=useRef(null),matchControllers=useRef(new Map()),saveLock=useRef(false),scanLock=useRef(false),generation=useRef(0),mounted=useRef(false);
 const pendingSelections=useRef(new Map()),stagedFiles=useRef(batchUploads),[validating,setValidating]=useState(0);stagedFiles.current=batchUploads;
 const config=aiScanConfig(),stagedCount=batchUploads.filter(Boolean).length,totalBytes=batchUploads.reduce((sum,photo)=>sum+(photo?.file.size||0),0),formatBytes=bytes=>bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;
 const availableDecks=state.decks.filter(item=>!item.deletedAt&&item.status!=='deleted'&&!item.isDraft),busy=['scanning','matching','saving'].includes(batchScan.phase),reviewLocked=busy||batchScan.saved||batchScan.saveApplied,deckDestination=availableDecks.some(item=>item.id===batchScan.destination),destinationValid=batchScan.destination==='bulk'||deckDestination;
 const epoch=accountSnapshot?.epoch??accounts.getSnapshot().epoch;
 useEffect(()=>{
  mounted.current=true;saveLock.current=false;setScanPreview(null);
  return()=>{mounted.current=false;invalidateWork();if(accounts.getSnapshot().epoch===epoch)setBatchScan(current=>['scanning','matching'].includes(current.phase)?{...current,phase:'stage',progress:'',photoStates:stoppedPhotoStates(current.photoStates),error:'Scan stopped when you left this page. Finished photos are kept.'}:current.phase==='saving'?{...current,phase:'review',error:'The save was started before you left this page. Choose Retry save to confirm it without adding another copy.'}:current);};
 },[epoch]);
 function invalidateWork(cancelSelections=true){if(cancelSelections)pendingSelections.current.clear();generation.current++;scanLock.current=false;releaseLocalScanner();for(const controller of controllers.current.values())controller.abort();controllers.current.clear();reviewController.current?.abort();reviewController.current=null;for(const controller of matchControllers.current.values())controller.abort();matchControllers.current.clear();}
 const isCurrent=run=>mounted.current&&generation.current===run&&accounts.getSnapshot().epoch===epoch;
 function discardPhotos(){invalidateWork();setScanPreview(null);setErrors({});setPreviewState({});setDeckChoice('');completeBatchScan('');}
 function backToPhotos(){for(const controller of matchControllers.current.values())controller.abort();matchControllers.current.clear();setScanPreview(null);setBatchScan(current=>({...current,phase:'stage',error:'',entries:current.entries.map(entry=>entry.status==='matching'?{...entry,status:'edited'}:entry)}));}
 function invalidateMatch(id){matchControllers.current.get(id)?.abort();matchControllers.current.delete(id);}


 async function choose(index,event){
  const file=event.target.files?.[0];event.target.value='';if(!file||scanLock.current||busy)return;
  const token=Symbol();pendingSelections.current.set(index,token);
  const current=()=>mounted.current&&accounts.getSnapshot().epoch===epoch&&pendingSelections.current.get(index)===token&&!scanLock.current&&!saveLock.current;
  setValidating(value=>value+1);
  try{
   if(file.size>MAX_FILE_BYTES)throw Error('This photo is larger than 12 MB. Choose a smaller image to protect mobile memory.');
   await inspectImageDimensions(file);
   if(!current())return;
   const total=stagedFiles.current.reduce((sum,photo,photoIndex)=>sum+(photoIndex===index?0:photo?.file.size||0),0)+file.size;
   if(total>MAX_TOTAL_BYTES)throw Error('This batch would exceed 80 MB. Remove or replace another photo first.');
   invalidateWork(false);stageBatchPhoto(index,file);stagedFiles.current=stagedFiles.current.map((photo,photoIndex)=>photoIndex===index?{file}:photo);
   setErrors(value=>({...value,[index]:''}));setPreviewState(value=>({...value,[index]:'loading'}));
  }catch(error){if(current())setErrors(value=>({...value,[index]:error.message||'The browser could not stage this photo. Try another image. No file was uploaded.'}));}
  finally{if(pendingSelections.current.get(index)===token)pendingSelections.current.delete(index);if(mounted.current)setValidating(value=>Math.max(0,value-1));}
 }
 function remove(index){if(scanLock.current||busy)return;invalidateWork();stageBatchPhoto(index,null);setErrors(current=>({...current,[index]:''}));setPreviewState(current=>({...current,[index]:'empty'}));}
 function cancelScan(){invalidateWork();setBatchScan(current=>({...current,phase:'stage',progress:'',photoStates:stoppedPhotoStates(current.photoStates),error:'Scan cancelled. Successful photo results are kept; retry processes only unfinished photos.'}));}

 async function runScan(){
  if(scanLock.current||saveLock.current||busy||pendingSelections.current.size)return;
  if(!config.enabled){setBatchScan(current=>({...current,error:config.reason||'Local scanning is unavailable in this browser. Try a current version of Chrome, Edge, Firefox, or Safari.'}));return;}
  const targets=batchUploads.map((photo,index)=>({photo,index})).filter(({photo,index})=>photo&&batchScan.photoStates[index]?.status!=='success');
  const hasReview=batchScan.reviewBuilt||batchScan.entries.length>0,needsMatching=Object.values(batchScan.photoStates).some(value=>value.status==='success'&&!value.reviewed);
  if(!targets.length&&hasReview&&!needsMatching){setBatchScan(current=>({...current,phase:'review',error:''}));return;}
  if(!targets.length&&!Object.values(batchScan.photoStates).some(value=>value.status==='success'))return;
  invalidateWork();scanLock.current=true;saveLock.current=false;const run=generation.current,results={...batchScan.photoStates},previousEntries=batchScan.entries,newSuccesses={};
  setBatchScan(current=>({...current,phase:targets.length?'scanning':'matching',error:'',progress:targets.length?'Preparing the local scanner…':'Matching names with the card catalog…',saved:false,saveApplied:false,success:'',photoStates:Object.fromEntries(batchUploads.map((photo,index)=>photo?[index,current.photoStates[index]?.status==='success'?current.photoStates[index]:{status:'queued'}]:null).filter(Boolean))}));
  try{
   // One CPU worker processes one photo at a time, including on mobile.
   for(const task of targets){
    if(!isCurrent(run))return;
    const controller=new AbortController();controllers.current.set(task.index,controller);results[task.index]={status:'scanning'};
    setBatchScan(current=>isCurrent(run)?{...current,photoStates:{...current.photoStates,[task.index]:results[task.index]},progress:`Scanning Photo ${task.index+1} on this device…`}:current);
    try{
     const value=await scanAiPhoto({file:task.photo.file,signal:controller.signal,onProgress:progress=>{if(!isCurrent(run))return;const message=typeof progress==='string'?progress:progress?.message||progress?.status||'Reading card names…';setBatchScan(current=>isCurrent(run)?{...current,progress:`Photo ${task.index+1}: ${message}`,photoStates:{...current.photoStates,[task.index]:{status:'scanning',progress:message}}}:current);}});
     if(!isCurrent(run)||controller.signal.aborted)return;
     results[task.index]={status:'success',...keepLocalCrops(value)};newSuccesses[task.index]=results[task.index];
    }catch(error){
     if(!isCurrent(run)||controller.signal.aborted||error.name==='AbortError')return;
     results[task.index]={status:'error',error:error.message||'This photo could not be scanned. Try a clearer image.'};
    }finally{if(controllers.current.get(task.index)===controller)controllers.current.delete(task.index);}
    if(!isCurrent(run)){if(newSuccesses[task.index])releaseResult(newSuccesses[task.index]);return;}
    setBatchScan(current=>{if(!isCurrent(run)){releaseResult(results[task.index]);return current;}return {...current,photoStates:{...current.photoStates,[task.index]:results[task.index]}};});
   }
   if(!isCurrent(run))return;
   const controller=new AbortController();reviewController.current=controller;
   setBatchScan(current=>isCurrent(run)?{...current,phase:'matching',progress:'Matching printed names with the card catalog…'}:current);
   try{
    const unreviewed=Object.fromEntries(Object.entries(results).filter(([,value])=>value.status==='success'&&!value.reviewed));
    const fresh=await buildReviewEntries(hasReview?unreviewed:results,controller.signal);
    if(!isCurrent(run)||controller.signal.aborted)return;
    for(const [index,value] of Object.entries(results))if(value.status==='success')results[index]={...value,reviewed:true};
    const entries=hasReview?mergeReviewEntries(previousEntries,fresh):fresh,failed=Object.values(results).filter(value=>value.status==='error').length;
    setBatchScan(current=>isCurrent(run)?{...current,phase:'review',progress:'',photoStates:results,entries,reviewBuilt:true,error:entries.length?(failed?`${failed} photo${failed===1?' could':'s could'} not be scanned. You can review these results or return to the photos to retry.`:''):'No readable card names were found. Return to the photos and replace unclear images. Photograph cards upright, with even lighting and no overlap.'}:current);
   }finally{if(reviewController.current===controller)reviewController.current=null;}
  }catch(error){if(isCurrent(run)&&error.name!=='AbortError')setBatchScan(current=>({...current,phase:'stage',progress:'',photoStates:results,error:`Card-name matching failed: ${error.message} Your scanned photos are kept; choose Review scanned cards to retry matching.`}));}
  finally{if(isCurrent(run)){scanLock.current=false;releaseLocalScanner();}}
 }

 async function rematch(entry){
  invalidateMatch(entry.id);const controller=new AbortController(),run=generation.current;matchControllers.current.set(entry.id,controller);
  setBatchScan(current=>({...current,entries:current.entries.map(item=>item.id===entry.id?{...item,status:'matching',card:null,candidates:[]}:item),error:''}));
  try{const result=await matchScanName(entry.name,{signal:controller.signal});if(!isCurrent(run)||controller.signal.aborted)return;setBatchScan(current=>isCurrent(run)?{...current,entries:current.entries.map(item=>item.id===entry.id&&item.name===entry.name?{...item,...result}:item)}:current);}
  catch(error){if(!isCurrent(run)||controller.signal.aborted||error.name==='AbortError')return;setBatchScan(current=>({...current,entries:current.entries.map(item=>item.id===entry.id&&item.name===entry.name?{...item,status:'not_found',card:null,candidates:[]}:item),error:`Could not match “${entry.name}”: ${error.message}`}));}
  finally{if(matchControllers.current.get(entry.id)===controller)matchControllers.current.delete(entry.id);}
 }
 async function persistCollection(retryGuest=false){
  let snapshot=accounts.getSnapshot();
  if(snapshot.mode==='guest'){
   if(snapshot.error&&!retryGuest)throw Error(snapshot.error);
   if(snapshot.error&&retryGuest)accounts.edit(current=>current,snapshot.epoch);
   snapshot=accounts.getSnapshot();
   if(snapshot.error)throw Error(snapshot.error);
   return snapshot;
  }
  if(snapshot.mode!=='account')throw Error('The shared username workspace is not ready. Return to Settings and reopen it.');
  return new Promise((resolve,reject)=>{
   let finished=false,started=false,stop=()=>{};
   const timer=setTimeout(()=>finish(Error('Saving timed out. Check your connection and choose Retry save.')),20000);
   function finish(error,value){if(finished)return;finished=true;clearTimeout(timer);stop();error?reject(error):resolve(value);}
   function inspect(current){if(!started||finished)return;if(current.epoch!==epoch||current.mode!=='account')return finish(Error('The active shared username changed before saving finished.'));if(current.conflict)return finish(Error('Another browser changed this username. Resolve the sync conflict in Settings, then retry.'));if(current.error&&['Sync paused','Sync conflict'].includes(current.status))return finish(Error(current.error));if(!current.dirty&&current.status==='Shared collection synced')finish(null,current);}
   stop=accounts.subscribe(inspect);started=true;
   try{Promise.resolve(accounts.sync()).catch(error=>finish(error));inspect(accounts.getSnapshot());}catch(error){finish(error);}
  });
 }
 async function saveReview(){
  const unresolved=batchScan.entries.filter(entry=>entry.status!=='matched'||!entry.card),chosen=batchScan.destination;
  if(unresolved.length){setBatchScan(current=>({...current,error:'Resolve or remove every unknown, uncertain, or ambiguous name before adding cards.'}));return;}
  if(!chosen){setBatchScan(current=>({...current,error:'Choose Add to an existing deck or Add to My Bulk.'}));return;}
  if(chosen==='deck'){setBatchScan(current=>({...current,error:'Choose an existing deck for these cards.'}));return;}
  if(chosen!=='bulk'&&!availableDecks.some(item=>item.id===chosen)){setBatchScan(current=>({...current,error:'That deck is no longer available. Choose another deck or My Bulk.'}));return;}
  if(saveLock.current||batchScan.saved||batchScan.phase==='saving'||!mounted.current||accounts.getSnapshot().epoch!==epoch)return;saveLock.current=true;const run=generation.current;
  setBatchScan(current=>({...current,phase:'saving',error:''}));
  try{
   if(!batchScan.saveApplied){update(current=>chosen==='bulk'?{...current,bulk:batchScan.entries.reduce((inventory,entry)=>addInventory(inventory,entry.card,entry.quantity,'Normal'),current.bulk)}:{...current,decks:current.decks.map(item=>item.id===chosen?{...item,cards:batchScan.entries.reduce((inventory,entry)=>addInventory(inventory,entry.card,entry.quantity,'Normal'),item.cards)}:item)});setBatchScan(current=>({...current,saveApplied:true}));}
   await persistCollection(batchScan.saveApplied);
   if(!isCurrent(run))return;
   const total=batchScan.entries.reduce((sum,entry)=>sum+positive(entry.quantity),0),destinationName=chosen==='bulk'?'My Bulk':availableDecks.find(item=>item.id===chosen)?.name,message=`${total} scanned card${total===1?'':'s'} added to ${destinationName}.`;
   setScanPreview(null);completeBatchScan(message);saveLock.current=false;notify(message);
  }catch(error){if(!isCurrent(run))return;saveLock.current=false;setBatchScan(current=>({...current,phase:'review',saveApplied:true,error:`Save not confirmed. Your reviewed batch is still here, and retrying will not add another copy. ${error.message} Choose Retry save.`}));}
 }

 if(['review','saving','saved'].includes(batchScan.phase))return <><button className="back-link" disabled={reviewLocked} onClick={backToPhotos}>← Back to photos</button><PageHeader eyebrow="LOCAL SCAN REVIEW" title="Review scanned cards" description="Confirm every name and quantity, then choose one destination for this scan."/><section className="ai-review-shell"><div className="ai-review-summary"><div><strong>{batchScan.entries.reduce((sum,entry)=>sum+positive(entry.quantity),0)} cards found</strong><p>Exact and high-confidence catalog matches can be added. Unknown, uncertain, and ambiguous names stay blocked until you correct, choose, or remove them.</p></div></div>{batchScan.entries.length?<div className="ai-review-list">{batchScan.entries.map(entry=><article className="ai-review-row" key={entry.id} data-match-status={entry.status}><div className="ai-review-fields"><label>Card name<input value={entry.name} disabled={reviewLocked} onChange={event=>{invalidateMatch(entry.id);setBatchScan(current=>({...current,entries:current.entries.map(item=>item.id===entry.id?{...item,name:event.target.value,status:'edited',card:null,candidates:[]}:item)}));}}/></label><Button variant="small outline scan-view-button" aria-label={`View scan for ${entry.name||'card'}`} onClick={()=>setScanPreview(entry)}>View scan</Button><label>Quantity<input type="number" min="1" max="999" value={entry.quantity} disabled={reviewLocked} onChange={event=>setBatchScan(current=>({...current,entries:current.entries.map(item=>item.id===entry.id?{...item,quantity:Math.max(1,Math.min(999,Number(event.target.value)||1))}:item)}))}/></label></div><div className="ai-review-status"><span className={'badge '+(entry.status==='matched'?'success':'warning')}>{entry.status==='matched'?`Matched: ${entry.card.name}`:entry.status==='matching'?'Matching…':entry.status==='not_found'?'Unknown card name':entry.status==='ambiguous'?'Ambiguous name':entry.status==='uncertain'?'Uncertain scan':'Needs matching'}</span><small>Photo{entry.photoIndexes.length>1?'s':''} {entry.photoIndexes.map(index=>index+1).join(', ')}</small></div>{entry.candidates?.length>0&&<label className="ai-candidate-select">Choose a catalog match<select defaultValue="" disabled={reviewLocked} onChange={event=>setBatchScan(current=>({...current,entries:current.entries.map(item=>item.id===entry.id?chooseCandidate(item,event.target.value):item)}))}><option value="" disabled>Select a card</option>{entry.candidates.map(candidate=><option key={candidate.oracleId||candidate.id} value={candidate.oracleId||candidate.id}>{candidate.name}</option>)}</select></label>}<div className="ai-review-actions"><Button variant="small outline" disabled={reviewLocked||!entry.name.trim()} onClick={()=>rematch(entry)}>Match name</Button><Button variant="small danger" disabled={reviewLocked} onClick={()=>{invalidateMatch(entry.id);setBatchScan(current=>({...current,entries:current.entries.filter(item=>item.id!==entry.id)}));}}>Remove</Button></div></article>)}</div>:<Empty icon="search" title="No names to review">Return to the photos and retry after improving the images.</Empty>}{batchScan.error&&<p className="ai-scan-error" role="alert">{batchScan.error}</p>}<section className="ai-review-destination" aria-labelledby="ai-review-destination-title"><div className="ai-destination-heading"><span>ADD REVIEWED CARDS</span><h2 id="ai-review-destination-title">Choose one destination</h2><p>Your reviewed names and quantities stay unchanged while you decide where this batch belongs.</p></div><fieldset disabled={reviewLocked}><legend className="sr-only">Where should these cards go?</legend><label className={'ai-destination-option '+((batchScan.destination==='deck'||deckDestination)?'selected':'')}><input aria-label="Add to an existing deck" type="radio" name="ai-batch-destination" checked={batchScan.destination==='deck'||deckDestination} disabled={!availableDecks.length} onChange={()=>setBatchScan(current=>({...current,destination:availableDecks.some(item=>item.id===deckChoice)?deckChoice:'deck',error:''}))}/><span><strong>Add to an existing deck</strong><small>{availableDecks.length?'Pick one of your current decks below.':'No decks are available yet. Choose My Bulk for this batch.'}</small></span></label><label className="ai-deck-picker">Choose the deck<select aria-label="Existing deck destination" value={availableDecks.some(item=>item.id===deckChoice)?deckChoice:''} disabled={!availableDecks.length} onChange={event=>{setDeckChoice(event.target.value);setBatchScan(current=>({...current,destination:event.target.value||'deck',error:''}));}}><option value="">Select a deck</option>{availableDecks.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className={'ai-destination-option '+(batchScan.destination==='bulk'?'selected':'')}><input aria-label="Add to My Bulk" type="radio" name="ai-batch-destination" checked={batchScan.destination==='bulk'} onChange={()=>setBatchScan(current=>({...current,destination:'bulk',error:''}))}/><span><strong>Add to My Bulk</strong><small>Keep all reviewed cards in your unassigned collection.</small></span></label></fieldset></section><div className="ai-review-footer"><Button variant="small danger" disabled={busy} onClick={discardPhotos}>Discard photos</Button><Button variant="outline" disabled={reviewLocked} onClick={backToPhotos}>Back to photos</Button><Button disabled={busy||!batchScan.entries.length||!destinationValid} onClick={saveReview}>{batchScan.phase==='saving'?'Saving cards…':batchScan.saveApplied?'Retry save':'Confirm and add cards'}</Button></div><p className="scan-privacy-footnote">After the collection save is confirmed, temporary photos and crops are cleared. A failed save keeps them here for retry. Your original files are never deleted.</p></section>{scanPreview&&<ScanSourceDialog entry={scanPreview} photos={batchUploads} onClose={()=>setScanPreview(null)}/>}</>;

 return <><button className="back-link" onClick={()=>go(returnPath)}>← Back to {originLabel}</button><PageHeader eyebrow="ON-DEVICE CARD RECOGNITION" title="Batch upload cards" description={`Prepare up to 20 card photos for ${originLabel}, then read their printed names privately on this device.`}/>{batchScan.success&&<div className="ai-scan-success" role="status"><Icon name="check" size={22}/><div><strong>{batchScan.success}</strong><p>The collection save was confirmed. You can add another batch.</p></div></div>}<div className="batch-upload-notice" role="note"><Icon name="upload" size={24}/><div><strong>Your photos stay on this device.</strong><p>Scanning runs locally in your browser. Photos and card crops are never sent for recognition. The first scan downloads about 11 MB of scanner files, then caches them for later use when your browser allows it. Refreshing, closing the tab, or switching usernames clears temporary photos. Your original files stay on your device.</p></div><span aria-live="polite">{stagedCount} / 20 staged{stagedCount?` · ${formatBytes(totalBytes)}`:''}</span></div><section className="ai-scan-controls" aria-label="Local scan controls"><div><span className="ai-spark"><Icon name="spark" size={22}/></span><div><strong>Scan on this device</strong><p>{config.enabled?'One photo is processed at a time using your device’s CPU. JPEG, PNG and static WebP up to 32 MP are supported. Keep this page open. Finished photos are kept when you retry.':config.reason||'Local scanning is not supported by this browser.'}</p>{busy&&<p className="local-scan-progress" role="status" aria-live="polite">{batchScan.progress||'Preparing scan…'}</p>}</div></div><div className="ai-scan-buttons">{!busy&&stagedCount>0&&<Button variant="small danger" disabled={batchScan.saveApplied} onClick={discardPhotos}>Discard photos</Button>}{!busy&&batchScan.entries.length>0&&<Button variant="outline" onClick={()=>setBatchScan(current=>({...current,phase:'review'}))}>Return to review</Button>}{busy?<Button variant="outline" onClick={cancelScan}>Cancel scan</Button>:null}<Button disabled={!stagedCount||busy||validating>0||!config.enabled||batchScan.saveApplied} onClick={runScan}>{stagedCount>0&&batchUploads.every((photo,index)=>!photo||batchScan.photoStates[index]?.status==='success')?'Review scanned cards':Object.values(batchScan.photoStates).some(value=>value.status==='success')?'Retry unfinished photos':'Scan staged photos'}</Button></div></section>{batchScan.error&&<p className="ai-scan-error" role="alert">{batchScan.error}</p>}<section className="batch-photo-list" aria-label="Batch photo slots">{batchUploads.map((photo,index)=>{const number=index+1,status=previewState[index],scanState=batchScan.photoStates[index];return <article className={'batch-photo-slot '+(photo?'has-photo':'')} key={number} data-photo-slot={number}><header><span className="batch-photo-number">{String(number).padStart(2,'0')}</span><div><h2>Photo {number}</h2><p>{photo?'Staged locally. Scanning stays on this device.':'Choose one card photo from this device.'}</p></div>{photo&&<span className={'badge '+(scanState?.status==='success'?'success':scanState?.status==='error'?'warning':'')}>{scanState?.status==='success'?`${(scanState.detectedNames?.length||0)+(scanState.uncertainNames?.length||0)} names`:scanState?.status==='scanning'?'Scanning…':scanState?.status==='queued'?'Queued':scanState?.status==='error'?'Failed':scanState?.status==='cancelled'?'Not finished':'Staged'}</span>}</header>{photo?<div className="batch-photo-staged"><div className="batch-photo-preview">{status!=='unavailable'&&<img src={photo.url} alt={`Preview for Photo ${number}`} onLoad={()=>setPreviewState(current=>({...current,[index]:'ready'}))} onError={()=>setPreviewState(current=>({...current,[index]:'unavailable'}))}/>} {status==='loading'&&<span className="batch-preview-loading"><span className="spinner"/>Preparing preview.</span>}{status==='unavailable'&&<span className="batch-preview-unavailable"><Icon name="upload" size={28}/><strong>Preview unavailable</strong><small>The browser could not display this image, but the original file is still staged.</small></span>}</div><div className="batch-photo-file"><strong>{photo.file.name}</strong><small>{formatBytes(photo.file.size)}</small>{scanState?.progress&&<em className="local-photo-progress">{scanState.progress}</em>}{scanState?.error&&<em>{scanState.error}</em>}</div><div className="batch-photo-actions"><label className="button outline small"><Icon name="upload" size={15}/>Replace photo<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" aria-label={`Replace Photo ${number}`} onChange={event=>choose(index,event)} disabled={busy}/></label><Button variant="small danger" disabled={busy} onClick={()=>remove(index)}>Remove</Button></div></div>:<label className="batch-photo-empty"><Icon name="upload" size={25}/><span><strong>Choose Photo {number}</strong><small>JPEG, PNG or WebP · 12 MB and 32 MP maximum</small></span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" aria-label={`Choose Photo ${number}`} onChange={event=>choose(index,event)} disabled={busy}/></label>}{errors[index]&&<p className="batch-photo-error" role="alert">{errors[index]}</p>}</article>;})}</section></>;
}
