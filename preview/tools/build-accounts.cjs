const esbuild=require('esbuild'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo=path.resolve(__dirname,'../..'),root=path.join(repo,'preview');
const aliases={
 [path.join(root,'source/app/utils/mtgCardApi.ts')]:path.join(root,'src/adapters/mtgCardApi.ts'),
 [path.join(root,'source/app/utils/data/offlineCardResolver.ts')]:path.join(root,'src/adapters/offlineCardResolver.ts'),
};
const configFile=path.join(root,'public/account-config.js');
const url=process.env.DECK_SAGE_SUPABASE_URL||'',key=process.env.DECK_SAGE_SUPABASE_PUBLISHABLE_KEY||'';
if(!!url!==!!key)throw Error('Supply both public account settings or neither.');
// Only the authorized integration test target can be enabled by this candidate.
if(url&&(url!=='https://mihmykgxbneuhlcxolzm.supabase.co'||!key.startsWith('sb_publishable_')))throw Error('This feature candidate accepts only the authorized integration test project and a publishable key.');
let config=url?{url,publishableKey:key,usernameOnlyReady:process.env.DECK_SAGE_USERNAME_ONLY_READY==='true'}:null;
if(!config&&fs.existsSync(configFile)){
 const match=fs.readFileSync(configFile,'utf8').match(/^window\.DECK_SAGE_ACCOUNTS=(.+);\s*$/);
 if(match)try{const existing=JSON.parse(match[1]);if(existing?.url==='https://mihmykgxbneuhlcxolzm.supabase.co'&&existing?.publishableKey?.startsWith('sb_publishable_'))config={url:existing.url,publishableKey:existing.publishableKey,usernameOnlyReady:existing.usernameOnlyReady===true};}catch{}
}
fs.writeFileSync(configFile,'window.DECK_SAGE_ACCOUNTS='+JSON.stringify(config)+';');
let html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
html=html.replace(/connect-src 'self'(?: https:\/\/mihmykgxbneuhlcxolzm\.supabase\.co)?;/,"connect-src 'self'"+(config?' '+config.url:'')+';');
if(!html.includes('/publisher-config.js'))html=html.replace('<script src="/news-config.js" defer></script>','<script src="/news-config.js" defer></script><script src="/publisher-config.js" defer></script>');
const publicOrigin='https://mihmykgxbneuhlcxolzm.supabase.co';
if(!/img-src[^;]*blob:/.test(html))html=html.replace("img-src 'self'","img-src 'self' blob:");
if(!/media-src[^;]*blob:/.test(html))html=html.replace("media-src 'self'","media-src 'self' blob:");
if(!/img-src[^;]*mihmykgxbneuhlcxolzm/.test(html))html=html.replace("img-src 'self'","img-src 'self' "+publicOrigin);
if(!/media-src[^;]*mihmykgxbneuhlcxolzm/.test(html))html=html.replace("media-src 'self'","media-src 'self' "+publicOrigin);
fs.writeFileSync(path.join(root,'public/index.html'),html);
const worker=esbuild.buildSync({entryPoints:[path.join(root,'src/bulkRelations.worker.js')],bundle:true,minify:true,platform:'browser',format:'esm',target:'es2020',write:false}).outputFiles[0].contents;
const workerName='worker-'+crypto.createHash('sha256').update(worker).digest('hex').slice(0,16)+'.js';
fs.writeFileSync(path.join(root,'public/bulk-model',workerName),worker);
esbuild.build({entryPoints:[path.join(root,'src/app.jsx')],bundle:true,minify:true,legalComments:'eof',platform:'browser',format:'iife',target:'es2020',outfile:path.join(root,'public/app.js'),define:{'process.env.NODE_ENV':'"production"',__BULK_RELATIONS_WORKER__:JSON.stringify('/bulk-model/'+workerName)},plugins:[{name:'original-adapters',setup(build){
 build.onResolve({filter:/.*/},args=>{if(!args.path.startsWith('.'))return;let file=path.resolve(args.resolveDir,args.path);for(const candidate of [file,file+'.ts'])if(aliases[candidate])return {path:aliases[candidate]};});
 build.onLoad({filter:/\.(png|jpe?g|webp|gif|mp3)$/},args=>{const relative=args.path.slice(args.path.indexOf(path.sep+'assets'+path.sep)+1).replace(/\\/g,'/').replace(/\.(png|jpe?g)$/i,'.webp');return {contents:'module.exports='+JSON.stringify('/'+relative),loader:'js'};});
}}]}).then(()=>{const file=path.join(root,'public/app.js');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/[ \t]+$/gm,''));}).catch(error=>{console.error(error);process.exitCode=1;});
