const assert=require('node:assert/strict');
(async()=>{
 const {createLoginHandler}=await import('../../supabase/functions/website-core-login/policy.mjs');
 let allowed=true,calls=[],known=true,correct=true;
 const handler=createLoginHandler({origin:'https://deck-sage.com',consume:async()=>allowed,resolveEmail:async()=>known?'private@example.invalid':null,hash:async value=>value,pause:async()=>{},authenticate:async(email,password,token)=>{calls.push({email,password,token});return correct?{data:{session:{access_token:'fixture-access',refresh_token:'fixture-refresh'}}}:{error:{message:'Private failure'}};}});
 const request=(body,origin='https://deck-sage.com')=>new Request('https://fixture.invalid/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 const body={username:'User_name',password:'fixture-only-password',captchaToken:'test-only'};
 let response=await handler(request(body));assert.equal(response.status,200);assert.deepEqual(await response.json(),{access_token:'fixture-access',refresh_token:'fixture-refresh'});assert.equal(response.headers.get('cache-control'),'no-store');
 correct=false;response=await handler(request(body));const wrong=await response.json();known=false;response=await handler(request(body));assert.deepEqual(await response.json(),wrong);assert.equal(calls.at(-1).email,'core-unavailable@invalid.example');
 assert.equal((await handler(request(body,'https://attacker.invalid'))).status,403);assert.equal((await handler(request({...body,captchaToken:''}))).status,400);
 allowed=false;const before=calls.length;assert.equal((await handler(request(body))).status,429);assert.equal(calls.length,before);
 console.log('PASS login proxy: Auth delegation, generic failures, no email disclosure, no-store, origin, CAPTCHA and rate-limit rejection. No network calls.');
})().catch(error=>{console.error(error);process.exitCode=1;});
