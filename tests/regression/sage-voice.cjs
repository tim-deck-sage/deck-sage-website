const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const esbuild=require('esbuild'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
function bundle(file){const code=esbuild.buildSync({entryPoints:[path.join(root,file)],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require,console});return module.exports;}
const {generateSageDeckStrategy:generateDeckStrategy,generateDeckStrategy:generateAnalysisStrategy}=bundle('preview/source/app/utils/strategy/deckStrategyEngine.ts');
const {getSageStrategyCopy,getRandomTableWisdom}=bundle('preview/source/app/utils/strategy/strategyVoiceLibrary.ts');
const commander={name:'Krenko, Mob Boss',typeLine:'Legendary Creature — Goblin Warrior',oracleText:'{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.',cmc:4};
const card=(name,text,typeLine='Creature — Goblin')=>({name,oracleText:text,typeLine,cmc:2});
const fixtures=[
 {id:'tokens',name:'The Ember Host',commander:commander.name,commanderCard:commander,cards:[...Array.from({length:8},(_,i)=>card(`Goblin maker ${i}`,'Create a 1/1 red Goblin creature token.')),card('Guard','Target creature gains indestructible until end of turn.','Instant')]},
 {id:'quiet',name:'Quiet Council',commander:'Council Wizard',commanderCard:card('Council Wizard','Whenever you cast a spell, scry 1.','Legendary Creature — Wizard'),cards:[card('Study','Draw two cards.','Sorcery')]},
];
for(const deck of fixtures){
 const a=generateDeckStrategy(deck),b=generateDeckStrategy(deck),analysis=generateAnalysisStrategy(deck);
 for(const key of ['primaryPlan','keyCards','playPatterns','combos'])assert.deepEqual(a[key],analysis[key],`${key} is unchanged`);assert.deepEqual(a,b,'stable deck produces stable wording');
 const seed=[deck.id,deck.name,deck.commander,''].join(':');const wisdom=getRandomTableWisdom(seed);
 assert(!a.identity.includes(wisdom),'identity does not repeat closing wisdom');assert(a.liveAdvice.includes(wisdom),'wisdom remains available once');
 const prose=[a.identity,a.primaryPlan,...a.earlyGame,...a.midGame,...a.lateGame,...a.mistakes,...a.liveAdvice];assert.equal(prose.filter(line=>line.includes(wisdom)).length,1);
 assert(!a.liveAdvice.some(line=>line.startsWith('Right now,')),'saved-list advice does not pretend to see the game');
 assert.equal(a.mistakes.filter(line=>/hand|Draw is scarce/.test(line)).length>=1,true,'limited draw caution remains');
 assert(!a.liveAdvice.some(line=>line.includes('Your card draw is limited.')),'limited draw caution is not duplicated');
 assert(a.keyCards.every(name=>[deck.commander,...deck.cards.map(c=>c.name)].includes(name)),'key cards come from the deck');
}
assert(new Set(Array.from({length:20},(_,i)=>getSageStrategyCopy('early',String(i)))).size>1,'deterministic alternatives offer variety');
const worker=fs.readFileSync(path.join(root,'preview/public/card-worker.js'),'utf8');
const source=ts.createSourceFile('worker.js',worker,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declaration=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name.text==='candidateExplanation');
const explain=vm.runInNewContext(`(${declaration.getText(source)})`);
const fit={reasons:['haste advances the commander tap engine','untap enables another commander activation'],caveats:['Conditional acceleration does not replace a fully reliable ramp slot.']};
const meta={why:'Free equip gives haste and shroud; shroud also blocks your own targeting.'},c={name:'Lightning Greaves',oracleId:'test-greaves'};
const text=explain(c,meta,'commander_support',{}, {},fit,{reason:'Aggressive emphasis: supported pressure, speed, or closing power.'});
assert(text.startsWith(meta.why),'card-specific mechanic is preserved verbatim');for(const reason of fit.reasons)assert(text.includes(reason),'each fit fact is preserved');
assert(!text.includes('Aggressive emphasis'),'style boilerplate no longer repeats on every card');assert(!text.includes('Whole-deck fit:'),'mechanical label removed');
assert.equal(text,explain(c,meta,'commander_support',{}, {},fit,{}),'style selection does not rewrite facts');
assert(worker.includes('shroud bars your own targeting too'),'Greaves caveat retained');assert(worker.includes('untargeted exile, sacrifice, or -X/-X'),'Intervention limitations retained');
const ui=fs.readFileSync(path.join(root,'preview/src/app.jsx'),'utf8');assert.equal((ui.match(/className="sage-style-guidance"/g)||[]).length,1,'style counsel is rendered once');
assert(ui.includes('Each card and cut is an independently evaluated alternative'),'independent swap caution retained');
console.log('PASS Sage voice: stable variants, one wisdom line, preserved mechanics and fit facts, clear swap caution');

const strategySource=fs.readFileSync(path.join(root,'preview/source/app/utils/strategy/compareCardToDecks.ts'),'utf8');
assert(strategySource.includes('planFacts'),'comparison consumes typed canonical plan facts');
assert(!strategySource.includes('strategyText.includes'),'display wording cannot drive comparison scores');
// Exercise full outputs while changing only deck naming/voice seeds.
async function comparisonRegression(){
 const sourcePath=path.join(root,'preview/source/app/utils/strategy/compareCardToDecks.ts');
 const localSource=fs.readFileSync(sourcePath,'utf8').replace("import { fetchCardByName, ScryfallCardData } from '../mtgCardApi';",'const fetchCardByName = async (name: string): Promise<any> => JSON.parse(name);');
 const code=esbuild.buildSync({stdin:{contents:localSource,loader:'ts',resolveDir:path.dirname(sourcePath)},bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require,console});
 const decks=fixtures.map(deck=>({...deck,commanderCard:{...deck.commanderCard,colorIdentity:deck.id==='tokens'?['R']:['U']}}));
 const candidates=[{name:'Token Test',oracle_text:'Create two 1/1 red Goblin creature tokens.',type_line:'Sorcery',color_identity:['R'],cmc:2},{name:'Draw Test',oracle_text:'Draw two cards.',type_line:'Sorcery',color_identity:['U'],cmc:2},{name:'Artifact Test',oracle_text:'{T}: Add {C}.',type_line:'Artifact',color_identity:[],cmc:2},{name:'Ward Test',oracle_text:'Target creature gains indestructible until end of turn.',type_line:'Instant',color_identity:['R'],cmc:1}];
 const results=[];for(const candidate of candidates)results.push(await module.exports.compareCardToDecks(JSON.stringify(candidate),decks));
 const renamed=decks.map(deck=>({...deck,name:'A different wizardly title'}));
 const repeated=[];for(const candidate of candidates)repeated.push(await module.exports.compareCardToDecks(JSON.stringify(candidate),renamed));
 const normalize=value=>JSON.parse(JSON.stringify(value).replaceAll('The Ember Host','A different wizardly title').replaceAll('Quiet Council','A different wizardly title'));
 assert.deepEqual(normalize(results),normalize(repeated),'voice-seed changes preserve scores, ordering, verdicts, reasons and candidates');
 console.log('PASS typed comparison outputs are independent of deck title and voice seed');
}
comparisonRegression().catch(error=>{console.error(error);process.exitCode=1;});
