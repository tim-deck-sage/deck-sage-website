const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('preview/tools/stage-core-test-path.cjs','utf8');
const literal=source.match(/const router=(`[^`]+`);/)[1],router=vm.runInNewContext(literal);
for(const [pathname,search,expected] of [['/','?accountCallback=1&code=fixture','/core-account-test/?accountCallback=1&code=fixture#/home'],['/','?unrelated=1',null],['/other','?accountCallback=1&code=fixture',null],['/','?accountCallback=0',null],['/','?accountCallback=1&next=https://untrusted.invalid','/core-account-test/?accountCallback=1&next=https://untrusted.invalid#/home']]){
 let actual=null;vm.runInNewContext(router,{location:{pathname,search,hash:'#/home',replace:value=>actual=value},URLSearchParams});assert.equal(actual,expected);
 if(actual)assert.equal(new URL(actual,'https://deck-sage.com').origin,'https://deck-sage.com');
}
console.log('PASS reserved production callback reaches fixed test path without a marker or arbitrary redirect; ordinary root navigation unchanged');
