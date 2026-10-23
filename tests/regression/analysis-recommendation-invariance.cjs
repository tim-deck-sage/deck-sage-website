const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const file=path.join(__dirname,'commander-upgrades-report.json');
assert(fs.existsSync(file),'Run commander-upgrades.cjs first to generate actual recommendation responses');
const report=JSON.parse(fs.readFileSync(file,'utf8'));assert(!report.failure,report.failure);assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalWrites,[]);
const digest=crypto.createHash('sha256').update(JSON.stringify([report.representativeRecommendations,report.reasonSamples,report.beforeAfter])).digest('hex');
assert.equal(digest,'d12412b04c61e69e93bf64e4e92a0a1342c173e02bd78ac75c470e3aa45aa85b','Recommendation identities, order, style rankings, explanations and safety outcomes must match the unchanged-main browser baseline');
console.log('PASS complete recommendation projection matches approved main: '+digest);
