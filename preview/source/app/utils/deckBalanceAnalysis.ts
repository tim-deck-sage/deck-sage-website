type DeckCard = {
  name: string;
  manaCost?: string;
  cmc?: number;
  typeLine?: string;
  oracleText?: string;
  colorIdentity?: string[];
  color_identity?: string[] | string;
  quantity?: number;
  role?: string;
};

type BasicLandCounts = Record<'Plains' | 'Island' | 'Swamp' | 'Mountain' | 'Forest' | 'Wastes', number>;

type DeckForBalance = {
  name: string;
  cards: DeckCard[];
  commanders?: DeckCard[];
  commanderCard?: DeckCard;
  basicLands: BasicLandCounts;
  targetSize?: number;
};

export type DeckWeakness = {
  id: 'lands' | 'color_sources' | 'curve' | 'ramp' | 'advantage' | 'interaction' | 'wipes' | 'protection' | 'graveyard_hate' | 'finishers' | 'incomplete';
  label: string;
  severity: 'watch' | 'important' | 'critical';
  current?: number;
  target?: number;
  evidence: string;
  recommendation: string;
  candidateRole?: string;
};

export type DeckBalanceBreakdown = {
  status: 'Balanced' | 'Needs Work' | 'Unbalanced';
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  completeness: number;
  landCount: number;
  averageCmc: number;
  creatureCount: number;
  nonCreatureCount: number;
  rampCount: number;
  drawCount: number;
  removalCount: number;
  boardWipeCount: number;
  protectionCount: number;
  graveyardHateCount: number;
  finisherCount: number;
  colorSources: Record<string, number>;
  colorDemand: Record<string, number>;
  planSignals: string[];
  tribe?: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  issues: DeckWeakness[];
};

const COLORS = ['W', 'U', 'B', 'R', 'G'] as const;
const BASIC_COLORS: Record<string, string> = {Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G'};

function lower(value?: string): string { return String(value || '').toLowerCase(); }
function text(card: DeckCard): string { return `${lower(card.typeLine)}\n${lower(card.oracleText)}`; }
function isLand(card: DeckCard): boolean { return /(^|\s|—)land(\s|$|—)/i.test(card.typeLine || ''); }
function isCreature(card: DeckCard): boolean { return /creature/i.test(card.typeLine || ''); }
function amount(card: DeckCard): number { return Math.max(1, Number(card.quantity) || 1); }

function isRamp(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const rules = lower(card.oracleText);
  return /(?:\{t\}|tap an untapped|sacrifice [^.:]+):?\s*add\s+(?:\{|one|two|three|x)/i.test(rules)
    || /add (?:one|two|three|x|an amount of) mana/i.test(rules)
    || /search your library for (?:an? )?(?:basic )?land card[^.]*put (?:it|that card) onto the battlefield/i.test(rules)
    || /create (?:a|one|two|three|x) treasure token/i.test(rules);
}

function advantageWeight(card: DeckCard): number {
  const rules = lower(card.oracleText);
  if (!rules) return 0;
  const repeatable = /(?:whenever|at the beginning|the first time|one or more|combat damage)[^.]{0,150}(?:draw|exile the top|look at the top)/i.test(rules)
    || /(?:\{t\}|pay [^.:]+|sacrifice [^.:]+):?[^.]{0,100}draw/i.test(rules)
    || /you may (?:play|cast) (?:cards?|spells?)?[^.]{0,80}(?:from exile|from the top)/i.test(rules);
  if (repeatable) return 1;
  if (/draw (?:two|three|four|x|that many|cards equal|a card for each)/i.test(rules)) return 1;
  if (/exile the top (?:two|three|four|x|that many) cards?[^.]{0,100}(?:play|cast)/i.test(rules)) return .8;
  if (/draw a card/i.test(rules)) return .25;
  return 0;
}

function isInteraction(card: DeckCard): boolean {
  const rules = lower(card.oracleText);
  if (/(?:destroy|exile|return) target [^.]* card[^.]{0,80} (?:from|in) (?:your|a|an opponent'?s) graveyard/i.test(rules)) return false;
  if (/destroy target (?:artifact|creature|enchantment|permanent|planeswalker)/i.test(rules)) return true;
  if (/exile target (?:artifact|creature|enchantment|nonland permanent|permanent|planeswalker|spell)/i.test(rules)) return true;
  if (/counter target (?:spell|activated ability|triggered ability)/i.test(rules)) return true;
  if (/return target (?:spell|creature|nonland permanent|permanent)[^.]*owner'?s hand/i.test(rules)) return true;
  if (/target (?:player|opponent) sacrifices (?:a|an) (?:creature|artifact|enchantment|permanent)/i.test(rules)) return true;
  return /deals? \w+ damage to target (?:creature|planeswalker)/i.test(rules);
}

function isBoardWipe(card: DeckCard): boolean {
  const rules = lower(card.oracleText);
  return /(?:destroy|exile) all (?:creatures|artifacts|enchantments|nonland permanents|permanents)/i.test(rules)
    || /all creatures get -\w+\/-\w+/i.test(rules)
    || /deals? \w+ damage to (?:each|all) creature/i.test(rules)
    || /each player sacrifices (?:all|\w+) creatures/i.test(rules)
    || /return all (?:creatures|nonland permanents|permanents)[^.]*owners?' hands/i.test(rules);
}

function isProtection(card: DeckCard): boolean {
  const rules = lower(card.oracleText);
  return /(?:target|another) (?:creature|permanent)[^.]{0,90}(?:gains?|has) (?:hexproof|indestructible|protection from)/i.test(rules)
    || /(?:creatures|permanents) you control (?:gain|have) (?:hexproof|indestructible|protection from)/i.test(rules)
    || /phase out (?:any number of )?(?:other )?(?:target )?(?:creatures|permanents) you control/i.test(rules)
    || /counter target spell[^.]*targets? (?:a permanent|a creature|you)/i.test(rules)
    || /regenerate (?:target|each|all)/i.test(rules);
}

function isGraveyardHate(card: DeckCard): boolean {
  const rules = lower(card.oracleText);
  return /exile (?:all cards|target card|up to \w+ target cards|each opponent'?s graveyard|all graveyards)/i.test(rules)
    || /cards? in graveyards? can'?t/i.test(rules)
    || /if a card or token would be put into (?:an opponent'?s|a) graveyard[^.]*exile/i.test(rules);
}

function isFinisher(card: DeckCard): boolean {
  const rules = lower(card.oracleText);
  return /you win the game|target opponent loses the game/i.test(rules)
    || /damage to each opponent/i.test(rules)
    || /each opponent loses (?:x|that much|life equal)/i.test(rules)
    || /creatures you control get \+(?:x|[2-9]|\d{2})\/\+(?:x|[2-9]|\d{2})[^.]{0,100}(?:trample|until end of turn)/i.test(rules)
    || /(?:double|triple) (?:the )?(?:power|number of|damage)/i.test(rules)
    || /additional combat phase|extra combat phase/i.test(rules);
}

function averageManaValue(cards: DeckCard[]): number {
  const spells = cards.filter(card => !isLand(card) && Number.isFinite(card.cmc));
  const count = spells.reduce((sum, card) => sum + amount(card), 0);
  return count ? spells.reduce((sum, card) => sum + (Number(card.cmc) || 0) * amount(card), 0) / count : 0;
}

function commandZone(deck: DeckForBalance): DeckCard[] {
  const selected = deck.commanders?.length ? deck.commanders : deck.commanderCard ? [{...deck.commanderCard, role: 'primary'}] : [];
  return selected.filter(card => card.role !== 'companion');
}

function commanderIdentity(deck: DeckForBalance): string[] {
  const colors = new Set<string>();
  for (const card of commandZone(deck)) {
    const identity = card.colorIdentity || card.color_identity || [];
    for (const color of typeof identity === 'string' ? identity.split('') : identity) if (COLORS.includes(color as typeof COLORS[number])) colors.add(color);
  }
  return COLORS.filter(color => colors.has(color));
}

function manaProfile(cards: DeckCard[], basics: BasicLandCounts, identity: string[]) {
  const demand = Object.fromEntries(COLORS.map(color => [color, 0]));
  const sources = Object.fromEntries(COLORS.map(color => [color, 0]));
  for (const card of cards) {
    if (!isLand(card)) for (const symbol of String(card.manaCost || '').match(/\{[^}]+\}/g) || []) {
      for (const color of COLORS) if (symbol.includes(color)) demand[color] += amount(card);
    }
    if (isLand(card)) {
      const rules = lower(card.oracleText);
      for (const color of COLORS) if (new RegExp(`add \\{${color}\\}`, 'i').test(rules)) sources[color] += amount(card);
      if (/mana of any color in your commander'?s color identity/i.test(rules)) for (const color of identity) sources[color] += amount(card);
    }
  }
  for (const [name, color] of Object.entries(BASIC_COLORS)) sources[color] += Math.max(0, Number(basics[name as keyof BasicLandCounts]) || 0);
  return {demand, sources};
}

function detectPlan(deck: DeckForBalance, cards: DeckCard[]) {
  const commanders = commandZone(deck);
  const joined = [...commanders, ...cards].map(text).join('\n');
  const signals: string[] = [];
  const spellCount = cards.filter(card => /instant|sorcery/i.test(card.typeLine || '')).length;
  const artifactCount = cards.filter(card => /artifact/i.test(card.typeLine || '')).length;
  if (spellCount >= 16 || commanders.some(card => /instant or sorcery|noncreature spell/i.test(card.oracleText || ''))) signals.push('spellslinger');
  if (/create [^.]*token/i.test(joined)) signals.push('tokens');
  if (/\+1\/\+1 counter|counter on/i.test(joined)) signals.push('counters');
  if (/graveyard|mill |discard |sacrifice/i.test(joined)) signals.push('graveyard');
  if (artifactCount >= 15 || commanders.some(card => /artifact/i.test(card.oracleText || ''))) signals.push('artifacts');
  if (/sacrifice (?:a|another|one or more)/i.test(joined)) signals.push('sacrifice');
  const types = new Map<string, number>();
  const classTypes = new Set(['Advisor','Archer','Artificer','Assassin','Barbarian','Bard','Berserker','Cleric','Druid','Knight','Monk','Noble','Pirate','Ranger','Rogue','Scout','Shaman','Soldier','Warlock','Warrior','Wizard']);
  for (const card of cards.filter(isCreature)) {
    const tail = String(card.typeLine || '').split('—')[1] || '';
    for (const type of tail.trim().split(/\s+/).filter(Boolean)) if (!['and', 'or'].includes(lower(type)) && !classTypes.has(type)) types.set(type, (types.get(type) || 0) + amount(card));
  }
  const tribe = [...types.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (tribe && tribe[1] >= 8) signals.push('typal');
  return {signals: [...new Set(signals)], tribe: tribe?.[1] >= 8 ? tribe[0] : undefined};
}

export function analyzeDeckBalance(deck: DeckForBalance): DeckBalanceBreakdown {
  const cards = deck.cards || [], basics = deck.basicLands || ({} as BasicLandCounts), identity = commanderIdentity(deck);
  const namedLandCount = cards.filter(isLand).reduce((sum, card) => sum + amount(card), 0);
  const basicLandCount = Object.values(basics).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
  const landCount = namedLandCount + basicLandCount;
  const listSize = cards.reduce((sum, card) => sum + amount(card), 0) + basicLandCount + commandZone(deck).length;
  const targetSize = Math.max(1, deck.targetSize || 100), completeness = Math.min(1, listSize / targetSize);
  const missingMetadata = cards.filter(card => !card.typeLine || (!isLand(card) && !card.oracleText)).length;
  const confidence: 'low' | 'medium' | 'high' = completeness < .6 || missingMetadata > 8 ? 'low' : completeness < .9 || missingMetadata ? 'medium' : 'high';
  const creatureCount = cards.filter(isCreature).reduce((sum, card) => sum + amount(card), 0);
  const spellCount = cards.reduce((sum, card) => sum + amount(card), 0);
  const nonCreatureCount = spellCount - creatureCount;
  const rampCount = cards.filter(isRamp).reduce((sum, card) => sum + amount(card), 0);
  const drawCount = Number(cards.reduce((sum, card) => sum + advantageWeight(card) * amount(card), 0).toFixed(2));
  const removalCount = cards.filter(card => isInteraction(card) && !isBoardWipe(card)).reduce((sum, card) => sum + amount(card), 0);
  const boardWipeCount = cards.filter(isBoardWipe).reduce((sum, card) => sum + amount(card), 0);
  const protectionCount = cards.filter(isProtection).reduce((sum, card) => sum + amount(card), 0);
  const graveyardHateCount = cards.filter(isGraveyardHate).reduce((sum, card) => sum + amount(card), 0);
  const finisherCount = cards.filter(isFinisher).reduce((sum, card) => sum + amount(card), 0);
  const averageCmc = averageManaValue(cards);
  const {signals: planSignals, tribe} = detectPlan(deck, cards);
  const {demand: colorDemand, sources: colorSources} = manaProfile(cards, basics, identity);
  const commanderCmc = Math.max(0, ...commandZone(deck).map(card => Number(card.cmc) || 0));

  const landTarget = Math.max(32, Math.min(39, Math.round(34 + Math.max(0, averageCmc - 3) * 2 + (commanderCmc >= 6 ? 1 : 0) - (rampCount >= 12 ? 1 : 0))));
  const rampTarget = Math.max(7, Math.min(12, Math.round(8 + Math.max(0, averageCmc - 3) * 2 + (commanderCmc >= 5 ? 1 : 0))));
  const advantageTarget = planSignals.includes('spellslinger') ? 7 : 8;
  const interactionTarget = planSignals.includes('spellslinger') ? 8 : 7;
  const wipeTarget = planSignals.includes('tokens') || creatureCount >= 28 ? 1 : 2;
  const protectionTarget = commandZone(deck).some(card => /whenever|combat damage|tap:/i.test(card.oracleText || '')) ? 3 : 2;
  const finisherTarget = planSignals.includes('spellslinger') ? 2 : 3;

  const issues: DeckWeakness[] = [];
  const addIssue = (issue: DeckWeakness) => issues.push(issue);
  if (landCount < landTarget) addIssue({id:'lands',label:'Mana base depth',severity:landCount < landTarget - 4?'critical':'important',current:landCount,target:landTarget,evidence:`${landCount} lands found; this curve and command zone suggest about ${landTarget}.`,recommendation:`Add roughly ${landTarget-landCount} lands, prioritizing sources for the colors the deck actually asks for.`,candidateRole:'land'});
  if (averageCmc > 3.8) addIssue({id:'curve',label:'Early-turn pacing',severity:averageCmc > 4.4?'critical':'important',current:Number(averageCmc.toFixed(1)),target:3.8,evidence:`Nonland spells average ${averageCmc.toFixed(1)} mana value.`,recommendation:'Replace a few expensive setup cards with efficient ramp, interaction, or advantage.',candidateRole:'low_curve'});
  if (rampCount < rampTarget) addIssue({id:'ramp',label:'Mana acceleration',severity:rampCount < rampTarget-3?'critical':'important',current:rampCount,target:rampTarget,evidence:`${rampCount} reliable accelerants found; artifact type alone does not count.`,recommendation:`Add ${rampTarget-rampCount} efficient ramp pieces that the mana base can cast.`,candidateRole:'ramp'});
  if (drawCount < advantageTarget) addIssue({id:'advantage',label:'Sustained card advantage',severity:drawCount < advantageTarget-3?'critical':'important',current:drawCount,target:advantageTarget,evidence:`Effective advantage score is ${drawCount}; one-shot cantrips count only fractionally.`,recommendation:'Add repeatable or multi-card advantage that rewards the deck’s game plan.',candidateRole:'advantage'});
  if (removalCount < interactionTarget) addIssue({id:'interaction',label:'Flexible interaction',severity:removalCount < interactionTarget-3?'critical':'important',current:removalCount,target:interactionTarget,evidence:`${removalCount} precise answers to spells or permanents found.`,recommendation:'Add efficient answers that cover permanent types your colors can reach.',candidateRole:'interaction'});
  if (boardWipeCount < wipeTarget) addIssue({id:'wipes',label:'Reset buttons',severity:'watch',current:boardWipeCount,target:wipeTarget,evidence:`${boardWipeCount} broad reset ${boardWipeCount===1?'was':'were'} found.`,recommendation:'Consider a reset that is asymmetrical or leaves your main plan recoverable.',candidateRole:'wipe'});
  if (protectionCount < protectionTarget) addIssue({id:'protection',label:'Plan protection',severity:'watch',current:protectionCount,target:protectionTarget,evidence:`${protectionCount} effects protect other key pieces; self-only hexproof is excluded.`,recommendation:'Add protection that shields your commander, engine, or board from common interaction.',candidateRole:'protection'});
  if (graveyardHateCount < 1) addIssue({id:'graveyard_hate',label:'Graveyard counterplay',severity:'watch',current:graveyardHateCount,target:1,evidence:'No reliable way to interrupt an opponent’s graveyard was found.',recommendation:'Reserve a flexible slot for graveyard interaction that is not dead in other matchups.',candidateRole:'graveyard_hate'});
  if (finisherCount < finisherTarget) addIssue({id:'finishers',label:'Closing the game',severity:finisherCount===0?'important':'watch',current:finisherCount,target:finisherTarget,evidence:`${finisherCount} explicit ways to convert a board or engine into a win were found; mana value alone does not count.`,recommendation:'Add a payoff that advances the detected plan instead of a generic expensive threat.',candidateRole:'finisher'});

  for (const color of identity) {
    const demand = colorDemand[color] || 0, source = colorSources[color] || 0;
    if (demand >= 6 && source < Math.min(12, Math.ceil(demand * .75))) addIssue({id:'color_sources',label:`${color} source pressure`,severity:source < 7?'important':'watch',current:source,target:Math.min(12,Math.ceil(demand*.75)),evidence:`${demand} colored pips but only ${source} explicit ${color} sources were detected.`,recommendation:'Improve this color’s source count before adding harder-to-cast spells.',candidateRole:'mana'});
  }
  if (confidence !== 'high') addIssue({id:'incomplete',label:'Incomplete evidence',severity:'watch',evidence:`The list is ${Math.round(completeness*100)}% of ${targetSize} cards with ${missingMetadata} incomplete record${missingMetadata===1?'':'s'}.`,recommendation:'Treat counts and recommendations as provisional until the list and card records are complete.'});

  const strengths: string[] = [];
  if (landCount >= landTarget && landCount <= landTarget + 3) strengths.push(`The ${landCount}-land mana base fits the current ${averageCmc.toFixed(1)} average mana value.`);
  if (rampCount >= rampTarget) strengths.push(`${rampCount} reliable ramp pieces support the current curve.`);
  if (drawCount >= advantageTarget) strengths.push(`Card advantage is supported by an effective score of ${drawCount}, with cantrips discounted.`);
  if (removalCount >= interactionTarget) strengths.push(`${removalCount} precise interaction pieces provide useful coverage.`);
  if (planSignals.length) strengths.push(`Detected plan signals: ${planSignals.join(', ')}${tribe ? ` (${tribe})` : ''}.`);

  const concerns = issues.map(issue => issue.evidence);
  const recommendations = issues.map(issue => issue.recommendation);
  const weighted = issues.reduce((sum, issue) => sum + (issue.severity==='critical'?3:issue.severity==='important'?2:.75), 0);
  const status: 'Balanced' | 'Needs Work' | 'Unbalanced' = weighted >= 10 ? 'Unbalanced' : weighted >= 4 ? 'Needs Work' : 'Balanced';
  const summary = confidence === 'low'
    ? `${deck.name} has a ${status.toLowerCase()} provisional shell. The list is too incomplete for confident final targets.`
    : `${deck.name} is rated ${status}. Targets adapt to its ${averageCmc.toFixed(1)} curve${planSignals.length?` and ${planSignals.join('/')} plan`:''}; they are guidance, not rigid rules.`;

  return {status,summary,confidence,completeness,landCount,averageCmc,creatureCount,nonCreatureCount,rampCount,drawCount,removalCount,boardWipeCount,protectionCount,graveyardHateCount,finisherCount,colorSources,colorDemand,planSignals,tribe,strengths,concerns,recommendations,issues};
}
