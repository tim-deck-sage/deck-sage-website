import React,{useState,useEffect,useRef} from 'react';
let captchaScript;

function Captcha({onToken}){
 const ref=useRef();
 useEffect(()=>{
  const key=window.DECK_SAGE_ACCOUNTS?.turnstileSiteKey;if(!key)return;
  let widget,cancelled=false;
  const render=()=>{if(!cancelled)widget=window.turnstile.render(ref.current,{sitekey:key,callback:onToken,'expired-callback':()=>onToken(''),'error-callback':()=>onToken('')});};
  if(window.turnstile)render();else{
   captchaScript ||= new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=resolve;script.onerror=()=>{captchaScript=null;reject(Error('Verification unavailable'));};document.head.append(script);});
   captchaScript.then(render).catch(()=>onToken(''));
  }
  return()=>{cancelled=true;if(widget!==undefined)window.turnstile?.remove(widget);};
 },[]);
 return <div ref={ref}/>;
}

export function CoreAccountPanel({accounts,backend,snapshot,initialMode='signin'}){
 const [mode,setMode]=useState(initialMode),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[email,setEmail]=useState(''),[zip,setZip]=useState(''),[terms,setTerms]=useState(false),[privacy,setPrivacy]=useState(false),[captcha,setCaptcha]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[challenge,setChallenge]=useState(0);
 async function run(action){setBusy(true);setMessage('');try{await action();}catch(error){setMessage(error.message?.includes('USERNAME_UNAVAILABLE')?'That username is unavailable. Choose another.':error.message?.includes('CONSENT')?'Accept the agreements to continue.':'Unable to complete this request. Check your details or try again later.');}finally{setBusy(false);setPassword('');setCaptcha('');setChallenge(value=>value+1);}}
 const onboarding=snapshot.mode==='onboarding',recovery=snapshot.mode==='recovery';
 if(snapshot.mode==='loading')return <section className="panel account-panel"><h2>Checking your account</h2><p role="status">Please wait.</p><a href="#/home">Browse the public homepage</a></section>;
 if(snapshot.mode==='locked')return <section className="panel account-panel"><h2>Your account is hidden</h2><p>Sign out to finish clearing this session, then sign in again.</p><button className="button" disabled={!backend||busy} onClick={()=>run(()=>accounts.logout())}>Finish signing out</button><a href="#/home">Browse the public homepage</a>{message&&<p role="status">{message}</p>}</section>;
 if(snapshot.mode==='account')return <section className="panel account-panel"><h2>Your Deck Sage account</h2><p>Signed in as @{snapshot.username}. Your collection and ZIP code are private.</p><button className="button outline" disabled={busy} onClick={()=>run(()=>accounts.logout())}>Sign out</button>{snapshot.dirty&&<p>Some changes have not synced. Export a backup in Settings before signing out.</p>}{message&&<p role="alert">{message}</p>}</section>;
 return <section className="panel account-panel"><span className="eyebrow">YOUR SANCTUM AWAITS</span><h2>{recovery?'Choose a new password':onboarding?'Finish your new account':mode==='signup'?'Create your Deck Sage account':mode==='recover'?'Recover your account':'Sign in to Deck Sage'}</h2><p>Browse the public library freely. Sign in to keep your decks, cards, and collection tools together.</p>
 {!backend&&<p role="status">Secure accounts are being prepared. Public browsing is available.</p>}
 {message&&<p role="status">{message}</p>}
 {snapshot.mode==='locked'&&<button className="button outline" disabled={!backend||busy} onClick={()=>run(()=>accounts.logout())}>Finish signing out</button>}
 <form onSubmit={event=>{event.preventDefault();run(async()=>{
  if(recovery){await accounts.resetPassword(password);location.hash='/account';setMessage('Password updated. Sign in with your new password.');}
  else if(onboarding)await accounts.onboard(username,zip,terms,privacy);
  else if(mode==='signup'){await backend.signUp({username,password,email,zip,terms,privacy,captchaToken:captcha});setMessage('If signup is available, check your email to verify it. After verification, confirm your username and ZIP to finish setup.');}
  else if(mode==='recover'){await backend.recover(email,captcha);setMessage('If an account uses this email, a recovery message will be sent.');}
  else await accounts.signIn(username,password,captcha);
 });}}>
 {(onboarding||mode!=='recover')&&!recovery&&<label>Username<input autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" value={username} onChange={e=>setUsername(e.target.value)}/></label>}
 {!onboarding&&(mode!=='recover'||recovery)&&<label>Password<input type="password" autoComplete={mode==='signup'||recovery?'new-password':'current-password'} required minLength={mode==='signup'||recovery?12:1} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/></label>}
 {!onboarding&&!recovery&&(mode==='signup'||mode==='recover')&&<label>Email for recovery<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {(onboarding||mode==='signup')&&!recovery&&<><label>US ZIP code<input type="text" inputMode="numeric" autoComplete="postal-code" required pattern="[0-9]{5}" minLength={5} maxLength={5} value={zip} onChange={e=>setZip(e.target.value)}/></label><p>Your ZIP is stored privately for future geographic advertising. It is never a password. We do not collect a street address or give advertisers your email or ZIP. Geographic advertising is not active.</p><label className="check-label"><input type="checkbox" required checked={terms} onChange={e=>setTerms(e.target.checked)}/>I agree to the <a href="/terms-of-use/">Terms of Use</a>.</label><label className="check-label"><input type="checkbox" required checked={privacy} onChange={e=>setPrivacy(e.target.checked)}/>I acknowledge the <a href="/privacy-policy/">Privacy Policy</a>.</label><p>Usernames are case insensitive. Old beta collections are retained separately; a matching username does not grant access.</p></>}
 {!onboarding&&!recovery&&backend&&<Captcha key={challenge} onToken={setCaptcha}/>}
 <button className="button" disabled={busy||!backend||(!onboarding&&!recovery&&!captcha)}>{busy?'Please wait…':recovery?'Save new password':onboarding?'Finish account setup':mode==='signup'?'Create account':mode==='recover'?'Send recovery link':'Sign in'}</button>
 </form>
 {!onboarding&&!recovery&&<div className="inline-actions">{[['signin','Sign in'],['signup','Create account'],['recover','Forgot password?']].map(([key,label])=><button type="button" className="text-button" key={key} onClick={()=>{setMode(key);setMessage('');setPassword('');}}>{label}</button>)}</div>}
 <a href="#/home">Return to the public homepage</a>
 </section>;
}
