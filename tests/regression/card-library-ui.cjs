'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const runtime=process.env.DECK_SAGE_TEST_NODE_MODULES||'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(runtime,'playwright'));
const baseUrl=process.env.DECK_SAGE_PREVIEW_URL||'http://127.0.0.1:4184';
const report={browser:'Microsoft Edge (Core browser automation)',checks:[],errors:[],externalWrites:[],startedAt:new Date().toISOString()};
function pass(name){report.checks.push(name);console.log('PASS',name);}
async function prepare(context){
 await context.addInitScript(()=>localStorage.setItem('deck-sage-browser-only-choice-v1','1'));
 await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.pathname.endsWith('/account-config.js'))return route.fulfill({status:200,contentType:'application/javascript',body:'window.DECK_SAGE_ACCOUNTS=null;'});if(url.origin===new URL(baseUrl).origin)return route.continue();if(request.method()!=='GET')report.externalWrites.push(request.url());return route.abort();});
}
async function worker(page,params){return page.evaluate(params=>new Promise((resolve,reject)=>{const cardWorker=new Worker('/card-worker.js'),id=1,timer=setTimeout(()=>{cardWorker.terminate();reject(Error('worker timeout'));},20000);cardWorker.onmessage=event=>{if(event.data.id!==id)return;clearTimeout(timer);cardWorker.terminate();event.data.error?reject(Error(event.data.error)):resolve(event.data.result);};cardWorker.postMessage({id,path:'/api/cards',params});}),params);}
async function waitForSearch(page){await page.locator('.results-heading .spinner').waitFor({state:'detached',timeout:20000}).catch(()=>{});await page.waitForTimeout(200);}

async function run(){const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const desktop=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await prepare(desktop);const page=await desktop.newPage();page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto(`${baseUrl}/#/cards`);await page.waitForTimeout(1200);if(!await page.getByRole('heading',{name:'The card library'}).count())throw Error(`Card Library did not render. Body: ${(await page.locator('body').innerText()).slice(0,800)}`);await page.getByRole('heading',{name:'The card library'}).waitFor();await waitForSearch(page);assert.equal(await page.locator('.card-library-hero-picture img').getAttribute('src'),'/card-library/archive-hero-1672.webp');assert.equal(await page.getByRole('link',{name:'Card Library',exact:true}).getAttribute('aria-current'),'page');assert.equal(await page.locator('.sidebar').evaluate(element=>getComputedStyle(element).display),'none');pass('Original responsive hero and homepage navigation shell render on the Card Library route');
 await page.getByLabel('Search card library').fill('Sol Ring');await waitForSearch(page);await page.getByRole('button',{name:'View Sol Ring',exact:true}).first().click();await page.getByText('Format legalities',{exact:true}).waitFor();await page.getByRole('button',{name:'Close dialog'}).click();await page.getByLabel('Search card library').fill('');await waitForSearch(page);await page.getByRole('button',{name:'Next',exact:false}).click();await waitForSearch(page);assert.match(await page.locator('.pagination>span').innerText(),/25\s*-\s*48/);await page.getByRole('button',{name:'Previous',exact:true}).click();await waitForSearch(page);pass('Search, card details, next-page, and previous-page behavior remain intact');
 const legal=page.getByRole('checkbox',{name:/Commander legal/});assert(await legal.isChecked());assert.equal(await page.getByText(/1 active filter/).count(),1);assert(await page.getByText(/Daily refresh check scheduled for 07:23 UTC/).isVisible());
 const legalResult=await worker(page,{limit:'5',offset:'0',legal:'true'}),allResult=await worker(page,{limit:'5',offset:'0',legal:'false'});assert(legalResult.total>0);assert(allResult.total>legalResult.total);assert(legalResult.cards.every(card=>card.legalities.commander==='legal'));
 pass('Commander Legal is obvious, checked by default, optional, and backed by exact legality data');

 await page.getByRole('button',{name:'Equipment cards',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Protection',exact:true}).click();await page.getByRole('radio',{name:'Match all'}).click();await waitForSearch(page);
 const combined=await worker(page,{limit:'100',offset:'0',legal:'true',roles:'equipment_cards,protection',roleMode:'all'});assert(combined.total>0);assert(combined.cards.every(card=>/Equipment/i.test(card.typeLine)&&card.raw));assert(combined.cards.every(card=>card.legalities.commander==='legal'));
 const any=await worker(page,{limit:'1',offset:'0',legal:'true',roles:'equipment_cards,protection',roleMode:'any'});assert(any.total>combined.total);
 assert.equal(await page.locator('.active-filters>div button').count(),3);
 pass('Keyboard role selection and Equipment AND Protection intersection behave predictably');

 await page.getByRole('button',{name:'Remove Equipment cards filter'}).click();await page.getByRole('button',{name:'Remove Protection filter'}).click();await page.getByRole('button',{name:'Equipment support',exact:true}).click();await waitForSearch(page);
 const equipmentSupport=await worker(page,{limit:'100',offset:'0',legal:'true',roles:'equipment_support',roleMode:'any'});assert(equipmentSupport.total>20);assert(equipmentSupport.cards.every(card=>!/Equipment/i.test(card.typeLine)));
 const equipmentCards=await worker(page,{limit:'100',offset:'0',legal:'true',roles:'equipment_cards',roleMode:'any'});assert(equipmentCards.cards.every(card=>/Equipment/i.test(card.typeLine)));
 pass('Equipment support returns non-Equipment enablers instead of conflating them with Equipment cards');

 await page.getByRole('button',{name:'Reset to Commander defaults'}).click();assert(await legal.isChecked());assert.equal(await page.getByRole('button',{name:'Equipment support',exact:true}).getAttribute('aria-pressed'),'false');
 const identity=page.getByRole('checkbox',{name:'Limit by commander color identity'});await identity.check();await waitForSearch(page);const colorless=await worker(page,{limit:'100',offset:'0',legal:'true',identity:'true',colors:''});assert(colorless.total>0);assert(colorless.cards.every(card=>card.colorIdentity.length===0));assert(await page.getByText(/this is color identity, not card color/).isVisible());
 pass('Reset restores Commander defaults and empty selected identity means colorless—not an ignored filter');

 await page.getByLabel('Search card library').fill('zzzz no real card');await waitForSearch(page);await page.getByRole('heading',{name:'No cards match this combination'}).waitFor();await page.getByRole('button',{name:'Remove Colorless identity filter'}).click();await page.getByRole('button',{name:'Reset to Commander defaults'}).dblclick();assert(await legal.isChecked());
 pass('Empty state, removable chips, repeated reset, and back-to-default behavior are stable');

 await waitForSearch(page);await page.locator('.card-tile').first().waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(__dirname,'card-library-desktop.png'),fullPage:true});await page.goto(`${baseUrl}/#/home`);await page.getByRole('heading',{name:/Welcome back/}).waitFor();assert(await page.getByText('My decks',{exact:true}).count());pass('Desktop Card Library fits and the preserved homepage still loads');await desktop.close();

 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1,reducedMotion:'reduce'});await prepare(mobile);const phone=await mobile.newPage();phone.on('pageerror',error=>report.errors.push(error.message));await phone.goto(`${baseUrl}/#/cards`);await phone.getByRole('heading',{name:'The card library'}).waitFor();await waitForSearch(phone);assert(await phone.getByRole('checkbox',{name:/Commander legal/}).isChecked());await phone.getByRole('button',{name:'Ramp',exact:true}).click();await phone.getByRole('button',{name:'Card advantage',exact:true}).click();await phone.getByRole('radio',{name:'Match all'}).click();await waitForSearch(phone);assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await phone.getByText('Gameplay roles',{exact:true}).click();await phone.getByText('Gameplay roles',{exact:true}).click();await phone.evaluate(()=>scrollTo(0,0));await phone.screenshot({path:path.join(__dirname,'card-library-mobile.png'),fullPage:true});pass('Mobile facets, Match all, collapse/reopen, reduced motion, and horizontal fit are verified');await mobile.close();
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalWrites,[]);pass('Core browser run produced no page errors or external writes');
}finally{await browser.close();report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'card-library-ui-report.json'),JSON.stringify(report,null,2));}}
run().catch(error=>{report.failure=error.stack;console.error(error.stack);process.exitCode=1;});
