const esbuild=require('esbuild'),fs=require('fs'),path=require('path');
const repo=path.resolve(__dirname,'../..'),root=path.join(repo,'preview');
const aliases={
 [path.join(root,'source/app/utils/mtgCardApi.ts')]:path.join(root,'src/adapters/mtgCardApi.ts'),
 [path.join(root,'source/app/utils/data/offlineCardResolver.ts')]:path.join(root,'src/adapters/offlineCardResolver.ts'),
};
const url=process.env.DECK_SAGE_SUPABASE_URL||'',key=process.env.DECK_SAGE_SUPABASE_PUBLISHABLE_KEY||'';
if(!!url!==!!key)throw Error('Supply both public account settings or neither.');
// Only the authorized integration test target can be enabled by this candidate.
if(url&&(url!=='https://mihmykgxbneuhlcxolzm.supabase.co'||!key.startsWith('sb_publishable_')))throw Error('This feature candidate accepts only the authorized integration test project and a publishable key.');
fs.writeFileSync(path.join(root,'public/account-config.js'),'window.DECK_SAGE_ACCOUNTS='+JSON.stringify(url?{url,publishableKey:key}:null)+';');
let html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
html=html.replace(/connect-src 'self'(?: https:\/\/mihmykgxbneuhlcxolzm\.supabase\.co)?;/,"connect-src 'self'"+(url?' '+url:'')+';');
fs.writeFileSync(path.join(root,'public/index.html'),html);
esbuild.build({entryPoints:[path.join(root,'src/app.jsx')],bundle:true,minify:true,legalComments:'eof',platform:'browser',format:'iife',target:'es2020',outfile:path.join(root,'public/app.js'),define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'original-adapters',setup(build){
 build.onResolve({filter:/.*/},args=>{if(!args.path.startsWith('.'))return;let file=path.resolve(args.resolveDir,args.path);for(const candidate of [file,file+'.ts'])if(aliases[candidate])return {path:aliases[candidate]};});
 build.onLoad({filter:/\.(png|jpe?g|webp|gif|mp3)$/},args=>{const relative=args.path.slice(args.path.indexOf(path.sep+'assets'+path.sep)+1).replace(/\\/g,'/').replace(/\.(png|jpe?g)$/i,'.webp');return {contents:'module.exports='+JSON.stringify('/'+relative),loader:'js'};});
}}]}).then(()=>{const file=path.join(root,'public/app.js');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/[ \t]+$/gm,''));}).catch(error=>{console.error(error);process.exitCode=1;});
