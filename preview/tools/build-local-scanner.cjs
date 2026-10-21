const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),esbuild=require('esbuild');
const repo=path.resolve(__dirname,'../..'),out=path.join(repo,'preview/public/local-scanner/v1'),vendor=path.join(repo,'preview/vendor/scanner-models');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const br=bytes=>zlib.brotliCompressSync(bytes,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:11}});
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const result=await esbuild.build({entryPoints:[path.join(repo,'preview/src/local-scanner/runtime.js')],bundle:true,minify:true,legalComments:'eof',platform:'browser',format:'esm',target:'es2022',write:false,external:['fs','path','crypto','module','worker_threads'],alias:{'onnxruntime-web/wasm':path.join(repo,'node_modules/onnxruntime-web/dist/ort.wasm.min.mjs')}});
 let previous={assets:{}};try{previous=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));}catch{}
 const manifest={version:'',downloadBytes:0,assets:{}};
 function compressed(key,bytes){const old=previous.assets[key];if(old?.decodedSha256===hash(bytes)&&fs.existsSync(path.join(out,old.file)))return fs.readFileSync(path.join(out,old.file));return br(bytes);}
 function add(key,bytes,suffix,decoded){const sha=hash(bytes),file=key+'-'+sha.slice(0,16)+suffix;fs.writeFileSync(path.join(out,file),bytes);manifest.assets[key]={file,bytes:bytes.length,sha256:sha,...(decoded?{decodedBytes:decoded.length,decodedSha256:hash(decoded)}:{})};manifest.downloadBytes+=bytes.length;}
 add('runtime',compressed('runtime',result.outputFiles[0].contents),'.js.br',result.outputFiles[0].contents);
 for(const [key,file] of [['wasm','ort-wasm-simd-threaded.wasm'],['glue','ort-wasm-simd-threaded.mjs']]){const bytes=fs.readFileSync(path.join(repo,'node_modules/onnxruntime-web/dist',file));add(key,compressed(key,bytes),'.br',bytes);}
 for(const key of ['det','rec']){const bytes=fs.readFileSync(path.join(vendor,`PP-OCRv6_tiny_${key}.tar.br`));add(key,bytes,'.tar.br',zlib.brotliDecompressSync(bytes));}
 const index=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(repo,'preview/public/card-data/search-index.json.gz'))));
 const names=[...new Set(index.cards.map(card=>card[index.fields.indexOf('name')]))].sort();
 const catalog=Buffer.from(JSON.stringify({data:names}));add('catalog',compressed('catalog',catalog),'.json.br',catalog);
 add('decoder',fs.readFileSync(path.join(repo,'node_modules/brotli-dec-wasm/pkg/brotli_dec_wasm_bg.wasm')),'.wasm');
 manifest.version=hash(Buffer.from(JSON.stringify(manifest.assets))).slice(0,20);fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
 await esbuild.build({entryPoints:[path.join(repo,'preview/src/local-scanner/worker.js')],bundle:true,minify:true,legalComments:'eof',platform:'browser',format:'esm',target:'es2022',outfile:path.join(out,'worker.js')});
 const keep=new Set(['manifest.json','worker.js',...Object.values(manifest.assets).map(x=>x.file)]);for(const file of fs.readdirSync(out))if(!keep.has(file))fs.unlinkSync(path.join(out,file));
 console.log(`Local scanner: ${(manifest.downloadBytes/1000000).toFixed(2)} MB + ${(fs.statSync(path.join(out,'worker.js')).size/1000).toFixed(0)} KB loader; ${names.length} catalog names; version ${manifest.version}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
