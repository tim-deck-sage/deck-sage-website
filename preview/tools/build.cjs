// Small reproducible CommonJS browser bundler, using the already-installed TS compiler.
const fs=require('fs'),path=require('path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'), modules=[], ids=new Map();
const overrides={
  [path.join(root,'../node_modules/react/index.js')]:path.join(root,'../node_modules/react/cjs/react.production.js'),
  [path.join(root,'../node_modules/react-dom/index.js')]:path.join(root,'../node_modules/react-dom/cjs/react-dom.production.js'),
  [path.join(root,'../node_modules/react-dom/client.js')]:path.join(root,'../node_modules/react-dom/cjs/react-dom-client.production.js'),
  [path.join(root,'../node_modules/scheduler/index.js')]:path.join(root,'../node_modules/scheduler/cjs/scheduler.production.js'),
  [path.join(root,'source/app/utils/mtgCardApi.ts')]:path.join(root,'src/adapters/mtgCardApi.ts'),
  [path.join(root,'source/app/utils/data/offlineCardResolver.ts')]:path.join(root,'src/adapters/offlineCardResolver.ts'),
};
function resolve(from,name){
 let candidate=name.startsWith('.')?path.resolve(path.dirname(from),name):require.resolve(name,{paths:[path.dirname(from),root]});
 for(const p of [candidate,candidate+'.ts',candidate+'.tsx',candidate+'.jsx',candidate+'.js',path.join(candidate,'index.js')]){
  if(fs.existsSync(p)&&fs.statSync(p).isFile())return overrides[p]||p;
 }
 throw Error(`Cannot resolve ${name} from ${from}`);
}
function add(file){
 file=overrides[file]||file;if(ids.has(file))return ids.get(file);
 const id=modules.length;ids.set(file,id);modules.push('');
 if(/\.(png|jpg|jpeg|webp|gif|mp3|ttf|otf)$/.test(file)){
  const relative=file.slice(file.indexOf(path.sep+'assets'+path.sep)+1).replace(/\\/g,'/');
  const url='/'+relative.replace(/\.(png|jpe?g)$/i,'.webp');modules[id]='module.exports='+JSON.stringify(url)+';';return id;
 }
 if(file.endsWith('.json')){modules[id]='module.exports='+fs.readFileSync(file,'utf8')+';';return id;}
 let code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 code=code.replace(/process\.env\.NODE_ENV/g,'"production"');
 code=code.replace(/require\((['"])([^'"]+)\1\)/g,(_,quote,name)=>'require('+add(resolve(file,name))+')');
 modules[id]=code;return id;
}
// Assets are resolved from the source snapshot; only filenames are required here.
function copyAssetReferences(){
 const src=path.join(root,'source/assets');fs.mkdirSync(src,{recursive:true});
 function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  const f=path.join(dir,ent.name);if(ent.isDirectory())walk(f);else{
   const rel=path.relative(path.join(root,'public/assets'),f);let original=rel.replace(/\.webp$/,'.png');
   const dest=path.join(src,original);fs.mkdirSync(path.dirname(dest),{recursive:true});if(!fs.existsSync(dest))fs.writeFileSync(dest,'');
   if(f.endsWith('.webp')){const jpg=dest.replace(/\.png$/,'.jpg');if(!fs.existsSync(jpg))fs.writeFileSync(jpg,'');}
  }
 }}
 walk(path.join(root,'public/assets'));
}
copyAssetReferences();
const entry=add(path.join(root,'src/app.jsx'));
const output=`(()=>{const modules={${modules.map((c,i)=>JSON.stringify(i)+':function(module,exports,require){\n'+c+'\n}').join(',')}};const cache={};function require(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};modules[id](module,module.exports,require);return module.exports;}require(${entry});})();`;
fs.writeFileSync(path.join(root,'public/app.js'),output);
const coachDir=path.join(root,'public/ai-coach');fs.mkdirSync(coachDir,{recursive:true});fs.copyFileSync(path.join(root,'src/aiCoachWorker.js'),path.join(coachDir,'worker.js'));const transformers=path.join(root,'../node_modules/@huggingface/transformers/dist/transformers.min.js'),ort=path.join(root,'../node_modules/onnxruntime-web/dist');for(const [src,name] of [[transformers,'transformers.min.js'],[path.join(ort,'ort-wasm-simd-threaded.jsep.mjs'),'ort-wasm-simd-threaded.jsep.mjs'],[path.join(ort,'ort-wasm-simd-threaded.jsep.wasm'),'ort-wasm-simd-threaded.jsep.wasm'],[path.join(ort,'ort.bundle.min.mjs'),'ort.bundle.min.mjs']])fs.copyFileSync(src,path.join(coachDir,name));
console.log(`Built ${modules.length} modules, ${(Buffer.byteLength(output)/1024).toFixed(1)} KiB.`);
