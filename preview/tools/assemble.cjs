// Publish an explicit static allowlist. Keep Next's existing legal/support exports.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo=path.resolve(__dirname,'../..'),publicRoot=path.join(repo,'preview/public'),out=path.join(repo,'out');
const allowed=['affiliate-config.js','account-editorial.css','local-scan.css','precons.css','account-config.js','ai-scan-config.js','news-config.js','publisher-config.js','coach-config.js','index.html','app.js','styles.css','fantasy.css','news.css','news-snapshot.json','card-worker.js','card-facets.js','ramp-classification.js','THIRD-PARTY-NOTICES.txt','assets/original/arcane-library-v2.png','assets/original/deck-sage-sigil.svg'];
for(const name of ['worker.js','transformers.min.js','ort-wasm-simd-threaded.jsep.mjs','ort-wasm-simd-threaded.jsep.wasm','ort.bundle.min.mjs'])allowed.push('ai-coach/'+name);
allowed.push('card-value/library.png');
for(let n=1;n<=19;n++)allowed.push('avatars/avatar'+n+'.webp');
const songMedia=[
 ['assets/images/song.png','songs/background.png'],
 ['assets/images/commanders/Atraxa.png','songs/atraxa.png'],
 ['assets/images/Styles/Forest.png','songs/azusa.png'],
 ['assets/images/commanders/Avacyn.png','songs/giada.png'],
 ['assets/images/commanders/Fight.png','songs/kaalia.png'],
 ['assets/images/commanders/Edgar.png','songs/sephiroth.png'],
 ['assets/images/commanders/Sliver.png','songs/ur-dragon.png'],
];
for(const relative of ['background-1.webp','background-2.webp','background-3.webp','background-4.webp','background-5.webp','buttons/my-decks.webp','buttons/my-bulk.webp','buttons/sage-tools.webp','buttons/commander-lore.webp','buttons/theme-songs.webp','buttons/collection-value.webp','buttons/latest-news.webp'])allowed.push('home/'+relative);
for(const relative of ['empty-decks.webp','panel-soft.webp','edgar-intro.png','button-danger.png','button-secondary.png'])allowed.push('decks/'+relative);
for(const relative of ['background.webp','table.webp','banner-left.webp','banner-right.webp','commander-frame.webp','new-deck.webp','divider.webp'])allowed.push('my-decks/'+relative);
for(const relative of ['background.webp','banner.webp','panel-frame.webp','divider.webp','land-plains.webp','land-island.webp','land-swamp.webp','land-mountain.webp','land-forest.webp','land-wastes.webp'])allowed.push('deck-details/'+relative);
for(const folder of ['assets/audio','card-data'])for(const name of fs.readdirSync(path.join(publicRoot,folder))){if(folder==='assets/audio'&&!name.endsWith('.mp3'))throw Error('Unexpected audio artifact');if(folder==='card-data'&&!/^(manifest\.json|search-index\.json\.gz|cards-[a-f0-9]{2}\.json\.gz)$/.test(name))throw Error('Unexpected card artifact');allowed.push(folder+'/'+name);}
for(const name of fs.readdirSync(path.join(publicRoot,'local-scanner/v1')))allowed.push('local-scanner/v1/'+name);
for(const name of fs.readdirSync(path.join(publicRoot,'local-scanner/licenses')))allowed.push('local-scanner/licenses/'+name);
allowed.push('local-scanner/NOTICE.txt');
allowed.push('precon-data/catalog.json','precon-data/LICENSE.txt','precon-data/commander-art.json');
for(const name of fs.readdirSync(path.join(publicRoot,'precon-data/decks'))){if(!/^[a-z0-9-]+\.json$/.test(name))throw Error('Unexpected precon artifact');allowed.push('precon-data/decks/'+name);}
for(const name of fs.readdirSync(path.join(publicRoot,'home/editorial')))allowed.push('home/editorial/'+name);
allowed.push('home-editorial.css','card-library.css','bulk-editorial.css','card-library/archive-hero-1672.webp','card-library/archive-hero-mobile-780.webp');
allowed.push('lore.css','commander-lore/chronicle-hero-desktop.webp','commander-lore/chronicle-hero-mobile.webp');
allowed.push('help.css','help/guide-hero.webp','help/guide-mobile.webp');
allowed.push('precon-vault/vault-hero-desktop.webp','precon-vault/vault-hero-mobile.webp');
for(const name of ['muster-1920.webp','muster-3840.webp','muster-mobile-780.webp','muster-mobile-1170.webp'])allowed.push('bulk/'+name);
for(const name of fs.readdirSync(path.join(publicRoot,'bulk-model'))){if(!/^(relations-[a-f0-9]{16}\.f16|(?:oracle|manifest)-[a-f0-9]{16}\.json|worker-[a-f0-9]{16}\.js|NOTICE\.txt)$/.test(name))throw Error('Unexpected bulk model artifact');allowed.push('bulk-model/'+name);}
allowed.push('canonical-evidence.js');
allowed.push('scanner-editorial.css','scanner/sorting-1280.webp','scanner/sorting-1672.webp','scanner/sorting-mobile.webp');
allowed.push('sage-workshop.css','sage/workshop-hero.png');
const ledger=[];
allowed.push('commander-swap.css');
allowed.push('combo-completion.js','combos.css','combo-data/manifest.json');
allowed.push('commander-combos/convergence-hero-desktop.webp','commander-combos/convergence-hero-mobile.webp');
const deckComboManifest=JSON.parse(fs.readFileSync(path.join(publicRoot,'combo-data/deck-manifest.json')));if(!/^deck-index-[a-f0-9]{16}\.json\.gz$/.test(deckComboManifest.file))throw Error('Invalid deck combo index');allowed.push('combo-data/deck-manifest.json','combo-data/'+deckComboManifest.file);for(const name of fs.readdirSync(path.join(publicRoot,'combo-data/deck-shards'))){if(!/^[a-f0-9]{2}-[a-f0-9]{16}\.json\.gz$/.test(name))throw Error('Invalid deck combo detail');allowed.push('combo-data/deck-shards/'+name);}
const comboManifest=JSON.parse(fs.readFileSync(path.join(publicRoot,'combo-data/manifest.json')));if(!/^catalog-[a-f0-9]{16}\.json\.gz$/.test(comboManifest.file))throw Error('Invalid combo index');allowed.push('combo-data/'+comboManifest.file);
for(const name of fs.readdirSync(path.join(publicRoot,'combo-data/shards'))){if(!/^[a-f0-9-]{36}-[a-f0-9]{16}\.json\.gz$/.test(name))throw Error('Unexpected combo artifact');allowed.push('combo-data/shards/'+name);}
for(const relative of allowed){const src=path.join(publicRoot,relative),dest=path.join(out,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);const bytes=fs.readFileSync(dest);ledger.push({path:relative,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
for(const [source,relative] of songMedia){const src=path.join(repo,'preview/source',source),dest=path.join(out,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);const bytes=fs.readFileSync(dest);ledger.push({path:relative,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
fs.copyFileSync(path.join(repo,'CNAME'),path.join(out,'CNAME'));fs.writeFileSync(path.join(out,'.nojekyll'),'');
for(const route of ['delete-account','privacy-policy','support','terms-of-use'])if(!fs.existsSync(path.join(out,route,'index.html')))throw Error('Missing preserved legal route '+route);
fs.mkdirSync(path.join(repo,'preview/evidence'),{recursive:true});fs.writeFileSync(path.join(repo,'preview/evidence/public-allowlist.json'),JSON.stringify({rollbackCommit:'c0dec78a991984e2c9ef3f49ad077fd5f56081d9',previewFiles:ledger,privateCollectionsIncluded:false,liveServicesConnected:false},null,2));
console.log('Assembled '+ledger.length+' preview files alongside preserved Next legal routes.');
