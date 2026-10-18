(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.DeckSageRamp=api;
})(typeof self!=='undefined'?self:globalThis,function(){
 function lower(value){return String(value||'').toLowerCase();}
 function field(card,camel,snake){return card?.[camel]??card?.[snake]??'';}
 function isLandType(typeLine){return /(^|\s|-)land(\s|$|-)/i.test(typeLine||'');}
 function wordNumber(value){const normalized=lower(value).replace(/^up to\s+/,'').trim();return {a:1,an:1,one:1,two:2,three:3,four:4}[normalized]||1;}
 function landSearchRampWeight(rules){
  const searches=[...String(rules||'').matchAll(/search your library for\s+(up to\s+)?(a|an|one|two|three|four|x)\s+([^.]{1,180}?)(?:,\s*(?:reveal [^.]{0,100}?,\s*)?|\s+and\s+)put\s+(one|it|that card|them|those cards|the rest|any number of them)\s+onto the battlefield/gi)];
  let best=0;
  for(const match of searches){
   const searchStart=match.index||0,count=wordNumber(`${match[1]||''}${match[2]}`);
   if(!/(?:basic\s+land|\bland card|plains|island|swamp|mountain|forest)/i.test(match[3]))continue;
   const placed=/^(?:them|those cards|the rest|any number of them)$/i.test(match[4])?count:1;
   const prefix=String(rules||'').slice(Math.max(0,searchStart-220),searchStart),sacrifice=/sacrifice (?:a|one) land/i.test(prefix)?1:0;
   if(placed-sacrifice<=0)continue;
   const conditional=/if an opponent controls more lands|if a player controls more lands|whenever [^.]{0,100}(?:deals combat damage|attacks)/i.test(prefix);
   best=Math.max(best,conditional?.65:1);
  }
  return best;
 }
 function classifyRampCard(card){
  const typeLine=lower(field(card,'typeLine','type_line')),rules=lower(field(card,'oracleText','oracle_text'));
  if(isLandType(typeLine))return {kind:'none',weight:0,basis:'land'};
  const landSearch=landSearchRampWeight(rules);
  if(landSearch)return {kind:landSearch===1?'reliable':'conditional',weight:landSearch,basis:'net-land-search'};
  if(/(?:\{t\}|tap an untapped)[^:]{0,100}:?\s*add\s+(?:\{|one|two|three|x)/i.test(rules)&&!/sacrifice/i.test(rules))return {kind:'reliable',weight:1,basis:'repeatable-mana'};
  if(/add (?:one|two|three|x|an amount of) mana/i.test(rules)&&!/sacrifice/i.test(rules))return {kind:'burst',weight:.75,basis:'one-shot-mana'};
  if(/(?:spells?|creatures?) (?:you cast )?cost [^.]*(?:less|to cast)/i.test(rules))return {kind:'conditional',weight:.6,basis:'cost-reduction'};
  if(/whenever[^.]{0,120}create (?:a|one|two|three|x) treasure token/i.test(rules))return {kind:'conditional',weight:.5,basis:'triggered-treasure'};
  if(/create (?:a|one|two|three|x) treasure token/i.test(rules))return {kind:'burst',weight:.35,basis:'one-shot-treasure'};
  if(/sacrifice [^.:]+:?\s*add/i.test(rules))return {kind:'burst',weight:.35,basis:'sacrifice-mana'};
  return {kind:'none',weight:0,basis:'none'};
 }
 return {classifyRampCard,landSearchRampWeight};
});
