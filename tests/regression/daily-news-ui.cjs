const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const runtime=process.env.DECK_SAGE_TEST_NODE_MODULES||'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(runtime,'playwright'));
const baseUrl=process.env.DECK_SAGE_PREVIEW_URL||'http://127.0.0.1:4184';
const endpoint='https://mihmykgxbneuhlcxolzm.supabase.co/functions/v1/website-daily-news';
const report={browser:'Microsoft Edge (Playwright msedge channel)',checks:[],errors:[],startedAt:new Date().toISOString()};
const fixture={dispatchDate:'2026-10-18',generatedAt:'2026-10-18T06:15:00.000Z',freshness:'fresh',articles:Array.from({length:7},(_,index)=>({id:`fixture-${index}`,rank:index+1,title:index===0?'Commander Rules Update Leads the Dispatch':`MTG briefing ${index+1}`,summary:`A concise source-grounded summary for story ${index+1}.`,whyItMatters:`Players can use story ${index+1} when planning their next game.`,tags:index%2?['Arena','Competitive']:['Commander','Rules'],imageUrl:null,articleUrl:`https://magic.wizards.com/en/news/fixture-${index}`,publishedAt:`2026-10-${String(18-index).padStart(2,'0')}T05:00:00.000Z`,source:index%2?'Magic.gg':'DailyMTG'}))};
function pass(name){report.checks.push(name);console.log('PASS',name);}
async function prepare(context,live=true){
 await context.addInitScript(()=>localStorage.setItem('deck-sage-browser-only-choice-v1','1'));
 await context.route('**/account-config.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.DECK_SAGE_ACCOUNTS=null;'}));
 if(live)await context.route(`${endpoint}*`,async route=>{report.liveReads=(report.liveReads||0)+1;await new Promise(resolve=>setTimeout(resolve,80));return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify(fixture)});});
 else await context.route(`${endpoint}*`,route=>route.abort('failed'));
}
async function run(){
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const desktop=await browser.newContext({viewport:{width:1440,height:1000}});await prepare(desktop,true);const page=await desktop.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(`${baseUrl}/#/news`);await page.getByRole('heading',{name:'SAGE DAILY DISPATCH',exact:true}).waitFor();await page.locator('.news-top-story').waitFor();
  assert.equal(await page.locator('.news-top-story').count(),1);assert.equal(await page.locator('.news-story').count(),6);assert.match(await page.locator('.news-refresh-text').textContent(),/Updated every 24 hours/);assert.equal(await page.getByText('Commander Rules Update Leads the Dispatch',{exact:true}).count(),1);pass('Desktop renders the app-matched top story and six cached briefings');
  await page.getByRole('button',{name:'Refresh',exact:true}).evaluate(button=>{button.click();button.click();});await page.waitForFunction(()=>document.querySelector('.news-refresh')?.textContent.includes('Refresh'));assert.equal(report.liveReads,2);pass('Repeated Refresh clicks coalesce and only re-read the shared cache');
  await page.locator('.news-story').first().click();await page.waitForURL(/#\/news\/1$/);await page.getByRole('heading',{name:'MTG briefing 2',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:/Read Source Article/}).getAttribute('target'),'_blank');assert.match(await page.locator('.news-attribution').textContent(),/Daily cached dispatch/);pass('Story detail preserves summary, attribution, source link, and route');
  await page.getByRole('button',{name:/Back/}).click();await page.waitForURL(/#\/news$/);await page.getByRole('heading',{name:'SAGE DAILY DISPATCH',exact:true}).waitFor();await page.getByRole('button',{name:/Home/}).click();await page.getByRole('heading',{name:/Welcome back/}).waitFor();pass('Back and Home navigation preserve the existing homepage');
  await page.goto(`${baseUrl}/#/news`);await page.getByRole('heading',{name:'SAGE DAILY DISPATCH',exact:true}).waitFor();await page.locator('.news-top-story').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));await page.screenshot({path:path.join(__dirname,'daily-news-desktop.png'),fullPage:true});pass('Desktop news layout has no horizontal overflow');await desktop.close();

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await prepare(mobile,true);const phone=await mobile.newPage();phone.on('pageerror',error=>report.errors.push(error.message));await phone.goto(`${baseUrl}/#/news`);await phone.getByRole('heading',{name:'SAGE DAILY DISPATCH',exact:true}).waitFor();await phone.locator('.news-top-story').waitFor();assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));await phone.locator('.news-top-story').click();await phone.getByRole('heading',{name:'Commander Rules Update Leads the Dispatch',exact:true}).waitFor();await phone.screenshot({path:path.join(__dirname,'daily-news-mobile-detail.png'),fullPage:true});await phone.getByRole('button',{name:/Back/}).click();await phone.locator('.news-top-story').waitFor();pass('Mobile list/detail/back flow is responsive and overflow-free');await mobile.close();

  const fallback=await browser.newContext({viewport:{width:1100,height:900}});await prepare(fallback,false);const offline=await fallback.newPage();offline.on('pageerror',error=>report.errors.push(error.message));await offline.goto(`${baseUrl}/#/news`);await offline.getByText('Archived fallback.',{exact:true}).first().waitFor();assert.match(await offline.locator('.news-status.archive').textContent(),/not presented as today’s news/);assert((await offline.locator('.news-top-story').count())===1);pass('Network failure shows the dated archive fallback without calling it today’s news');await fallback.close();
  assert.deepEqual(report.errors,[]);pass('No browser runtime errors');
 }finally{await browser.close();report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'daily-news-report.json'),JSON.stringify(report,null,2));}
}
run().catch(error=>{report.failure=error.stack;fs.writeFileSync(path.join(__dirname,'daily-news-report.json'),JSON.stringify(report,null,2));console.error(error.stack);process.exitCode=1;});
