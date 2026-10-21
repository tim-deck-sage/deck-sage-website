const assert=require('node:assert/strict'),path=require('path'),fs=require('fs');
const runtime=process.env.DECK_SAGE_TEST_NODE_MODULES||'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(runtime,'playwright'));
const baseUrl=process.env.DECK_SAGE_PREVIEW_URL||'http://127.0.0.1:4184';
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});let checks=0;const pass=n=>{checks++;console.log('PASS AVATAR UI '+n);};
 try{const context=await browser.newContext({viewport:{width:1440,height:1000}});
 // All non-local requests are blocked. The apparent backend below is entirely in memory.
 await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(baseUrl).origin?r.continue():r.abort());
 const serviceOrigin='https://mihmykgxbneuhlcxolzm.supabase.co';
 let row={username:'avatar_fixture',revision:0,state:{version:1,profile:{name:'Avatar fixture',avatar:1},decks:[],bulk:[]}};
 await context.route(serviceOrigin+'/**',async r=>{
  const request=r.request(),name=new URL(request.url()).pathname.split('/').pop();
  const headers={'access-control-allow-origin':new URL(baseUrl).origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'apikey, authorization, content-type, x-client-info'};
  if(request.method()==='OPTIONS')return r.fulfill({status:204,headers});
  if(request.method()!=='POST'||!['ds_shared_load','ds_shared_save'].includes(name))return r.abort();
  const args=request.postDataJSON();assert.equal(args.p_username,'avatar_fixture');
  if(name==='ds_shared_save'){assert.equal(args.p_revision,row.revision);row={username:row.username,revision:row.revision+1,state:args.p_state};}
  return r.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(row)});
 });
 await context.route('**/account-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.DECK_SAGE_ACCOUNTS='+JSON.stringify({url:serviceOrigin,publishableKey:'sb_publishable_avatar_fixture_only',usernameOnlyReady:true})+';'}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(baseUrl+'/#/settings');await page.getByRole('textbox',{name:'Sign-in username',exact:true}).fill('avatar_fixture');await page.getByRole('button',{name:'Sign in with username',exact:true}).click();await page.getByRole('group',{name:'Choose your avatar'}).waitFor();
 assert.equal(await page.locator('.avatar-grid button').count(),19);await page.waitForFunction(()=>[...document.querySelectorAll('.avatar-grid img')].every(i=>i.complete&&i.naturalWidth>0));pass('all 19 original images render');
 const choice=page.getByRole('button',{name:'Choose avatar 7',exact:true});await choice.focus();const saved=page.waitForResponse(r=>r.url().endsWith('/rpc/ds_shared_save')&&r.ok());await page.keyboard.press('Enter');assert.equal(await choice.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.avatar-grid button[aria-pressed=true]').count(),1);pass('keyboard choice and selected-state semantics');await saved;assert.equal(row.state.profile.avatar,7);
 await page.reload();await page.getByRole('button',{name:'Choose avatar 7',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Choose avatar 7',exact:true}).getAttribute('aria-pressed'),'true');await page.goto(baseUrl+'/#/home');assert.equal(await page.locator('.home-profile .avatar-mark').getAttribute('data-avatar'),'7');await page.goBack();await page.getByRole('group',{name:'Choose your avatar'}).waitFor();pass('refresh, header display and browser Back retain selection');
 await page.setViewportSize({width:390,height:844});await page.locator('.avatar-picker').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));for(const b of await page.locator('.avatar-grid button').all()){const box=await b.boundingBox();assert.ok(box.width>=44&&box.height>=44);}fs.mkdirSync('preview/evidence/avatar-qa',{recursive:true});await page.screenshot({path:'preview/evidence/avatar-qa/mobile.png',fullPage:true});pass('390px mobile layout and touch targets');
 await context.route('**/avatars/avatar9.webp',r=>r.abort());await page.reload();await page.waitForFunction(()=>document.querySelector('.avatar-grid [data-avatar="9"] img')?.hidden===true);const nine=page.getByRole('button',{name:'Choose avatar 9',exact:true});await nine.click();assert.equal(await nine.getAttribute('aria-pressed'),'true');assert.ok(await nine.locator('svg').isVisible());await page.getByRole('button',{name:'Choose avatar 8',exact:true}).click();await page.waitForFunction(()=>{const i=document.querySelector('.avatar-preview img');return i&&!i.hidden&&i.naturalWidth>0;});pass('broken artwork falls back and changing selection recovers');
 assert.deepEqual(errors,[]);pass('no browser runtime errors');console.log(JSON.stringify({checks,success:true}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
