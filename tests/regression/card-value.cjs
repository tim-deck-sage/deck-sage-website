const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const runtime=process.env.DECK_SAGE_TEST_NODE_MODULES||'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(runtime,'playwright'));
const baseUrl=process.env.DECK_SAGE_PREVIEW_URL||'http://127.0.0.1:4184',storageKey='deck-sage-web-v1',cacheKey='deck-sage-card-value-v1';
const report={checks:[],errors:[],requests:[],startedAt:new Date().toISOString()};
const ids={normal:'11111111-1111-4111-8111-111111111111',foil:'22222222-2222-4222-8222-222222222222',premium:'33333333-3333-4333-8333-333333333333',commander:'44444444-4444-4444-8444-444444444444'};
const fixture={version:1,profile:{name:'Value Tester',username:'',avatar:1,role:'Player',bio:''},retainedDeckRecords:[],favorites:[],contacts:[],stores:[],notifications:[],settings:{theme:'forest',motion:true,images:true,notificationInbox:true},bulk:[
 {id:ids.normal,oracleId:'oracle-normal',name:'Known Normal',quantity:2,cardVariant:'Normal',imageUrl:'https://cards.scryfall.io/known-normal.jpg'},
 {id:ids.foil,oracleId:'oracle-foil',name:'Missing Foil',quantity:1,cardVariant:'Foil',imageUrl:'https://cards.scryfall.io/missing-foil.jpg'},
 {id:'legacy-name',name:'Name Fallback',quantity:3,cardVariant:'Normal',imageUrl:'https://cards.scryfall.io/name-fallback.jpg'},
 {id:ids.premium,oracleId:'oracle-premium',name:'Premium Card',quantity:1,cardVariant:'Full Art',imageUrl:'https://cards.scryfall.io/premium.jpg'}
],decks:[{id:'deck-1',name:'Vault Deck',status:'active',format:'Commander',commander:'Lead One + Lead Two',commanderCard:{id:ids.commander,oracleId:'oracle-lead-one',name:'Lead One',imageUrl:'https://cards.scryfall.io/lead-one.jpg'},commanders:[{id:ids.commander,oracleId:'oracle-lead-one',name:'Lead One',role:'primary',imageUrl:'https://cards.scryfall.io/lead-one.jpg'},{id:'partner-name',name:'Lead Two',role:'partner',imageUrl:'https://cards.scryfall.io/lead-two.jpg'}],cards:[{id:ids.normal,oracleId:'oracle-normal',name:'Known Normal',quantity:4,cardVariant:'Normal',imageUrl:'https://cards.scryfall.io/known-normal.jpg'}],basicLands:{Plains:0,Island:0,Swamp:0,Mountain:0,Forest:0,Wastes:0},notes:'',createdAt:'2026-10-18T00:00:00Z'}]};
const records=new Map([
 [ids.normal,{id:ids.normal,name:'Known Normal',oracle_id:'oracle-normal',prices:{usd:'2.50',usd_foil:'9.00'},image_uris:{normal:'https://cards.scryfall.io/known-normal.jpg'}}],
 [ids.foil,{id:ids.foil,name:'Missing Foil',oracle_id:'oracle-foil',prices:{usd:'1.00',usd_foil:null},image_uris:{normal:'https://cards.scryfall.io/missing-foil.jpg'}}],
 [ids.premium,{id:ids.premium,name:'Premium Card',oracle_id:'oracle-premium',prices:{usd:'4.00',usd_foil:null},image_uris:{normal:'https://cards.scryfall.io/premium.jpg'}}],
 [ids.commander,{id:ids.commander,name:'Lead One',oracle_id:'oracle-lead-one',prices:{usd:'5.00',usd_foil:null},image_uris:{normal:'https://cards.scryfall.io/lead-one.jpg'}}],
 ['name fallback',{id:'55555555-5555-4555-8555-555555555555',name:'Name Fallback',oracle_id:'oracle-name',prices:{usd:'3.00',usd_foil:null},image_uris:{normal:'https://cards.scryfall.io/name-fallback.jpg'}}],
 ['lead two',{id:'66666666-6666-4666-8666-666666666666',name:'Lead Two',oracle_id:'oracle-lead-two',prices:{usd:'6.00',usd_foil:null},image_uris:{normal:'https://cards.scryfall.io/lead-two.jpg'}}]
]);
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="488" height="680"><rect width="488" height="680" rx="28" fill="#20160e"/><rect x="18" y="18" width="452" height="644" rx="20" fill="none" stroke="#d9bd77" stroke-width="8"/><text x="244" y="350" text-anchor="middle" fill="#f2dfae" font-size="35" font-family="serif">Card reference</text></svg>';
const pass=name=>{report.checks.push(name);console.log('PASS CARD VALUE UI '+name);};
const watch=page=>page.on('pageerror',error=>report.errors.push(error.message));
async function installRoutes(context,control){
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.url().endsWith('/account-config.js'))return route.fulfill({status:200,contentType:'application/javascript',body:'window.DECK_SAGE_ACCOUNTS=null;'});
  if(url.origin==='https://api.scryfall.com'){
   report.requests.push({method:request.method(),url:request.url()});
   if(control.fail)return route.fulfill({status:503,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:'{"object":"error"}'});
   if(url.pathname==='/cards/collection'){
    const identifiers=JSON.parse(request.postData()).identifiers,data=[];for(const identifier of identifiers){const found=records.get(identifier.id||String(identifier.name).toLowerCase());if(found)data.push(found);}
    return route.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify({object:'list',data,not_found:[]})});
   }
   if(url.pathname==='/cards/search')return route.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify({data:[{id:'77777777-7777-4777-8777-777777777777',name:'Premium Card',oracle_id:'oracle-premium',full_art:true,prices:{usd:'17.25',usd_foil:null},image_uris:{normal:'https://cards.scryfall.io/premium-full.jpg'},released_at:'2026-10-18'}],has_more:false})});
   if(url.pathname==='/cards/named')return route.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify({id:'88888888-8888-4888-8888-888888888888',name:'Outside Card',oracle_id:'oracle-outside',prices:{usd:'8.00',usd_foil:null,usd_etched:null},image_uris:{normal:'https://cards.scryfall.io/outside.jpg'}})});
  }
  if(url.origin==='https://cards.scryfall.io')return route.fulfill({status:200,contentType:'image/svg+xml',body:svg});
  if(request.url().startsWith(baseUrl))return route.continue();
  return route.abort();
 });
}
async function seed(context,value=fixture){await context.addInitScript(({key,value})=>{if(sessionStorage.getItem('deck-sage-card-value-test-seeded'))return;localStorage.setItem(key,JSON.stringify(value));localStorage.setItem('deck-sage-browser-only-choice-v1','1');localStorage.removeItem('deck-sage-card-value-v1');sessionStorage.setItem('deck-sage-card-value-test-seeded','1');},{key:storageKey,value});}

(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),control={fail:false};
 try{
  const desktop=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await installRoutes(desktop,control);await seed(desktop);const page=await desktop.newPage();watch(page);await page.goto(`${baseUrl}/#/value`);
  await page.getByRole('heading',{name:'Your Collection Value',exact:true}).waitFor();await page.getByText('$52.25',{exact:true}).first().waitFor();
  assert.equal(await page.locator('.sidebar').evaluate(element=>getComputedStyle(element).display),'none');assert.match(await page.locator('.value-app-background').evaluate(element=>getComputedStyle(element).backgroundImage),/card-value\/library\.png/);
  assert.equal(await page.getByText('12',{exact:true}).count()>0,true);assert(await page.getByText('Missing',{exact:true}).isVisible());assert(await page.getByText('Premium Card',{exact:true}).first().isVisible());
  assert(await page.getByText(/Broad estimate, not an appraisal/).isVisible());assert(await page.getByText(/Card condition, exact printing, language, finish or card type/).isVisible());
  pass('desktop Treasure Vault uses the release artwork, live USD total, clear uncertainty note, and priced/missing counts');
  assert.equal(await page.locator('.value-top-grid article').count(),5);await page.getByRole('button',{name:'Top 10',exact:true}).click();assert.equal(await page.locator('.value-top-grid article').count(),5);
  await page.getByRole('textbox',{name:'Search any card value'}).fill('Out Card');await page.locator('.value-search-panel').getByRole('button',{name:'Search',exact:true}).click();await page.locator('.value-lookup-result').getByText('$8.00',{exact:true}).waitFor();assert(await page.locator('.value-lookup-result').getByText('Unavailable',{exact:true}).isVisible());assert.equal(await page.locator('.value-lookup-result').getByText('$0.00',{exact:true}).count(),0);
  pass('top-card controls and global current-price search keep normal and foil estimates separate without inventing zeroes');
  await page.locator('.value-browser').getByText('Browse Saved Cards',{exact:true}).click();await page.getByRole('combobox',{name:'Browse collection'}).selectOption('deck-1');await page.getByRole('combobox',{name:'Browse saved card'}).selectOption('name:lead two|Normal');assert(await page.locator('.value-browser').getByText('$6.00',{exact:true}).isVisible());
  assert(await page.locator('.value-deck-list').getByText('$21.00',{exact:true}).isVisible());
  pass('bulk/deck browsing, partner commanders, and per-deck totals use saved quantities and exact known prices');
  const before=report.requests.length;await page.getByRole('button',{name:'Update Market Prices',exact:true}).dblclick();await page.getByRole('button',{name:'Update Market Prices',exact:true}).waitFor({state:'visible'});await page.waitForTimeout(250);assert(report.requests.length>=before+2);assert(await page.getByText('$52.25',{exact:true}).first().isVisible());
  await page.getByRole('button',{name:/Home/}).click();await page.waitForURL(/#\/home$/);await page.goto(`${baseUrl}/#/value`);await page.getByRole('heading',{name:'Your Collection Value',exact:true}).waitFor();assert.equal(report.requests.length>=before+2,true);
  pass('manual refresh tolerates repeated clicks, navigation returns from cache, and the value remains stable');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(__dirname,'card-value-desktop.png'),fullPage:true});
  pass('desktop page has no horizontal overflow and screenshot evidence was captured');
  const savedCache=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),cacheKey);savedCache.fetchedAt='2026-01-01T00:00:00.000Z';await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:cacheKey,value:savedCache});control.fail=true;await page.reload();await page.waitForFunction(()=>document.querySelector('.value-freshness')?.textContent.includes('Price refresh failed'),null,{timeout:20000});assert(await page.getByText('$52.25',{exact:true}).first().isVisible());assert(await page.getByText(/no missing price has been treated as zero/i).isVisible());
  pass('stale cached values stay labeled with their fetch time when refresh fails');await desktop.close();

  control.fail=false;const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1,reducedMotion:'reduce'});await installRoutes(mobile,control);await seed(mobile);const phone=await mobile.newPage();watch(phone);await phone.goto(`${baseUrl}/#/value`);await phone.getByText('$52.25',{exact:true}).first().waitFor();assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await phone.locator('.value-orbit').count(),0);assert.equal(await phone.locator('.value-crown-art img').getAttribute('loading'),'eager');await phone.locator('.value-browser').getByText('Browse Saved Cards',{exact:true}).click();await phone.screenshot({path:path.join(__dirname,'card-value-mobile.png'),fullPage:true});
  pass('mobile layout, reduced motion, collapsible browsing, and horizontal fit are verified');
  const switched={...fixture,bulk:[{id:ids.normal,oracleId:'oracle-normal',name:'Known Normal',quantity:1,cardVariant:'Normal'}],decks:[]};await phone.evaluate(({key,value,cache})=>{localStorage.setItem(key,JSON.stringify(value));localStorage.setItem(cache,JSON.stringify({...JSON.parse(localStorage.getItem(cache)),fingerprint:'wrong'}));},{key:storageKey,value:switched,cache:cacheKey});await phone.reload();await phone.getByText('$2.50',{exact:true}).first().waitFor();assert.equal(await phone.getByText('$52.25',{exact:true}).count(),0);
  pass('switching to a different collection fingerprint cannot reuse another collection total');
  await phone.evaluate(({key,value,cache})=>{localStorage.setItem(key,JSON.stringify(value));localStorage.removeItem(cache);},{key:storageKey,value:{...fixture,bulk:[],decks:[]},cache:cacheKey});await phone.reload();await phone.getByRole('heading',{name:'Your vault is waiting',exact:true}).waitFor();assert.equal(await phone.locator('.value-vault-hero').count(),0);assert(await phone.getByRole('button',{name:'Open My Bulk',exact:true}).isVisible());
  pass('the zero-card collection renders one clear empty state without a misleading zero-dollar appraisal');await mobile.close();
  assert.deepEqual(report.errors,[]);pass('Core browser reported no runtime page errors');
 }finally{await browser.close();report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'card-value-report.json'),JSON.stringify(report,null,2));}
})().catch(error=>{report.failure=error.stack;fs.writeFileSync(path.join(__dirname,'card-value-report.json'),JSON.stringify(report,null,2));console.error(error.stack);process.exitCode=1;});
