(function(root,factory){
 const value=factory();
 if(typeof module==='object'&&module.exports)module.exports=value;
 root.DeckSageFacets=value;
})(typeof self!=='undefined'?self:globalThis,function(){
 'use strict';
 const groups=[
  {id:'essentials',label:'Deck essentials',roles:[
   {id:'ramp',label:'Ramp',description:'Adds lasting access to more mana.'},
   {id:'card_advantage',label:'Card advantage',description:'Draw, impulse access, and repeatable card-flow engines.'},
   {id:'tutors',label:'Tutors',description:'Searches a library for cards, including restricted tutors.'},
  ]},
  {id:'interaction',label:'Interaction',roles:[
   {id:'spot_removal',label:'Spot removal',description:'Answers one targeted permanent.'},
   {id:'board_wipes',label:'Board wipes',description:'Clears a broad class of permanents, sometimes asymmetrically.'},
   {id:'counterspells',label:'Counterspells',description:'Counters spells or abilities, including soft counters.'},
   {id:'graveyard_hate',label:'Graveyard hate',description:'Exiles or shuts down opposing graveyards.'},
  ]},
  {id:'resilience',label:'Resilience',roles:[
   {id:'protection',label:'Protection',description:'Saves permanents with hexproof, indestructible, phasing, flicker, or similar effects.'},
   {id:'recursion',label:'Recursion',description:'Gets cards back from the graveyard for reuse.'},
  ]},
  {id:'engines',label:'Engines & themes',roles:[
   {id:'token_makers',label:'Token makers',description:'Creates creature or noncreature tokens; repeatable and one-shot effects both qualify.'},
   {id:'sacrifice_outlets',label:'Sacrifice outlets',description:'Lets you sacrifice your own resources, including free and repeatable outlets.'},
   {id:'equipment_cards',label:'Equipment cards',description:'Cards whose type line is Equipment.'},
   {id:'equipment_support',label:'Equipment support',description:'Non-Equipment cards tagged as caring about or enabling Equipment.'},
   {id:'game_closers',label:'Game closers',description:'Narrow signals such as overruns, extra combats, or alternate wins; context still matters.'},
  ]},
 ];
 const roles=groups.flatMap(group=>group.roles),byId=Object.fromEntries(roles.map(role=>[role.id,role]));
 const text=card=>String(card.oracle_text??card.oracleText??'').toLowerCase();
 const type=card=>String(card.type_line??card.typeLine??'').toLowerCase();
 function inferred(card){
  const oracle=text(card),typeLine=type(card),found=new Set();
  if(/\bequipment\b/.test(typeLine))found.add('equipment_cards');
  if(!/\bequipment\b/.test(typeLine)&&/\b(equipment|equipped creature|equip costs?)\b/.test(oracle))found.add('equipment_support');
  if(/\bcreate(?:s|d)?\b[\s\S]{0,140}\btoken\b|\b(investigate|amass|incubate)\b/.test(oracle))found.add('token_makers');
  if(/\bcounter target (?:spell|activated ability|triggered ability|spell or ability)\b/.test(oracle))found.add('counterspells');
  if(/\b(?:destroy|exile) target (?:nonland )?(?:permanent|creature|artifact|enchantment|planeswalker|battle)\b|\breturn target (?:nonland )?(?:permanent|creature|artifact|enchantment)\b[\s\S]{0,45}\bowner'?s hand\b/.test(oracle))found.add('spot_removal');
  if(/\b(?:destroy|exile) all (?:creatures|artifacts|enchantments|nonland permanents|permanents)\b|\beach creature gets -\d+\/-\d+\b/.test(oracle))found.add('board_wipes');
  if(/\b(?:you control|your creatures?|your permanents?|another target (?:creature|permanent))\b[\s\S]{0,80}\b(?:hexproof|indestructible|phase out|protection from)\b|\bphase out any number of (?:target )?(?:creatures|permanents)\b/.test(oracle))found.add('protection');
  if(/\b(?:return|put) (?:target |a )?(?:permanent |creature |artifact |enchantment |land )?card\b[\s\S]{0,75}\bfrom (?:your|a) graveyard\b|\b(?:cast|play) [\s\S]{0,50}\bfrom your graveyard\b/.test(oracle))found.add('recursion');
  if(/\bexile (?:all cards|target card|up to \w+ target cards?) from (?:a|target player'?s|all) graveyard\b|\bcards in graveyards? can'?t\b/.test(oracle))found.add('graveyard_hate');
  if(/\bsacrifice (?:a|another|one or more|any number of) (?:creature|permanent|artifact|token)[^:]{0,90}:/.test(oracle))found.add('sacrifice_outlets');
  if(/\bsearch your library for (?:a|an|up to|one|two|three|any number of)\b/.test(oracle))found.add('tutors');
  if(/\bdraw (?:a|one|two|three|x|that many|cards equal to|\d+) cards?\b|\b(exile|look at) the top [\s\S]{0,70}\b(?:play|cast|put one|put any number)\b/.test(oracle))found.add('card_advantage');
  if(/\badd (?:one mana|two mana|three mana|\{[wubrgc]\})\b|\bput (?:that|the|a) land (?:card )?onto the battlefield\b/.test(oracle))found.add('ramp');
  if(/\b(extra combat phase|you win the game|target opponent loses the game)\b|\bcreatures you control get \+\d+\/\+\d+[\s\S]{0,80}\bgain trample\b/.test(oracle))found.add('game_closers');
  return found;
 }
 function roleSet(card){
  const tagged=card.role_tags??card.roleTags;
  return Array.isArray(tagged)?new Set(tagged):inferred(card);
 }
 function matches(card,selected,mode='any'){
  if(!selected?.length)return true;
  const found=roleSet(card);
  return mode==='all'?selected.every(role=>found.has(role)):selected.some(role=>found.has(role));
 }
 return {groups,roles,byId,inferred,roleSet,matches};
});
