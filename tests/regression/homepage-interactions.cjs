const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const runtime=process.env.DECK_SAGE_TEST_NODE_MODULES||'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(runtime,'playwright'));
const base=process.env.DECK_SAGE_PREVIEW_URL||'http://127.0.0.1:4297',origin='https://mihmykgxbneuhlcxolzm.supabase.co',evidence='preview/evidence/editorial-interactions';
const {fixtures}=require('./commander-swap-fixtures.cjs');const {mana,tokens,spells}=fixtures();
const initial={version:1,profile:{name:'Planeswalker',avatar:7},decks:[mana,tokens,spells],bulk:[{name:'Sol Ring',quantity:12},{name:'Forest',quantity:30}],notifications:[{id:'fixture',text:'Your next chapter awaits',date:'2026-10-22',read:false}]};
const expected=['decks','bulk','cards','batch-upload/bulk','sage','precons','combos','commander-swap','value','lore','songs','news','friends','stores'];
const report={checks:[],errors:[],writes:[],assets:[],screenshots:[]};function pass(n){report.checks.push(n);console.log('PASS HOME '+n);}
(async()=>{fs.mkdirSync(evidence,{recursive:true});const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});let empty=false,delay=0;
 await context.route('**/*',r=>{const q=r.request();if(new URL(q.url()).origin===new URL(base).origin)return r.continue();if(q.method()!=='GET'&&q.url()!=='https://api.scryfall.com/cards/collection')report.writes.push(q.url());return r.abort();});
 await context.route('**/account-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.DECK_SAGE_ACCOUNTS='+JSON.stringify({url:origin,publishableKey:'sb_publishable_editorial_fixture_only',usernameOnlyReady:true})+';'}));
 await context.route(origin+'/**',async r=>{const q=r.request(),headers={'access-control-allow-origin':new URL(base).origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'apikey, authorization, content-type, x-client-info'};if(q.method()==='OPTIONS')return r.fulfill({status:204,headers});assert.equal(new URL(q.url()).pathname.split('/').pop(),'ds_shared_load','Homepage navigation must not save or mutate an account');if(delay)await new Promise(resolve=>setTimeout(resolve,delay));return r.fulfill({headers,contentType:'application/json',body:JSON.stringify({username:'home_fixture',revision:0,state:empty?{...initial,decks:[],bulk:[],notifications:[]}:initial})});});
 for(const config of ['publisher','news','coach'])await context.route('**/'+config+'-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.DECK_SAGE_'+config.toUpperCase()+'=null;'}));
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const home=async()=>{await page.goto(base+'/#/home');await page.locator('.editorial-home').waitFor();};
 await page.goto(base+'/#/settings');await page.getByRole('textbox',{name:'Sign-in username',exact:true}).fill('home_fixture');await page.getByRole('button',{name:'Sign in with username',exact:true}).click();await page.getByRole('group',{name:'Choose your avatar'}).waitFor();await home();

 const sharp=require(path.join(runtime,'sharp'));
 const selectors=['.editorial-hero .editorial-action','[data-feature-route="decks"] .editorial-action','[data-feature-route="cards"] .editorial-action'];
 const labels=['Primary on emerald','Primary on ivory','Secondary text link'];const captures=[];
 for(let row=0;row<selectors.length;row++){
  const a=page.locator(selectors[row]);await a.scrollIntoViewIfNeeded();await page.mouse.move(1430,5);await page.waitForTimeout(190);const b=await a.boundingBox();const clip={x:Math.max(0,b.x-10),y:Math.max(0,b.y-85),width:420,height:160};const layout=await a.evaluate(n=>({w:n.offsetWidth,h:n.offsetHeight,href:n.getAttribute('href')}));assert(layout.h>=44);assert(await a.isVisible());
  for(let col=0;col<3;col++){
   if(col===1){await a.hover();await page.waitForTimeout(200);assert.notEqual(await a.evaluate(n=>getComputedStyle(n).transform),'none');}
   if(col===2){await page.mouse.down();await page.waitForTimeout(180);assert.notEqual(await a.evaluate(n=>getComputedStyle(n).transform),'none');}
   captures.push({input:await page.screenshot({clip}),left:col*420,top:45+row*195});
   assert.deepEqual(await a.evaluate(n=>({w:n.offsetWidth,h:n.offsetHeight,href:n.getAttribute('href')})),layout);
  }
  await page.mouse.move(1430,5);await page.mouse.up();
 }
 for(let col=0;col<3;col++)captures.push({input:Buffer.from('<svg width="420" height="45"><rect width="420" height="45" fill="#122c2e"/><text x="20" y="29" fill="#f4e9d1" font-size="18" font-family="Arial">'+['DEFAULT','HOVER','PRESSED'][col]+'</text></svg>'),left:col*420,top:0});
 for(let row=0;row<3;row++)captures.push({input:Buffer.from('<svg width="1260" height="35"><rect width="1260" height="35" fill="#122c2e"/><text x="20" y="23" fill="#f4e9d1" font-size="16" font-family="Arial">'+labels[row]+'</text></svg>'),left:0,top:205+row*195});
 await sharp({create:{width:1260,height:630,channels:3,background:'#122c2e'}}).composite(captures).png().toFile(evidence+'/button-states.png');pass('Actual primary and secondary default, hover and pressed states captured without layout shifts or route changes');
 await page.locator('[data-feature-route="precons"]').scrollIntoViewIfNeeded();await page.locator('[data-feature-route="precons"] img').evaluate(n=>n.decode());await page.mouse.move(1430,5);const region=await page.locator('[data-feature-route="precons"]').evaluate(n=>({y:n.getBoundingClientRect().top+scrollY,h:n.getBoundingClientRect().height}));await page.screenshot({path:evidence+'/buttons-in-context.png',fullPage:true,clip:{x:0,y:region.y,width:1440,height:Math.min(1450,region.h+250)}});
 const art=page.locator('[data-feature-route="combos"] .editorial-art');await art.scrollIntoViewIfNeeded();const dims=await art.evaluate(n=>[n.offsetWidth,n.offsetHeight]);await art.hover();await page.waitForTimeout(310);const matrix=await art.evaluate(n=>getComputedStyle(n).transform);assert(matrix.startsWith('matrix(1.02'));assert.deepEqual(await art.evaluate(n=>[n.offsetWidth,n.offsetHeight]),dims);pass('Art hover scales to 1.02 without changing layout dimensions');
 await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(1430,5);await art.hover();assert.equal(await art.evaluate(n=>getComputedStyle(n).transform),'none');assert.equal(await art.evaluate(n=>getComputedStyle(n).transitionDuration),'0s');const a=page.locator(selectors[0]);await a.hover();await page.mouse.down();assert.equal(await a.evaluate(n=>getComputedStyle(n).transform),'none');assert.equal(await a.evaluate(n=>getComputedStyle(n).transitionDuration),'0s');await page.mouse.move(1430,5);await page.mouse.up();pass('Reduced-motion disables image, hover and pressed transforms/transitions');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.keyboard.press('Tab');await a.focus();assert.notEqual(await a.evaluate(n=>getComputedStyle(n).outlineStyle),'none');await a.press('Enter');await page.waitForURL(/#\/decks$/);await home();pass('Refined primary button preserves visible keyboard focus and native navigation');
 await page.setViewportSize({width:390,height:844});await page.locator('[data-feature-route="decks"]').scrollIntoViewIfNeeded();await page.screenshot({path:evidence+'/mobile-button.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));pass('Mobile button hit targets and layout remain contained');assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);
 await context.close();
}finally{await browser.close();fs.writeFileSync(evidence+'/report.json',JSON.stringify(report,null,2));}})().catch(e=>{console.error(e);process.exitCode=1;});
