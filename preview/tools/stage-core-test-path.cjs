// Temporary rollout overlay: leaves the baseline root application and assets intact.
const fs=require('node:fs'),path=require('node:path');
const source=path.resolve(__dirname,'../public'),out=path.resolve(process.argv[2]||'out');
if(!fs.existsSync(path.join(out,'index.html')))throw Error('Build baseline before staging test path');
const prefix='/core-account-test/',dest=path.join(out,'core-account-test');
fs.mkdirSync(dest,{recursive:true});
const router=`(()=>{try{if(location.pathname==='/'&&new URLSearchParams(location.search).get('accountCallback')==='1'){location.replace('/core-account-test/'+location.search+location.hash);}}catch{}})();`;
const bootstrap=`try{localStorage.setItem('deck-sage-core-rollout-path','core-account-test');}catch{}`;
fs.writeFileSync(path.join(dest,'callback-router.js'),router);
fs.writeFileSync(path.join(dest,'bootstrap.js'),bootstrap);
for(const name of ['app.js','account-config.js'])fs.copyFileSync(path.join(source,name),path.join(dest,name));
const config=fs.readFileSync(path.join(dest,'account-config.js'),'utf8');
if(!config.includes('"secureAccountsReady":true'))throw Error('Explicit enabled test build required');
let html=fs.readFileSync(path.join(source,'index.html'),'utf8');
html=html.replace('<title>','<meta name="robots" content="noindex,nofollow"><title>');
html=html.replace('<body>','<body><script src="'+prefix+'bootstrap.js"></script>');
for(const name of ['app.js','account-config.js'])html=html.replace('src="/'+name+'"','src="'+prefix+name+'"');
fs.writeFileSync(path.join(dest,'index.html'),html);
const rootFile=path.join(out,'index.html');let root=fs.readFileSync(rootFile,'utf8');
if(!root.includes('name="referrer"'))root=root.replace('<head>','<head><meta name="referrer" content="no-referrer">');
if(!root.includes(prefix+'callback-router.js'))root=root.replace('<body>','<body><script src="'+prefix+'callback-router.js"></script>');
fs.writeFileSync(rootFile,root);
for(const route of ['privacy-policy','terms-of-use']){
 const page=fs.readFileSync(path.join(out,route,'index.html'),'utf8');
 const article=page.match(/<article class="legal-content">[\s\S]*?<\/article>/)?.[0];
 if(!article)throw Error('Missing reviewed legal article: '+route);
 const folder=path.join(dest,route);fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deck Sage account terms</title><style>body{background:#0e1e20;color:#e5d5b5;font:18px/1.65 Georgia,serif;margin:2rem auto;padding:1rem;max-width:900px}a{color:#d2ae65}h1,h2,h3{color:#ead5a0}</style></head><body><a href="/core-account-test/#/settings">Return to Deck Sage account test</a><main>'+article+'</main></body></html>');
}
console.log('Staged fixed unlinked Core test path and same-origin callback relay.');
