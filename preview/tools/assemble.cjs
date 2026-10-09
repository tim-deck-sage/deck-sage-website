// Publish an explicit static allowlist. Keep Next's existing legal/support exports.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo=path.resolve(__dirname,'../..'),publicRoot=path.join(repo,'preview/public'),out=path.join(repo,'out');
const allowed=['index.html','app.js','styles.css','fantasy.css','news-snapshot.json','card-worker.js','THIRD-PARTY-NOTICES.txt','assets/original/arcane-library-v2.png','assets/original/deck-sage-sigil.svg'];
for(const folder of ['assets/audio','card-data'])for(const name of fs.readdirSync(path.join(publicRoot,folder))){if(folder==='assets/audio'&&!name.endsWith('.mp3'))throw Error('Unexpected audio artifact');if(folder==='card-data'&&!/^(manifest\.json|search-index\.json\.gz|cards-[a-f0-9]{2}\.json\.gz)$/.test(name))throw Error('Unexpected card artifact');allowed.push(folder+'/'+name);}
const ledger=[];
for(const relative of allowed){const src=path.join(publicRoot,relative),dest=path.join(out,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);const bytes=fs.readFileSync(dest);ledger.push({path:relative,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
fs.copyFileSync(path.join(repo,'CNAME'),path.join(out,'CNAME'));fs.writeFileSync(path.join(out,'.nojekyll'),'');
for(const route of ['delete-account','privacy-policy','support','terms-of-use'])if(!fs.existsSync(path.join(out,route,'index.html')))throw Error('Missing preserved legal route '+route);
fs.mkdirSync(path.join(repo,'preview/evidence'),{recursive:true});fs.writeFileSync(path.join(repo,'preview/evidence/public-allowlist.json'),JSON.stringify({rollbackCommit:'dd238b35c5dd24737d7125a4bd67ea13ee933120',previewFiles:ledger,privateCollectionsIncluded:false,liveServicesConnected:false},null,2));
console.log('Assembled '+ledger.length+' preview files alongside preserved Next legal routes.');
