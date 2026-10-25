const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const runtime=process.env.DECK_SAGE_TEST_NODE_MODULES||'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(runtime,'playwright'));
const root=path.resolve('preview/public'),types={'.js':'application/javascript','.mjs':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const target=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'});fs.createReadStream(target).pipe(res);});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,channel:'msedge'});const errors=[],external=[];try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('**/*',route=>{if(new URL(route.request().url()).origin===base)return route.continue();external.push(route.request().url());return route.abort();});
 for(const config of ['account','publisher','news','coach'])await context.route('**/'+config+'-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.DECK_SAGE_'+(config==='account'?'ACCOUNTS':config.toUpperCase())+'=null;'}));
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 for(const route of ['home','cards','precons','combos','lore','songs','news','help']){
  await page.goto(base+'/#/'+route);await page.locator('main').waitFor();assert.equal(await page.locator('main .account-panel').count(),0,route+' stays public');
 }
 console.log('PASS eight public routes render without account gates');
 for(const route of ['decks','decks/private-id','bulk','value','batch-upload/bulk','friends','stores','settings','notifications','advertise','commander-swap','sage']){
  await page.goto(base+'/#/'+route);await page.getByRole('heading',{name:'Sign in to Deck Sage',exact:true}).waitFor();assert.equal(await page.locator('main .account-panel').count(),1,route+' gates deep link');
 }
 console.log('PASS twelve private direct links require sign-in, including advertising');
 await page.getByRole('button',{name:'Create account',exact:true}).click();assert.equal(await page.getByLabel('US ZIP code',{exact:true}).getAttribute('type'),'text');assert.equal(await page.getByLabel('US ZIP code',{exact:true}).getAttribute('pattern'),'[0-9]{5}');assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'password');assert(await page.getByLabel('Email for recovery').isVisible());assert.equal(await page.getByRole('checkbox').isChecked().catch(()=>false),false);
 fs.mkdirSync('preview/evidence/core-security',{recursive:true});await page.screenshot({path:'preview/evidence/core-security/signup-desktop.png',fullPage:true});
 await page.goto(base+'/#/home');await page.locator('.editorial-home').waitFor();await page.screenshot({path:'preview/evidence/core-security/home-public-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/#/advertise');await page.getByRole('heading',{name:'Sign in to Deck Sage',exact:true}).waitFor();await page.screenshot({path:'preview/evidence/core-security/advertise-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.equal(external.filter(url=>/supabase.co\/(rest|auth|functions)/.test(url)).length,0);assert.deepEqual(errors,[]);
 fs.writeFileSync('preview/evidence/core-security/ui-report.json',JSON.stringify({publicRoutes:8,privateDeepLinks:12,externalRequestsBlocked:external.length,pageErrors:errors,hostedMutations:0},null,2));console.log('PASS signup fields, unchecked agreements, mobile layout, public homepage and zero hosted Auth/API calls');
 }finally{await browser.close();server.close();}})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
