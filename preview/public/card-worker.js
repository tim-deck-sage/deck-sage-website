'use strict';
const normalized=value=>String(value||'').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const compare=(a,b)=>a<b?-1:a>b?1:0;
const shardPromises=new Map();let manifestPromise,indexPromise;
const settledShards=new Set();
let activeLoads=0;const loadQueue=[];
async function boundedLoad(action){if(activeLoads>=4)await new Promise(resolve=>loadQueue.push(resolve));activeLoads++;try{return await action();}finally{activeLoads--;loadQueue.shift()?.();}}
async function fetchJson(url){const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw Error('Card library file could not load. Check your connection and try again.');return response.json();}
function manifest(){if(!manifestPromise)manifestPromise=fetchJson('/card-data/manifest.json').catch(e=>{manifestPromise=null;throw e});return manifestPromise;}
async function gzipFile(name){
 if(typeof DecompressionStream==='undefined')throw Error('This preview needs a current browser with compressed-data support. Please update your browser.');
 const meta=await manifest(),file=meta.files[name];if(!file)throw Error('Card library file is not in the verified snapshot.');
 const response=await fetch('/card-data/'+name).catch(()=>{throw Error('Card library file could not load. Check your connection and try again.');});if(!response.ok)throw Error('Card library file could not load. Check your connection and try again.');
 const bytes=await response.arrayBuffer();const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 if(digest!==file.sha256)throw Error('Card library snapshot changed or is incomplete. Refresh the page and try again.');
 try{return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}catch{throw Error('Card library file is damaged. Refresh this page and try again.');}
}
function index(){if(!indexPromise)indexPromise=gzipFile('search-index.json.gz').then(data=>{const cards=data.cards.map(row=>Object.fromEntries(data.fields.map((field,i)=>[field,row[i]])));const byId=new Map(cards.map(card=>[card.oracle_id,card])),aliases=new Map();for(const [name,id,confidence] of data.aliases){if(!aliases.has(name))aliases.set(name,[]);aliases.get(name).push({id,confidence});}return {cards,byId,aliases};}).catch(e=>{indexPromise=null;throw e});return indexPromise;}
function touchShard(key){settledShards.delete(key);settledShards.add(key);while(settledShards.size>24){const oldest=settledShards.values().next().value;settledShards.delete(oldest);shardPromises.delete(oldest);}}
function shard(id){const key=String(id).slice(0,2);if(settledShards.has(key))touchShard(key);if(!shardPromises.has(key))shardPromises.set(key,boundedLoad(()=>gzipFile('cards-'+key+'.json.gz')).then(value=>{touchShard(key);return value}).catch(e=>{shardPromises.delete(key);settledShards.delete(key);throw e}));return shardPromises.get(key);}
async function card(id){return (await shard(id))[id]||null;}
async function resolve(name){const data=await index(),key=normalized(name);if(!key)return null;const exact=data.cards.filter(c=>c.normalized_name===key).sort((a,b)=>compare(b.source,a.source));if(exact.length)return card(exact[0].oracle_id);const candidates=(data.aliases.get(key)||[]).map(a=>({...data.byId.get(a.id),confidence:a.confidence}));const special=c=>['art_series','token','double_faced_token','emblem'].includes(c.layout)?1:0;candidates.sort((a,b)=>special(a)-special(b)||((a.source==='scryfall-oracle-bulk'?0:1)-(b.source==='scryfall-oracle-bulk'?0:1))||b.confidence-a.confidence||compare(a.name,b.name));return candidates.length?card(candidates[0].oracle_id):null;}
async function matchName(name){
 const data=await index(),key=normalized(name);if(!key)return {status:'not_found',card:null,candidates:[]};
 const exact=[...new Map(data.cards.filter(c=>c.normalized_name===key).map(c=>[c.oracle_id,c])).values()];
 if(exact.length===1)return {status:'matched',source:'exact',card:await card(exact[0].oracle_id),candidates:[]};
 if(exact.length>1)return {status:'ambiguous',source:'exact',card:null,candidates:await Promise.all(exact.slice(0,8).map(c=>card(c.oracle_id)))};
 const aliases=[...new Map((data.aliases.get(key)||[]).map(value=>[value.id,value])).values()].sort((a,b)=>b.confidence-a.confidence);
 if(!aliases.length)return {status:'not_found',card:null,candidates:[]};
 const candidates=(await Promise.all(aliases.slice(0,8).map(async value=>({...await card(value.id),matchConfidence:value.confidence})))).filter(Boolean);
 const top=aliases[0],runnerUp=aliases[1];
 if(top.confidence>=.88&&(!runnerUp||top.confidence-runnerUp.confidence>=.04))return {status:'matched',source:'alias',card:candidates[0],candidates:candidates.slice(1)};
 return {status:'ambiguous',source:'alias',card:null,candidates};
}
const roleTerms={ramp:['add {','add one mana','search your library for a basic land','treasure token'],draw:['draw a card','draw two cards','draw three cards','draw cards','draw X cards'],removal:['destroy target','exile target','counter target','return target'],protection:['hexproof','indestructible','protection from','phase out'],tokens:['create','token'],recursion:['return','graveyard']};
async function search(params){
 const data=await index(),query=String(params.q||'').trim().slice(0,180),norm=normalized(query),limit=Math.max(1,Math.min(Number(params.limit)||24,100)),offset=Math.max(0,Math.min(Number(params.offset)||0,50000));
 if(query&&!norm)return {cards:[],total:0,limit,offset};
 const aliasIds=new Set();if(query&&params.mode!=='text')for(const [name,aliases] of data.aliases)if(name.startsWith(norm))for(const a of aliases)aliasIds.add(a.id);
 const terms=norm.split(' ').slice(0,16),chosen=new Set(String(params.colors||'').split('').filter(c=>'WUBRG'.includes(c)));
 let found=data.cards.filter(c=>{
  if(query){if(params.mode==='text'){const words=normalized(c.name+' '+c.type_line+' '+c.oracle_text).split(' ');if(!terms.every(term=>words.some(word=>word.startsWith(term))))return false;}else if(!c.normalized_name.startsWith(norm)&&!aliasIds.has(c.oracle_id)&&!c.name.toLowerCase().includes(query.toLowerCase()))return false;}
  if(params.type&&!c.type_line.toLowerCase().includes(params.type.toLowerCase()))return false;
  if(params.colors!==undefined&&String(params.colors)!==''&&[...c.color_identity].some(color=>!chosen.has(color)))return false;
  if(params.commander==='true'&&(!c.commander_legal||!(/Legendary.*Creature/i.test(c.type_line)||/can be your commander/i.test(c.oracle_text))))return false;
  if(params.commander!=='true'&&params.legal==='true'&&!c.commander_legal)return false;
  if(params.rarity&&c.rarity!==params.rarity)return false;
  if(params.cmc!==undefined&&params.cmc!==''&&c.cmc>Number(params.cmc))return false;
  if(roleTerms[params.role]&&!roleTerms[params.role].some(term=>c.oracle_text.toLowerCase().includes(term.toLowerCase())))return false;
  return true;
 });
 const rank=c=>c.normalized_name===norm?0:c.normalized_name.startsWith(norm)?1:2;
 found.sort((a,b)=>(query&&params.mode!=='text'?rank(a)-rank(b):0)||compare(a.normalized_name,b.normalized_name)||compare(a.oracle_id,b.oracle_id));
 const cards=await Promise.all(found.slice(offset,offset+limit).map(c=>card(c.oracle_id)));return {cards,total:found.length,limit,offset};
}
const recommendationPool=[
 ['Plains',['land','mana'],[], 'A basic white source enters untapped and is resilient to most nonbasic-land hate.'],
 ['Island',['land','mana'],[], 'A basic blue source enters untapped and is resilient to most nonbasic-land hate.'],
 ['Swamp',['land','mana'],[], 'A basic black source enters untapped and is resilient to most nonbasic-land hate.'],
 ['Mountain',['land','mana'],[], 'A basic red source enters untapped and is resilient to most nonbasic-land hate.'],
 ['Forest',['land','mana'],[], 'A basic green source enters untapped and supports Forest-search effects.'],
 ['Wastes',['land','mana'],[], 'A basic colorless source supports costs that specifically require colorless mana.'],
 ['Command Tower',['land','mana'],[], 'A land slot that produces any color in the commander identity; it produces no mana for a colorless identity.'],
 ['Exotic Orchard',['land','mana'],[], 'Often fixes several colors in multiplayer, but depends on opponents’ lands.'],
 ['Path of Ancestry',['land','mana'],['typal'], 'Fixes commander colors and can scry on shared creature types, but enters tapped.'],
 ['Myriad Landscape',['land','mana'],[], 'A tapped colorless land that can later find two basics sharing a land type.'],
 ['Sol Ring',['ramp','low_curve'],[], 'Two mana from a one-mana artifact is unusually efficient.'],
 ['Arcane Signet',['ramp','mana','low_curve'],[], 'Fixes any color in the legal commander identity.'],
 ['Fellwar Stone',['ramp','mana','low_curve'],[], 'Cheap fixing that usually finds a useful color in multiplayer.'],
 ['Mind Stone',['ramp','low_curve'],[], 'Early colorless acceleration can later cash itself in for a card.'],
 ["Wayfarer's Bauble",['ramp','mana'],[], 'Turns a colorless slot into a basic land on the battlefield.'],
 ["Nature's Lore",['ramp','mana','low_curve'],['forest'], 'Finds a typed Forest; whether it enters untapped depends on the land chosen.'],
 ['Three Visits',['ramp','mana','low_curve'],['forest'], 'Finds a typed Forest and can fix colors with the right mana base.'],
 ['Farseek',['ramp','mana','low_curve'],[], 'Finds several basic land types, helping a multicolor base.'],
 ['Cultivate',['ramp','mana'],[], 'Develops one basic now and guarantees the next land drop.'],
 ["Kodama's Reach",['ramp','mana'],[], 'Develops one basic now and guarantees the next land drop.'],
 ['Priest of Titania',['ramp'],['Elf'], 'Scales with Elves on the battlefield and can produce explosive mana.'],
 ['Wirewood Channeler',['ramp'],['Elf'], 'Turns a wide Elf board into colored mana.'],
 ['Circle of Dreams Druid',['ramp'],['Elf'], 'Converts a creature-heavy board into a large mana engine.'],
 ['Esper Sentinel',['advantage','low_curve'],[], 'Pressures early noncreature spells and scales with power boosts.'],
 ['Tocasia\'s Welcome',['advantage'],['tokens'], 'Turns small creatures entering into steady, limited-per-turn cards.'],
 ['Trouble in Pairs',['advantage'],[], 'Rewards a multiplayer table for taking extra game actions.'],
 ['Mystic Remora',['advantage','low_curve'],['spellslinger'], 'Excellent against noncreature-heavy tables, but cumulative upkeep limits its duration.'],
 ['Rhystic Study',['advantage'],['spellslinger'], 'Repeatedly taxes opponents’ spells and can generate many cards.'],
 ['Archmage Emeritus',['advantage'],['spellslinger'], 'Magecraft turns each instant or sorcery into another card.'],
 ['Phyrexian Arena',['advantage'],[], 'Trades one life each upkeep for reliable extra cards.'],
 ['Black Market Connections',['advantage','ramp'],[], 'Flexible upkeep modes offer cards, Treasure, or a creature at a life cost.'],
 ['Morbid Opportunist',['advantage'],['sacrifice','tokens'], 'Draws from creatures dying, once each turn.'],
 ['Professional Face-Breaker',['advantage','ramp'],['tokens'], 'Combat damage creates Treasure that can become impulse access.'],
 ['Valakut Exploration',['advantage'],[], 'Land drops become temporary card access and later chip damage.'],
 ['Guardian Project',['advantage'],[], 'Creature entries become repeatable cards in a singleton deck.'],
 ['Beast Whisperer',['advantage'],[], 'Casting creature spells becomes repeatable card draw.'],
 ['Toski, Bearer of Secrets',['advantage'],['tokens'], 'A wide attacking board can draw several cards through combat damage.'],
 ['Return of the Wildspeaker',['advantage','finisher'],[], 'Either draws from the largest non-Human power or pumps non-Humans; it does not grant trample.'],
 ['Skullclamp',['advantage'],['tokens','sacrifice'], 'Turns expendable one-toughness creatures into two cards.'],
 ['Idol of Oblivion',['advantage'],['tokens'], 'A low-cost repeatable draw engine when the deck makes tokens each turn.'],
 ['Swords to Plowshares',['interaction','low_curve'],[], 'One mana permanently answers a creature; its controller gains life.'],
 ['Path to Exile',['interaction','low_curve'],[], 'One mana permanently answers a creature; its controller may find a basic land.'],
 ['Generous Gift',['interaction'],[], 'Answers any permanent and leaves its controller a 3/3 Elephant.'],
 ['Arcane Denial',['interaction','low_curve'],['spellslinger'], 'A broad two-mana counter; the opponent draws two cards later.'],
 ['Pongify',['interaction','low_curve'],[], 'One mana destroys a creature and leaves its controller a 3/3 Ape.'],
 ['Rapid Hybridization',['interaction','low_curve'],[], 'One mana destroys a creature and leaves its controller a 3/3 Frog Lizard.'],
 ['Reality Shift',['interaction','low_curve'],[], 'Exiles a creature but gives its controller a manifested card.'],
 ['Resculpt',['interaction','low_curve'],[], 'Exiles an artifact or creature and leaves a 4/4 token.'],
 ['Feed the Swarm',['interaction','low_curve'],[], 'Black access to creature or enchantment removal at sorcery speed and a life cost.'],
 ['Infernal Grasp',['interaction','low_curve'],[], 'Two-mana creature removal with a two-life cost.'],
 ['Go for the Throat',['interaction','low_curve'],[], 'Efficient creature removal that cannot target artifact creatures.'],
 ['Chaos Warp',['interaction'],[], 'Can answer any permanent, with a random replacement risk.'],
 ['Abrade',['interaction','low_curve'],[], 'Choose three damage to a creature or destroy an artifact; neither mode answers larger nonartifact threats.'],
 ['Wild Magic Surge',['interaction','low_curve'],[], 'Destroys an opposing permanent, but its controller reveals into a replacement of the same card type.'],
 ['Beast Within',['interaction'],[], 'Answers any permanent and leaves its controller a 3/3 Beast.'],
 ['Krosan Grip',['interaction'],[], 'Split second makes this artifact or enchantment answer difficult to respond to.'],
 ["Assassin's Trophy",['interaction','low_curve'],[], 'Answers any permanent; its controller may find a basic land.'],
 ['Austere Command',['wipe'],[], 'Modal choices can spare selected permanent types, but only two modes resolve.'],
 ['Farewell',['wipe','graveyard_hate'],[], 'Exiles chosen permanent types and/or graveyards; its symmetry can erase your own resources.'],
 ['Supreme Verdict',['wipe'],[], 'An uncounterable creature wipe with a demanding white-blue cost.'],
 ['Toxic Deluge',['wipe'],[], 'Scalable -X/-X handles indestructible creatures at a life cost.'],
 ['Blasphemous Act',['wipe'],[], 'Often costs little on crowded boards; damage prevention or indestructible can blunt it.'],
 ['Cyclonic Rift',['wipe','interaction'],[], 'Spot bounce early or one-sided overload later; bounced cards can be replayed.'],
 ['Vandalblast',['wipe','interaction'],['artifacts'], 'A cheap artifact answer that can overload into a one-sided artifact reset.'],
 ['Bane of Progress',['wipe'],[], 'Clears artifacts and enchantments, including your own, then grows.'],
 ['Heroic Intervention',['protection'],[], 'Protects your permanents from destruction and targeting, not exile, sacrifice, or -X/-X.'],
 ["Tamiyo's Safekeeping",['protection','low_curve'],[], 'One mana protects one permanent and gains life.'],
 ["Tyvar's Stand",['protection','finisher','low_curve'],[], 'Protects one creature and can convert spare mana into power.'],
 ["Teferi's Protection",['protection'],[], 'Phases out your permanents and protects your life total for a turn cycle.'],
 ['Clever Concealment',['protection'],['tokens'], 'A wide board can convoke this and phase out any number of nonland permanents.'],
 ['Boros Charm',['protection','finisher','low_curve'],[], 'Protects permanents from destruction or supplies reach/double strike.'],
 ['Swiftfoot Boots',['protection','low_curve'],[], 'Reusable commander protection, but still needs equip timing and mana.'],
 ['Lightning Greaves',['protection','low_curve'],[], 'Free equip gives haste and shroud; shroud also blocks your own targeting.'],
 ['Soul-Guide Lantern',['graveyard_hate','low_curve'],[], 'Exiles one card on entry, then can clear opposing graveyards or replace itself.'],
 ['Relic of Progenitus',['graveyard_hate','low_curve'],[], 'Repeatable pressure with a full-graveyard reset that also exiles your own.'],
 ['Nihil Spellbomb',['graveyard_hate','low_curve'],[], 'One-shot opposing graveyard exile with optional card replacement in black.'],
 ['Unlicensed Hearse',['graveyard_hate'],[], 'Repeatable targeted exile that grows into a crewed threat.'],
 ['Scavenging Ooze',['graveyard_hate'],[], 'Repeatable single-card exile that needs green mana and can grow.'],
 ['Rest in Peace',['graveyard_hate','low_curve'],[], 'Comprehensive graveyard shutdown that also turns off your own graveyard plan.'],
 ['Dauthi Voidwalker',['graveyard_hate'],[], 'Replacement exile pressures opposing graveyards and can cast one exiled card.'],
 ['Bojuka Bog',['graveyard_hate','mana'],[], 'Uses a land slot to exile one opponent’s graveyard, but enters tapped and is sorcery-timed.'],
 ['Scavenger Grounds',['graveyard_hate','mana'],[], 'A land-slot reset for all graveyards that needs a Desert sacrifice.'],
 ['Impact Tremors',['finisher'],['tokens','Goblin'], 'Turns each creature token entering into damage to every opponent.'],
 ['Purphoros, God of the Forge',['finisher'],['tokens','Goblin'], 'Turns creature entries into two damage to every opponent and is hard to remove while not a creature.'],
 ['Shared Animosity',['finisher'],['tokens','Goblin','typal'], 'Rewards a wide typal attack with large power boosts.'],
 ['Goblin Bombardment',['finisher'],['tokens','Goblin','sacrifice'], 'Converts expendable creatures into reach and sacrifice triggers.'],
 ['Skirk Prospector',['ramp','finisher','low_curve'],['Goblin','sacrifice'], 'Turns Goblins into burst red mana; sacrificing the board is a real cost.'],
 ['Goblin Warchief',['ramp','finisher'],['Goblin','typal'], 'Reduces Goblin costs and grants haste, accelerating a typal attack.'],
 ['Thornbite Staff',['finisher'],['Goblin','sacrifice'], 'Can form an infinite untap line with Krenko plus a sacrifice outlet; disclose that combo before play.'],
 ['Umbral Mantle',['finisher'],['Elf'], 'Can repeatedly untap a creature that produces at least four mana, creating an infinite-mana line.'],
 ['Staff of Domination',['finisher','advantage'],['Elf'], 'With a creature making at least five mana, it can create infinite mana, life, cards, and untaps.'],
 ['Sword of the Paruns',['finisher'],['Elf'], 'Can loop untaps when a mana creature produces more than the activation costs.'],
 ['Wirewood Symbiote',['protection','ramp','low_curve'],['Elf'], 'Protects an Elf by returning it and untaps an Elf mana engine once each turn.'],
 ['Quirion Ranger',['ramp','low_curve'],['Elf'], 'Untaps a key creature once each turn by returning a Forest, preserving no net land development.'],
 ['Genesis Wave',['finisher'],['Elf'], 'Converts a large green mana engine into a battlefield of permanents.'],
 ['Finale of Devastation',['finisher'],['Elf'], 'Finds a creature early and becomes a lethal team pump at X of ten or more.'],
 ['Metallurgic Summonings',['finisher'],['spellslinger'], 'Turns noncreature spells into a growing token army.'],
 ['Murmuring Mystic',['finisher'],['spellslinger','tokens'], 'Builds a flying token army from each instant or sorcery cast.'],
 ['Shark Typhoon',['advantage','finisher'],['spellslinger','tokens'], 'Turns noncreature spells into flying threats, or cycles into one Shark and a replacement card.'],
 ['Docent of Perfection',['finisher'],['spellslinger','tokens'], 'Makes Wizards from instants and sorceries, then can transform into a flying team pump.'],
 ['Aetherflux Reservoir',['finisher'],['spellslinger'], 'Rewards a long spell chain with life and threatens a 50-life activation; it needs substantial setup.'],
 ['Young Pyromancer',['finisher','low_curve'],['spellslinger','tokens'], 'Builds a board from each instant or sorcery cast.'],
 ['Storm-Kiln Artist',['ramp','finisher'],['spellslinger'], 'Magecraft creates burst Treasure while prowess-like scaling supplies pressure.'],
 ['Thousand-Year Storm',['finisher'],['spellslinger'], 'Copies later instants and sorceries, but costs six and needs spells after it.'],
 ['Living Death',['finisher','wipe'],['graveyard'], 'Combines a creature wipe with mass reanimation; opposing graveyards also return.'],
 ['Syr Konrad, the Grim',['finisher'],['graveyard'], 'Turns creatures moving through graveyards into table-wide life loss.'],
 ['Victimize',['recursion'],['graveyard','sacrifice'], 'Trades one creature for two tapped reanimation targets.']
];
const recommendationByName=new Map(recommendationPool.map((row,index)=>[normalized(row[0]),{name:row[0],roles:row[1],tags:row[2],why:row[3],priority:recommendationPool.length-index}]));
function candidateRoleScore(entry,role){const rules=String(entry.oracle_text||'').toLowerCase(),type=String(entry.type_line||'').toLowerCase(),mv=Number(entry.cmc)||0;let score=0;
 if(role==='ramp'&&!type.includes('land')&&(/add \{|add one mana|add two mana|treasure token|search your library for (?:a |an )?(?:basic )?land card/.test(rules)))score=32;
 if(role==='advantage'&&(/whenever[^.]{0,120}draw|at the beginning[^.]{0,120}draw|draw (?:two|three|x|cards equal|a card for each)|may (?:play|cast)[^.]{0,100}(?:from exile|from the top)/.test(rules)))score=31;
 if(role==='interaction'&&!/(?:destroy|exile|return) target [^.]* card[^.]{0,80} (?:from|in) (?:your|a|an opponent'?s) graveyard/.test(rules)&&(/destroy target (?:artifact|creature|enchantment|permanent|planeswalker)|exile target (?:artifact|creature|enchantment|nonland permanent|permanent|planeswalker|spell)|counter target (?:spell|activated ability|triggered ability)|return target (?:spell|creature|nonland permanent|permanent)[^.]*owner'?s hand/.test(rules)))score=30;
 if(role==='wipe'&&(/(?:destroy|exile) all (?:creatures|artifacts|enchantments|nonland permanents|permanents)|damage to each creature|all creatures get -/.test(rules)))score=30;
 if(role==='protection'&&(/(?:target|another) (?:creature|permanent)[^.]{0,80}(?:hexproof|indestructible)|(?:creatures|permanents) you control (?:gain|have) (?:hexproof|indestructible)|phase out[^.]{0,80}(?:creatures|permanents) you control/.test(rules)))score=30;
 if(role==='graveyard_hate'&&(/exile (?:all cards|target card|each opponent'?s graveyard|all graveyards)|cards? in graveyards? can'?t/.test(rules)))score=30;
 if(role==='finisher'&&(/damage to each opponent|you win the game|each opponent loses (?:x|that much|life equal)|additional combat phase|creatures you control get \+(?:x|[2-9]|\d{2})\/(?:\+)?(?:x|[2-9]|\d{2})/.test(rules)))score=29;
 if(role==='mana'&&type.includes('land'))score=18;
 if(role==='land'&&type.includes('land'))score=22;
 if(role==='low_curve'&&mv<=2&&!type.includes('land'))score=12+Math.max(0,2-mv);
 return score-Math.max(0,mv-4)*1.5;
}
function withinIdentity(entry,colors){const chosen=new Set(colors||[]);return [...String(entry.color_identity||'')].every(color=>chosen.has(color));}
function candidateExplanation(card,meta,role,context){
 const labels={ramp:'mana acceleration',mana:'mana-base support',advantage:'sustained advantage',interaction:'flexible interaction',wipe:'a reset button',protection:'plan protection',graveyard_hate:'graveyard counterplay',finisher:'a plan-aligned finisher',low_curve:'early-turn efficiency'};
 const links=[];if(meta?.tags?.includes(context.tribe))links.push(`${context.tribe} synergy`);for(const signal of context.planSignals||[])if(meta?.tags?.includes(signal))links.push(`${signal} synergy`);
 return `${meta?.why||`${card.name} has verified rules text supporting ${labels[role]||role}.`}${links.length?` Fit: ${[...new Set(links)].join(' and ')}.`:''}`;
}
async function recommendations(body){
 const context={colors:Array.isArray(body?.colors)?body.colors.filter(color=>'WUBRG'.includes(color)):[],planSignals:Array.isArray(body?.planSignals)?body.planSignals:[],tribe:String(body?.tribe||''),issues:Array.isArray(body?.issues)?body.issues:[]};
 if(body?.identityProblem)return {groups:[],notice:body.identityProblem,reviewedAt:'2026-10-17',sourceUpdatedAt:(await manifest()).status.bulkUpdatedAt};
 const existingIds=new Set((body?.existingOracleIds||[]).filter(Boolean)),existingNames=new Set((body?.existingNames||[]).map(normalized));
 const data=await index(),validLayouts=new Set(['normal','split','flip','transform','modal_dfc','meld','adventure','leveler','saga','class','case','prototype']);
 const groups=[];const used=new Set();
 for(const issue of context.issues.filter(issue=>issue?.candidateRole).slice(0,7)){
  const role=issue.candidateRole;
  let entries=data.cards.filter(entry=>entry.commander_legal&&validLayouts.has(entry.layout)&&withinIdentity(entry,context.colors)&&!existingIds.has(entry.oracle_id)&&!existingNames.has(normalized(entry.name)));
  entries=entries.map(entry=>{const meta=recommendationByName.get(entry.normalized_name),base=candidateRoleScore(entry,role),roleFit=meta?.roles.includes(role)?36:0,tribeFit=meta?.tags.includes(context.tribe)?18:0,planFit=(context.planSignals||[]).filter(signal=>meta?.tags.includes(signal)).length*32,conflictPenalty=context.planSignals.includes('graveyard')&&['rest in peace','relic of progenitus'].includes(entry.normalized_name)?25:0;return {entry,meta,base,roleFit,score:base+roleFit+tribeFit+planFit+(meta?Math.min(8,meta.priority/15):0)-conflictPenalty};}).filter(item=>(item.base>0||item.roleFit>0)&&item.score>=20&&!used.has(item.entry.oracle_id))
   .filter(item=>!(['thornbite staff','umbral mantle','staff of domination','sword of the paruns'].includes(item.entry.normalized_name)&&!item.meta?.tags.some(tag=>tag===context.tribe||(context.planSignals||[]).includes(tag))))
   .filter(item=>!(context.colors.length===0&&['arcane signet','command tower'].includes(item.entry.normalized_name)))
   .filter(item=>!(Number(body?.forestTargets)===0&&['nature s lore','three visits'].includes(item.entry.normalized_name)))
   .filter(item=>!(Number(body?.humanRatio)>.55&&item.entry.normalized_name==='return of the wildspeaker'))
   .sort((a,b)=>b.score-a.score||Number(a.entry.cmc)-Number(b.entry.cmc)||compare(a.entry.normalized_name,b.entry.normalized_name)||compare(a.entry.oracle_id,b.entry.oracle_id));
  const loaded=[];for(const item of entries.slice(0,16)){const full=await card(item.entry.oracle_id);if(!full||full.metadataComplete===false||full.legalities?.commander!=='legal'||!full.oracleText||existingIds.has(full.oracleId)||existingNames.has(normalized(full.name)))continue;const rank=Number(full.raw?.edhrec_rank);item.score+=(Number.isFinite(rank)?Math.max(0,8-Math.log10(Math.max(1,rank))*2):0);loaded.push({...item,card:full});}
  loaded.sort((a,b)=>b.score-a.score||Number(a.card.cmc)-Number(b.card.cmc)||compare(a.card.name,b.card.name));
  const cards=loaded.slice(0,3).map(item=>{used.add(item.card.oracleId);const caveats=[];if(item.card.raw?.game_changer)caveats.push('Game Changer: discuss power expectations; this is not a ban.');if(['Thornbite Staff','Umbral Mantle','Staff of Domination','Sword of the Paruns'].includes(item.card.name))caveats.push('Potential deterministic combo piece; disclose the line before play.');if(context.planSignals.includes('graveyard')&&['Rest in Peace','Relic of Progenitus'].includes(item.card.name))caveats.push('This also disrupts your own graveyard plan.');if(role==='land'&&!/^basic land/i.test(item.card.typeLine||''))caveats.push('Use an appropriate land swap when the deck is already at its land target; utility lands can add tapped timing or color strain.');return {card:item.card,why:candidateExplanation(item.card,item.meta,role,context),caveats,score:Number(item.score.toFixed(2))};});
  groups.push({issue:{id:issue.id,label:issue.label,severity:issue.severity,evidence:issue.evidence,recommendation:issue.recommendation},cards,emptyReason:cards.length?'':'No sound legal candidate cleared the role, identity, metadata, and exclusion checks.'});
 }
 return {groups,reviewedAt:'2026-10-17',sourceUpdatedAt:(await manifest()).status.bulkUpdatedAt,method:'Deterministic role evidence, castability, plan fit, caveats, and bounded catalog ranking. No runtime AI.'};
}
async function dispatch(path,params,body){
 if(path==='/api/status')return (await manifest()).status;
 if(path==='/api/cards')return search(params);
 if(path==='/api/card')return {card:params.name?await resolve(params.name):await card(params.id)};
 if(path==='/api/resolve')return {cards:await Promise.all((body?.names||[]).map(resolve))};
 if(path==='/api/match-name')return matchName(body?.name);
 if(path==='/api/recommendations')return recommendations(body);
 if(path==='/api/retrieve'){const result=await search({...params,limit:Math.min(Number(params.limit)||8,20)});return {schema:'deck-sage-context-v1',query:params.q||'',totalMatches:result.total,cards:result.cards.map(c=>Object.fromEntries(['oracleId','name','manaCost','cmc','typeLine','oracleText','colorIdentity','keywords','power','toughness','legalities','dataSource','dataNote','metadataComplete'].map(k=>[k,c[k]]))),sourceUpdatedAt:(await manifest()).status.bulkUpdatedAt};}
 throw Error('Unsupported card request.');
}
self.onmessage=async({data})=>{try{self.postMessage({id:data.id,result:await dispatch(data.path,data.params||{},data.body)});}catch(error){self.postMessage({id:data.id,error:error.message||'Card library request failed.'});}};
