// Read-only/denied probes: no Auth user or persistent records are created.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('preview/public/account-config.js','utf8'),context);
const {url,publishableKey}=context.window.DECK_SAGE_ACCOUNTS;
assert.equal(url,'https://mihmykgxbneuhlcxolzm.supabase.co');
const headers={apikey:publishableKey,'Content-Type':'application/json'};
(async()=>{
 const settings=await fetch(url+'/auth/v1/settings',{headers});
 const flags=await settings.json();assert.equal(settings.status,200);
 assert.equal(flags.external.email,true);assert.equal(flags.disable_signup,false);assert.equal(flags.mailer_autoconfirm,false);
 console.log('PASS public Auth flags: email/signup enabled, confirmation required');
 const policy=await fetch(url+'/rest/v1/ds_policy_versions?select=version,active',{headers});
 assert.equal(policy.status,200);assert.deepEqual(await policy.json(),[{version:'web-2026-10-09-v1',active:true}]);
 console.log('PASS public policy read');
 for(const table of ['ds_profiles','ds_consents','ds_workspaces']){
  const r=await fetch(url+'/rest/v1/'+table+'?select=*',{headers});
  assert.equal(r.status,401);const body=await r.json();assert.equal(body.code,'42501');
  console.log('PASS anonymous '+table+' read denied');
 }
 for(const [rpc,body] of [
  ['ds_is_administrator',{}],
  ['ds_finish_onboarding',{p_expected_user:null,p_username:'anonymous_probe',p_version:'web-2026-10-09-v1',p_terms:true,p_privacy:true}],
  ['ds_save_workspace',{p_expected_user:null,p_state:{version:1,decks:[],bulk:[]},p_revision:0,p_operation:'00000000-0000-0000-0000-000000000001'}],
  ['ds_import_guest',{p_expected_user:null,p_state:{version:1,decks:[],bulk:[]},p_revision:0}]
 ]){
  const r=await fetch(url+'/rest/v1/rpc/'+rpc,{method:'POST',headers,body:JSON.stringify(body)});
  assert.equal(r.status,401);assert.equal((await r.json()).code,'42501');console.log('PASS anonymous '+rpc+' execution denied');
 }
 const privateSchema=await fetch(url+'/rest/v1/account_roles?select=*',{headers:{...headers,'Accept-Profile':'ds_private'}});
 assert.equal(privateSchema.status,406);assert.equal((await privateSchema.json()).code,'PGRST106');
 console.log('PASS private schema not exposed');
 console.log('10 hosted publishable-key checks passed; authenticated JWT/mail transport remains user handoff.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
