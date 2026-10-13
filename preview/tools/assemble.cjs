// Publish an explicit static allowlist. Keep Next's existing legal/support exports.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo=path.resolve(__dirname,'../..'),publicRoot=path.join(repo,'preview/public'),out=path.join(repo,'out');
const allowed=['account-config.js','index.html','app.js','styles.css','fantasy.css','news-snapshot.json','card-worker.js','THIRD-PARTY-NOTICES.txt','assets/original/arcane-library-v2.png','assets/original/deck-sage-sigil.svg'];
for(const relative of ['background-1.webp','background-2.webp','background-3.webp','background-4.webp','background-5.webp','buttons/my-decks.webp','buttons/my-bulk.webp','buttons/sage-tools.webp','buttons/commander-lore.webp','buttons/theme-songs.webp','buttons/collection-value.webp','buttons/latest-news.webp'])allowed.push('home/'+relative);
for(const relative of ['empty-decks.webp','panel-soft.webp','edgar-intro.png','button-primary.png','button-danger.png','button-secondary.png'])allowed.push('decks/'+relative);
for(const folder of ['assets/audio','card-data'])for(const name of fs.readdirSync(path.join(publicRoot,folder))){if(folder==='assets/audio'&&!name.endsWith('.mp3'))throw Error('Unexpected audio artifact');if(folder==='card-data'&&!/^(manifest\.json|search-index\.json\.gz|cards-[a-f0-9]{2}\.json\.gz)$/.test(name))throw Error('Unexpected card artifact');allowed.push(folder+'/'+name);}
const ledger=[];
for(const relative of allowed){const src=path.join(publicRoot,relative),dest=path.join(out,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);const bytes=fs.readFileSync(dest);ledger.push({path:relative,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
fs.copyFileSync(path.join(repo,'CNAME'),path.join(out,'CNAME'));fs.writeFileSync(path.join(out,'.nojekyll'),'');
for(const route of ['delete-account','privacy-policy','support','terms-of-use'])if(!fs.existsSync(path.join(out,route,'index.html')))throw Error('Missing preserved legal route '+route);
fs.mkdirSync(path.join(repo,'preview/evidence'),{recursive:true});fs.writeFileSync(path.join(repo,'preview/evidence/public-allowlist.json'),JSON.stringify({rollbackCommit:'dd238b35c5dd24737d7125a4bd67ea13ee933120',previewFiles:ledger,privateCollectionsIncluded:false,liveServicesConnected:false},null,2));
console.log('Assembled '+ledger.length+' preview files alongside preserved Next legal routes.');
