const fs=require('fs'),cp=require('child_process'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),esbuild=require('esbuild'),Module=require('module'),ts=require('typescript');
const root=path.resolve(__dirname,'../..'),baseline='907503169b326d94830124fc9e7680a3c8af507c';
const code=esbuild.buildSync({entryPoints:[path.join(root,'preview/src/commanderSwap.js')],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,m=new Module(__filename);m.filename=__filename;m.paths=module.paths;m._compile(code,__filename);
const {fixtures,catalog}=require('./commander-swap-fixtures.cjs'),decks=fixtures(),before=JSON.stringify({decks,catalog}),out=[];
for(const [name,deck] of Object.entries(decks))for(const mode of ['all','dropIn','pairs'])out.push({name,mode,result:m.exports.recommendCommanderSwaps(deck,catalog.cards,{mode})});
assert.equal(JSON.stringify({decks,catalog}),before,'Read-only source data');const digest=crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
if(process.env.RECORD_SWAP_BASELINE==='1'){console.log('BASELINE '+digest);process.exit(0);}
assert.equal(digest,'ce3540d94c830322a4ff74e3d4d4ef361b907282c62c4f53c2b8d24c1472cf10','All results, order, scores, reasons, legality, partnership plans, warnings and counts remain identical');
for(const file of ['preview/src/commanderSwap.js','preview/src/bulkDeckDiscovery.js','preview/src/commanderCombos.js','preview/public/card-worker.js']){const old=cp.execFileSync('git',['show',baseline+':'+file],{cwd:root,maxBuffer:15000000}).toString('utf8').replace(/\r\n/g,'\n');assert.equal(fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'),old,'Unchanged engine/catalog/worker: '+file);}
function hooks(text){const tree=ts.createSourceFile('CommanderSwapPage.jsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),parts=[];function visit(n){if(ts.isCallExpression(n)&&['useMemo','useEffect'].includes(n.expression.getText(tree)))parts.push(n.getText(tree).replace(/\r\n/g,'\n'));ts.forEachChild(n,visit);}visit(tree);return parts;}
assert.deepEqual(hooks(fs.readFileSync(path.join(root,'preview/src/CommanderSwapPage.jsx'),'utf8')),hooks(cp.execFileSync('git',['show',baseline+':preview/src/CommanderSwapPage.jsx'],{cwd:root,encoding:'utf8'})),'Catalog, prepared-deck and recommendation memo hooks unchanged, including null-deck guards');
console.log('PASS complete Commander Swap output parity: '+digest+'; unchanged catalog/preparation/null-deck hooks and source engines');

