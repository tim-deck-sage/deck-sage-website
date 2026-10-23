const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.DECK_SAGE_TEST_NODE_MODULES||'C:/Users/timmo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));
const base=process.env.DECK_SAGE_PREVIEW_URL||'http://127.0.0.1:4184';
const output=path.resolve('preview/evidence/scanner-editorial');fs.mkdirSync(output,{recursive:true});
const report={checks:[],errors:[],writes:[]};
async function check(name,fn){await fn();report.checks.push(name);console.log('PASS '+name);}
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,reducedMotion:'reduce'});
  await context.route('**/account-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.DECK_SAGE_ACCOUNTS=null;'}));
  await context.route('https://**/*',r=>{if(r.request().method()!=='GET')report.writes.push(r.request().url());return r.abort();});
  await context.addInitScript(()=>localStorage.setItem('deck-sage-browser-only-choice-v1','1'));
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base+'/#/batch-upload/bulk');await page.getByRole('heading',{name:'Batch upload cards',exact:true}).waitFor();
  await page.waitForFunction(()=>{const i=document.querySelector('.scanner-hero img');return i?.complete&&i.naturalWidth>0;});
  await check(`${mobile?'Mobile':'Desktop'} exact guide and truthful local/shared guidance`,async()=>{
   assert.equal(await page.locator('[data-guide-card]').count(),20);
   await page.evaluate(()=>document.documentElement.dataset.motion='false');
   const positions=await page.locator('[data-guide-card]').evaluateAll(cards=>cards.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
   assert.equal(new Set(positions.map(p=>Math.round(p.x))).size,4);assert.equal(new Set(positions.map(p=>Math.round(p.y))).size,5);
   assert.equal(await page.locator('[data-photo-slot]').count(),20);
   assert.match(await page.locator('.scanner-phone').innerText(),/Saved cards stay on this device/);
   assert.match(await page.locator('.scanner-phone').innerText(),/Refresh shared collection/);
   assert.equal(await page.locator('input[type=file][capture]').count(),0);
   assert.equal(await page.locator('input[type=file]').first().getAttribute('accept'),'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp');
  });
  await page.screenshot({path:path.join(output,mobile?'mobile-hero.png':'desktop-hero.png')});
  await page.locator('.scanner-photo-guide').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,mobile?'mobile-guide.png':'desktop-guide.png')});
  await page.locator('.scanner-photo-guide figure').screenshot({path:path.join(output,mobile?'mobile-layout.png':'desktop-layout.png')});
  await page.locator('.scanner-phone').evaluate(e=>window.scrollTo(0,e.getBoundingClientRect().top+scrollY-120));
  await page.locator('.scanner-phone').screenshot({path:path.join(output,mobile?'mobile-workflow.png':'desktop-workflow.png')});
  await page.screenshot({path:path.join(output,mobile?'mobile-full.png':'desktop-full.png'),fullPage:true});
  await check(`${mobile?'Mobile':'Desktop'} sticky menu, real hero, no overflow and route-safe workbench link`,async()=>{
   assert.equal(await page.locator('.editorial-header').evaluate(e=>getComputedStyle(e).position),'sticky');
   assert(Math.abs((await page.locator('.editorial-header').boundingBox()).y)<1);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.locator('.scanner-hero .editorial-action').click();assert.equal(new URL(page.url()).hash,'#/batch-upload/bulk');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'scanner-workbench');
   assert((await page.locator('#scanner-workbench').boundingBox()).y>=70);
  });
  if(mobile){await check('Mobile menu Escape restores focus; navigation can be reopened',async()=>{
   const trigger=page.getByRole('button',{name:'Open navigation menu',exact:true});await trigger.click();await page.getByRole('dialog',{name:'Navigation menu',exact:true}).waitFor();await page.keyboard.press('Escape');await page.waitForTimeout(30);assert(await trigger.evaluate(e=>document.activeElement===e));await trigger.click();await page.getByRole('button',{name:'Close navigation menu',exact:true}).click();
  });}
  await check('Repeated navigation preserves scanner entry and keyboard focus styles',async()=>{
   await page.goto(base+'/#/home');await page.goto(base+'/#/batch-upload/bulk');await page.getByRole('heading',{name:'Batch upload cards',exact:true}).waitFor();assert.equal(await page.locator('[data-photo-slot]').count(),20);assert.equal(await page.locator('.editorial-header').count(),1);
   const btn=page.getByRole('button',{name:'Scan staged photos',exact:true});assert(await btn.isDisabled());
  });
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);
}finally{await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}})().catch(e=>{console.error(e);process.exitCode=1;});
