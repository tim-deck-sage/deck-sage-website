// app/app/utils/commander/deckUpgradeAdvisor.ts

import { DeckAnalysisResult } from './deckAnalysisCore';
import { CommanderBracket } from '../../types/commanderBracket';
import {
  DeckForUpgrade,
  UpgradeGoal,
  UpgradePlayStyle,
  UpgradeRecommendation as StrongUpgradeRecommendation,
} from '../../types/deckUpgrade';
import {
  getDeckUpgradeRecommendations,
} from '../services/deckUpgradeEngine';

export interface UpgradeRecommendation {
  cardName: string;
  category: string;
  reason: string;
  synergy: string;
  suggestedCut?: string;
  cutReason?: string;
  bracketImpact: 'neutral' | 'up';
  estimatedBracket?: CommanderBracket;
  candidateScore?: number;
  scoringNotes?: string[];
}

export interface DeckUpgradeResult {
  recommendations: UpgradeRecommendation[];
}

export type ColorIdentity = 'W' | 'U' | 'B' | 'R' | 'G';

export interface GenerateUpgradeOptions {
  commanderColorIdentity?: ColorIdentity[];
  deckCardNames?: string[];
  commanderName?: string;
  deck?: DeckForUpgrade;
  playStyle?: UpgradePlayStyle;
  goal?: UpgradeGoal;
  recommendationLimit?: number;
}

interface ScryfallCard {
  name: string;
  color_identity?: string[];
  oracle_text?: string;
  type_line?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
  };
  card_faces?: {
    oracle_text?: string;
    type_line?: string;
    image_uris?: {
      small?: string;
      normal?: string;
      large?: string;
    };
  }[];
  legalities?: {
    commander?: string;
  };
}

interface ScryfallSearchResponse {
  data?: ScryfallCard[];
}

interface CandidateCard {
  name: string;
  colorIdentity: ColorIdentity[];
  oracleText: string;
  typeLine: string;
  tags: string[];
  score: number;
}

type StrategicTheme =
  | 'tokens'
  | 'sacrifice'
  | 'damage'
  | 'commander'
  | 'goWidePayoff'
  | 'combo'
  | 'needsDraw'
  | 'needsRamp'
  | 'needsRemoval'
  | 'needsProtection'
  | 'needsFinisher'
  | 'tribalGoblin'
  | 'tribalElf'
  | 'tribalZombie'
  | 'tribalDragon'
  | 'artifact'
  | 'aristocrats'
  | 'etb'
  | 'deathTriggers'
  | 'counters'
  | 'proliferate'
  | 'spellslinger'
  | 'reanimator'
  | 'lifegain'
  | 'stax'
  | 'extraCombat'
  | 'untap'
  | 'treasure'
  | 'copy'
  | 'activation'
  | 'cheatIntoPlay';

interface StrategyProfile {
  themes: StrategicTheme[];
  weights: Partial<Record<StrategicTheme, number>>;
  commanderTags: string[];
  searchTerms: string[];
}

interface CandidateSignals {
  createsTokens: boolean;
  tokenPayoff: boolean;
  sacrificeOutlet: boolean;
  deathTrigger: boolean;
  damagePayoff: boolean;
  drawEngine: boolean;
  rampPiece: boolean;
  removalPiece: boolean;
  protectionPiece: boolean;
  finisherPiece: boolean;
  comboPiece: boolean;
  untapPiece: boolean;
  extraCombatPiece: boolean;
  activationSupport: boolean;
  counterSupport: boolean;
  proliferateSupport: boolean;
  etbSupport: boolean;
  reanimatorPiece: boolean;
  lifegainPiece: boolean;
  staxPiece: boolean;
  treasurePiece: boolean;
  copyPiece: boolean;
  hastePiece: boolean;
  cheatIntoPlayPiece: boolean;
  goblin: boolean;
  elf: boolean;
  zombie: boolean;
  dragon: boolean;
  artifact: boolean;
  creature: boolean;
  enchantment: boolean;
  instantOrSorcery: boolean;
  legendary: boolean;
  lowManaEngine: boolean;
  broadGoodstuff: boolean;
}

function normalizeCardName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function normalizeColorIdentity(colors: unknown): ColorIdentity[] {
  if (!Array.isArray(colors)) return [];
  return colors
    .map((color) => String(color).toUpperCase())
    .filter(
      (color): color is ColorIdentity => ['W', 'U', 'B', 'R', 'G'].includes(color),
    );
}

function getCardOracleText(card: ScryfallCard): string {
  if (card.oracle_text) return card.oracle_text;

  if (Array.isArray(card.card_faces)) {
    return card.card_faces
      .map((face) => face?.oracle_text || '')
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

function getCardTypeLine(card: ScryfallCard): string {
  if (card.type_line) return card.type_line;

  if (Array.isArray(card.card_faces)) {
    return card.card_faces
      .map((face) => face?.type_line || '')
      .filter(Boolean)
      .join(' // ');
  }

  return '';
}

function isCardInColorIdentity(
  cardColorIdentity: ColorIdentity[],
  commanderColorIdentity: ColorIdentity[],
): boolean {
  if (!cardColorIdentity.length) return true;
  if (!commanderColorIdentity.length) return true;

  return cardColorIdentity.every((color) =>
    commanderColorIdentity.includes(color),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function countTrue(values: boolean[]): number {
  return values.filter(Boolean).length;
}

function detectThemes(analysis: DeckAnalysisResult): StrategicTheme[] {
  const themes = new Set<StrategicTheme>();
  const inferred = analysis.inferred;

  if (inferred.tokenMakerCount >= 2) themes.add('tokens');
  if (inferred.sacOutletCount >= 1) themes.add('sacrifice');
  if (inferred.damageOutletCount >= 1) themes.add('damage');
  if (inferred.commanderEngineCount >= 1) themes.add('commander');
  if (inferred.tokenMakerCount >= 1 && inferred.damageOutletCount >= 1) {
    themes.add('goWidePayoff');
  }
  if (inferred.comboPieceCount >= 4) themes.add('combo');
  if (inferred.drawCount < 6) themes.add('needsDraw');
  if (inferred.fastManaCount < 4) themes.add('needsRamp');
  if (inferred.removalCount < 6) themes.add('needsRemoval');
  if (inferred.protectionCount < 3) themes.add('needsProtection');
  if (inferred.finisherCount < 2) themes.add('needsFinisher');

  if (inferred.tokenMakerCount >= 2 && inferred.sacOutletCount >= 1) {
    themes.add('aristocrats');
  }

  if (inferred.tokenMakerCount >= 2) {
    themes.add('etb');
  }

  if (inferred.sacOutletCount >= 1 || inferred.damageOutletCount >= 1) {
    themes.add('deathTriggers');
  }

  if (inferred.fastManaCount < 3) {
    themes.add('treasure');
  }

  if (inferred.commanderEngineCount >= 1) {
    themes.add('activation');
  }

  if (inferred.comboPieceCount >= 3) {
    themes.add('untap');
  }

  return Array.from(themes);
}

function buildStrategyProfile(
  analysis: DeckAnalysisResult,
  commanderNameRaw?: string,
): StrategyProfile {
  const commanderName = normalizeText(commanderNameRaw || '');
  const themes = new Set<StrategicTheme>(detectThemes(analysis));
  const weights: Partial<Record<StrategicTheme, number>> = {};
  const commanderTags = new Set<string>();
  const searchTerms = new Set<string>();

  const addTheme = (theme: StrategicTheme, weight: number) => {
    themes.add(theme);
    weights[theme] = Math.max(weights[theme] ?? 0, weight);
  };

  for (const theme of themes) {
    weights[theme] = Math.max(weights[theme] ?? 0, 2);
  }

  if (analysis.inferred.tokenMakerCount >= 3) addTheme('tokens', 4);
  if (analysis.inferred.sacOutletCount >= 2) addTheme('sacrifice', 4);
  if (analysis.inferred.damageOutletCount >= 2) addTheme('damage', 4);
  if (analysis.inferred.comboPieceCount >= 4) addTheme('combo', 4);
  if (analysis.inferred.commanderEngineCount >= 1) addTheme('commander', 3);

  if (themes.has('tokens') && themes.has('sacrifice')) addTheme('aristocrats', 5);
  if (themes.has('tokens') && themes.has('damage')) addTheme('goWidePayoff', 5);
  if (themes.has('combo')) addTheme('untap', 3);
  if (themes.has('commander')) addTheme('activation', 3);

  if (commanderName.includes('krenko')) {
    addTheme('tokens', 8);
    addTheme('tribalGoblin', 9);
    addTheme('goWidePayoff', 8);
    addTheme('damage', 7);
    addTheme('untap', 8);
    addTheme('activation', 9);
    addTheme('haste' as StrategicTheme, 7);
    addTheme('needsProtection', Math.max(weights.needsProtection ?? 0, 6));
    commanderTags.add('goblin');
    commanderTags.add('activated-commander');
    searchTerms.add('goblin');
    searchTerms.add('activate');
    searchTerms.add('untap');
    searchTerms.add('haste');
  }

  if (commanderName.includes('atraxa')) {
    addTheme('counters', 9);
    addTheme('proliferate', 10);
    addTheme('etb', 4);
    commanderTags.add('counters');
    commanderTags.add('proliferate');
    searchTerms.add('proliferate');
    searchTerms.add('+1/+1 counter');
    searchTerms.add('loyalty counter');
  }

  if (commanderName.includes('muldrotha')) {
    addTheme('reanimator', 9);
    addTheme('etb', 5);
    addTheme('artifact', 4);
    commanderTags.add('graveyard');
    commanderTags.add('permanent-recursion');
    searchTerms.add('from your graveyard');
    searchTerms.add('self-mill');
    searchTerms.add('sacrifice');
  }

  if (commanderName.includes('korvold')) {
    addTheme('sacrifice', 9);
    addTheme('treasure', 8);
    addTheme('aristocrats', 7);
    addTheme('needsDraw', 4);
    commanderTags.add('sacrifice');
    commanderTags.add('treasure');
    searchTerms.add('sacrifice');
    searchTerms.add('treasure');
    searchTerms.add('dies');
  }

  if (commanderName.includes('edgar markov')) {
    addTheme('tokens', 7);
    addTheme('goWidePayoff', 7);
    commanderTags.add('vampire');
    searchTerms.add('vampire');
    searchTerms.add('token');
  }

  if (commanderName.includes('miirym')) {
    addTheme('tribalDragon', 10);
    addTheme('copy', 8);
    addTheme('cheatIntoPlay', 5);
    commanderTags.add('dragon');
    searchTerms.add('dragon');
    searchTerms.add('copy');
  }

  if (commanderName.includes('kaalia')) {
    addTheme('cheatIntoPlay', 10);
    addTheme('tribalDragon', 5);
    commanderTags.add('angel');
    commanderTags.add('demon');
    commanderTags.add('dragon');
    searchTerms.add('angel');
    searchTerms.add('demon');
    searchTerms.add('dragon');
    searchTerms.add('put onto the battlefield tapped and attacking');
  }

  return {
    themes: Array.from(themes),
    weights,
    commanderTags: Array.from(commanderTags),
    searchTerms: Array.from(searchTerms),
  };
}

function colorIdentityQuery(colors: ColorIdentity[]): string {
  if (!colors.length) return '';
  return `id<=${colors.join('')}`;
}

function buildSearchQueries(
  analysis: DeckAnalysisResult,
  options: GenerateUpgradeOptions,
  profile: StrategyProfile,
): string[] {
  const themes = profile.themes;
  const colors = options.commanderColorIdentity ?? [];
  const colorQuery = colorIdentityQuery(colors);

  const base = [
    'game:paper',
    'legal:commander',
    '-type:land',
    '-is:digital',
    colorQuery,
  ]
    .filter(Boolean)
    .join(' ');

  const queries: string[] = [];

  const addQuery = (q: string) => {
    if (q.trim()) queries.push(q.trim());
  };

  if (themes.includes('tokens')) {
    addQuery(`${base} (o:"create" o:"token")`);
  }

  if (themes.includes('sacrifice') || themes.includes('aristocrats')) {
    addQuery(`${base} (o:"sacrifice" OR o:"dies" OR o:"whenever another creature dies")`);
  }

  if (themes.includes('damage')) {
    addQuery(`${base} (o:"deals damage" OR o:"each opponent" OR o:"loses life")`);
  }

  if (themes.includes('goWidePayoff')) {
    addQuery(`${base} (o:"creatures you control" OR o:"whenever a creature enters" OR o:"attacking creatures")`);
  }

  if (themes.includes('combo') || themes.includes('untap')) {
    addQuery(`${base} (o:"untap" OR o:"copy target activated ability" OR o:"activate only" OR o:"repeat this process")`);
  }

  if (themes.includes('needsDraw')) {
    addQuery(`${base} (o:"draw a card" OR o:"whenever a creature enters" OR o:"whenever you sacrifice")`);
  }

  if (themes.includes('needsRamp') || themes.includes('treasure')) {
    addQuery(`${base} (o:"add {" OR o:"treasure token" OR o:"reduce the cost")`);
  }

  if (themes.includes('needsRemoval')) {
    addQuery(`${base} (o:"destroy target" OR o:"exile target" OR o:"deals damage to any target")`);
  }

  if (themes.includes('needsProtection') || themes.includes('activation')) {
    addQuery(`${base} (o:"hexproof" OR o:"indestructible" OR o:"haste" OR o:"untap target creature" OR o:"shroud")`);
  }

  if (themes.includes('needsFinisher')) {
    addQuery(`${base} (o:"each opponent" OR o:"double damage" OR o:"combat damage" OR o:"creatures you control get +")`);
  }

  if (themes.includes('tribalGoblin')) {
    addQuery(`${base} t:goblin (o:"goblin" OR o:"creature tokens" OR o:"haste" OR o:"sacrifice")`);
  }

  if (themes.includes('proliferate') || themes.includes('counters')) {
    addQuery(`${base} (o:"proliferate" OR o:"+1/+1 counter" OR o:"counter on")`);
  }

  if (themes.includes('reanimator')) {
    addQuery(`${base} (o:"from your graveyard" OR o:"return target" OR o:"mill")`);
  }

  if (themes.includes('artifact')) {
    addQuery(`${base} (t:artifact OR o:"artifact")`);
  }

  for (const term of profile.searchTerms.slice(0, 4)) {
    addQuery(`${base} ${term} sort:edhrec`);
  }

  addQuery(`${base} sort:edhrec`);

  return Array.from(new Set(queries)).slice(0, 8);
}

async function searchScryfall(query: string): Promise<ScryfallCard[]> {
  try {
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=edhrec`;
    const res = await fetch(url);

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as ScryfallSearchResponse;
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

function getCandidateSignals(card: ScryfallCard): CandidateSignals {
  const oracle = normalizeText(getCardOracleText(card));
  const typeLine = normalizeText(getCardTypeLine(card));

  const createsTokens =
    oracle.includes('create') && oracle.includes('token');

  const tokenPayoff = hasAny(oracle, [
    'whenever a creature enters',
    'whenever one or more creatures',
    'creatures you control get +',
    'attacking creatures',
    'for each creature you control',
  ]);

  const sacrificeOutlet = hasAny(oracle, [
    'sacrifice another',
    'sacrifice a creature',
    'sacrifice an artifact',
    'sacrifice a token',
    'sacrifice a permanent',
  ]);

  const deathTrigger = hasAny(oracle, [
    'dies',
    'whenever another creature dies',
    'whenever a creature dies',
    'whenever an artifact is put into a graveyard',
  ]);

  const damagePayoff = hasAny(oracle, [
    'deals damage',
    'each opponent',
    'loses life',
    'whenever a creature enters',
  ]);

  const drawEngine = hasAny(oracle, [
    'draw a card',
    'draw cards',
    'whenever you draw',
    'whenever a creature enters',
    'whenever you sacrifice',
    'whenever one or more creatures you control deal combat damage',
  ]);

  const rampPiece = hasAny(oracle, [
    'add {',
    'add one mana',
    'add two mana',
    'treasure token',
    'search your library for a basic land',
    'search your library for a land',
    'cost {1} less',
  ]);

  const removalPiece = hasAny(oracle, [
    'destroy target',
    'exile target',
    'deals damage to any target',
    'fight target',
    'target creature gets -',
  ]);

  const protectionPiece = hasAny(oracle, [
    'indestructible',
    'hexproof',
    'shroud',
    'ward',
    'phases out',
    'protection from',
    'cannot be countered',
  ]);

  const finisherPiece = hasAny(oracle, [
    'double damage',
    'combat damage',
    'each opponent',
    'creatures you control get +',
    'extra combat',
  ]);

  const comboPiece = hasAny(oracle, [
    'untap',
    'copy target activated ability',
    'repeat this process',
    'whenever another creature dies',
    'whenever a creature enters',
    'activate only',
  ]);

  const untapPiece = hasAny(oracle, [
    'untap target creature',
    'untap another target creature',
    'untap all creatures',
    'untap this creature',
  ]);

  const extraCombatPiece = hasAny(oracle, [
    'additional combat phase',
    'extra combat phase',
    'after this phase, there is an additional combat phase',
  ]);

  const activationSupport = hasAny(oracle, [
    'activated abilities',
    'activate abilities',
    'copy target activated ability',
    'activate only',
    'untap target creature',
  ]);

  const counterSupport = hasAny(oracle, [
    '+1/+1 counter',
    'put a counter on',
    'remove a counter from',
    'loyalty counter',
  ]);

  const proliferateSupport = hasAny(oracle, ['proliferate']);

  const etbSupport = hasAny(oracle, [
    'enters the battlefield',
    'whenever a creature enters',
    'when another creature enters',
  ]);

  const reanimatorPiece = hasAny(oracle, [
    'from your graveyard',
    'return target creature card from your graveyard',
    'return target permanent card from your graveyard',
    'mill',
    'discard a card',
  ]);

  const lifegainPiece = hasAny(oracle, [
    'you gain life',
    'whenever you gain life',
    'lifelink',
  ]);

  const staxPiece = hasAny(oracle, [
    'your opponents can’t',
    'your opponents cant',
    'spells your opponents cast cost',
    'creatures your opponents control enter tapped',
    'can’t untap',
    'cant untap',
  ]);

  const treasurePiece = hasAny(oracle, [
    'treasure token',
    'create a treasure token',
  ]);

  const copyPiece = hasAny(oracle, [
    'copy',
    'token that’s a copy',
    'token thats a copy',
  ]);

  const hastePiece = hasAny(oracle, ['haste']);

  const cheatIntoPlayPiece = hasAny(oracle, [
    'put onto the battlefield',
    'put that card onto the battlefield',
    'without paying its mana cost',
    'tapped and attacking',
  ]);

  const goblin = typeLine.includes('goblin');
  const elf = typeLine.includes('elf');
  const zombie = typeLine.includes('zombie');
  const dragon = typeLine.includes('dragon');
  const artifact = typeLine.includes('artifact');
  const creature = typeLine.includes('creature');
  const enchantment = typeLine.includes('enchantment');
  const instantOrSorcery =
    typeLine.includes('instant') || typeLine.includes('sorcery');
  const legendary = typeLine.includes('legendary');

  const lowManaEngine =
    oracle.includes('{1}') ||
    oracle.includes('{t}') ||
    oracle.includes('whenever') ||
    oracle.includes('at the beginning of combat');

  const broadGoodstuff =
    countTrue([
      drawEngine,
      rampPiece,
      removalPiece,
      protectionPiece,
      finisherPiece,
    ]) >= 2 &&
    !createsTokens &&
    !sacrificeOutlet &&
    !deathTrigger &&
    !counterSupport &&
    !proliferateSupport &&
    !reanimatorPiece &&
    !goblin &&
    !dragon &&
    !elf &&
    !zombie;

  return {
    createsTokens,
    tokenPayoff,
    sacrificeOutlet,
    deathTrigger,
    damagePayoff,
    drawEngine,
    rampPiece,
    removalPiece,
    protectionPiece,
    finisherPiece,
    comboPiece,
    untapPiece,
    extraCombatPiece,
    activationSupport,
    counterSupport,
    proliferateSupport,
    etbSupport,
    reanimatorPiece,
    lifegainPiece,
    staxPiece,
    treasurePiece,
    copyPiece,
    hastePiece,
    cheatIntoPlayPiece,
    goblin,
    elf,
    zombie,
    dragon,
    artifact,
    creature,
    enchantment,
    instantOrSorcery,
    legendary,
    lowManaEngine,
    broadGoodstuff,
  };
}

function inferCardTags(card: ScryfallCard): string[] {
  const signals = getCandidateSignals(card);
  const tags = new Set<string>();

  if (signals.createsTokens) tags.add('tokens');
  if (signals.sacrificeOutlet) tags.add('sacrifice');
  if (signals.damagePayoff) tags.add('damage');
  if (signals.drawEngine) tags.add('draw');
  if (signals.rampPiece) tags.add('ramp');
  if (signals.removalPiece) tags.add('removal');
  if (signals.protectionPiece) tags.add('protection');
  if (signals.comboPiece) tags.add('combo');
  if (signals.tokenPayoff) tags.add('goWidePayoff');
  if (signals.finisherPiece) tags.add('finisher');
  if (signals.deathTrigger) tags.add('deathTriggers');
  if (signals.counterSupport) tags.add('counters');
  if (signals.proliferateSupport) tags.add('proliferate');
  if (signals.etbSupport) tags.add('etb');
  if (signals.reanimatorPiece) tags.add('reanimator');
  if (signals.lifegainPiece) tags.add('lifegain');
  if (signals.staxPiece) tags.add('stax');
  if (signals.untapPiece) tags.add('untap');
  if (signals.extraCombatPiece) tags.add('extraCombat');
  if (signals.activationSupport) tags.add('activation');
  if (signals.treasurePiece) tags.add('treasure');
  if (signals.copyPiece) tags.add('copy');
  if (signals.cheatIntoPlayPiece) tags.add('cheatIntoPlay');

  if (signals.goblin) tags.add('goblin');
  if (signals.elf) tags.add('elf');
  if (signals.zombie) tags.add('zombie');
  if (signals.dragon) tags.add('dragon');
  if (signals.artifact) tags.add('artifact');

  return Array.from(tags);
}

function getThemeWeight(
  profile: StrategyProfile,
  theme: StrategicTheme,
  fallback = 0,
): number {
  return profile.weights[theme] ?? fallback;
}

function scoreCandidate(
  card: CandidateCard,
  analysis: DeckAnalysisResult,
  profile: StrategyProfile,
): number {
  let score = 0;
  const tags = new Set(card.tags);
  const oracle = normalizeText(card.oracleText);
  const typeLine = normalizeText(card.typeLine);
  const signals = getCandidateSignals({
    name: card.name,
    color_identity: card.colorIdentity,
    oracle_text: card.oracleText,
    type_line: card.typeLine,
  });

  const add = (value: number) => {
    score += value;
  };

  for (const theme of profile.themes) {
    if (tags.has(theme)) {
      add(2 + getThemeWeight(profile, theme, 1));
    }
  }

  if (signals.createsTokens) add(getThemeWeight(profile, 'tokens', 0));
  if (signals.tokenPayoff) add(getThemeWeight(profile, 'goWidePayoff', 0));
  if (signals.sacrificeOutlet) add(getThemeWeight(profile, 'sacrifice', 0));
  if (signals.deathTrigger) add(getThemeWeight(profile, 'deathTriggers', 0));
  if (signals.damagePayoff) add(getThemeWeight(profile, 'damage', 0));
  if (signals.drawEngine && profile.themes.includes('needsDraw')) add(7);
  if (signals.rampPiece && profile.themes.includes('needsRamp')) add(7);
  if (signals.removalPiece && profile.themes.includes('needsRemoval')) add(7);
  if (signals.protectionPiece && profile.themes.includes('needsProtection')) add(8);
  if (signals.finisherPiece && profile.themes.includes('needsFinisher')) add(7);
  if (signals.untapPiece) add(getThemeWeight(profile, 'untap', 0));
  if (signals.activationSupport) add(getThemeWeight(profile, 'activation', 0));
  if (signals.counterSupport) add(getThemeWeight(profile, 'counters', 0));
  if (signals.proliferateSupport) add(getThemeWeight(profile, 'proliferate', 0));
  if (signals.reanimatorPiece) add(getThemeWeight(profile, 'reanimator', 0));
  if (signals.treasurePiece) add(getThemeWeight(profile, 'treasure', 0));
  if (signals.copyPiece) add(getThemeWeight(profile, 'copy', 0));
  if (signals.cheatIntoPlayPiece) add(getThemeWeight(profile, 'cheatIntoPlay', 0));

  if (profile.themes.includes('tribalGoblin') && signals.goblin) add(10);
  if (profile.themes.includes('tribalElf') && signals.elf) add(10);
  if (profile.themes.includes('tribalZombie') && signals.zombie) add(10);
  if (profile.themes.includes('tribalDragon') && signals.dragon) add(10);
  if (profile.themes.includes('artifact') && signals.artifact) add(6);

  if (profile.commanderTags.includes('activated-commander') && signals.untapPiece) add(8);
  if (profile.commanderTags.includes('activated-commander') && signals.hastePiece) add(8);
  if (profile.commanderTags.includes('activated-commander') && signals.activationSupport) add(7);

  if (profile.commanderTags.includes('goblin') && signals.goblin) add(8);
  if (profile.commanderTags.includes('proliferate') && signals.proliferateSupport) add(10);
  if (profile.commanderTags.includes('counters') && signals.counterSupport) add(8);
  if (profile.commanderTags.includes('graveyard') && signals.reanimatorPiece) add(8);
  if (profile.commanderTags.includes('treasure') && signals.treasurePiece) add(7);
  if (profile.commanderTags.includes('dragon') && signals.dragon) add(8);
  if (profile.commanderTags.includes('angel') && typeLine.includes('angel')) add(8);
  if (profile.commanderTags.includes('demon') && typeLine.includes('demon')) add(8);

  if (signals.createsTokens && signals.sacrificeOutlet) add(8);
  if (signals.createsTokens && signals.damagePayoff) add(7);
  if (signals.createsTokens && signals.drawEngine) add(5);
  if (signals.createsTokens && signals.protectionPiece) add(4);
  if (signals.sacrificeOutlet && signals.deathTrigger) add(8);
  if (signals.sacrificeOutlet && signals.drawEngine) add(5);
  if (signals.sacrificeOutlet && signals.treasurePiece) add(4);
  if (signals.damagePayoff && signals.tokenPayoff) add(6);
  if (signals.untapPiece && signals.activationSupport) add(7);
  if (signals.counterSupport && signals.proliferateSupport) add(8);
  if (signals.etbSupport && signals.copyPiece) add(4);
  if (signals.reanimatorPiece && signals.sacrificeOutlet) add(4);
  if (signals.cheatIntoPlayPiece && (signals.dragon || typeLine.includes('angel') || typeLine.includes('demon'))) {
    add(8);
  }

  if (
    analysis.inferred.tokenMakerCount >= 2 &&
    (signals.createsTokens || signals.tokenPayoff || signals.damagePayoff)
  ) {
    add(4);
  }

  if (
    analysis.inferred.sacOutletCount >= 1 &&
    (signals.sacrificeOutlet || signals.deathTrigger || signals.drawEngine)
  ) {
    add(4);
  }

  if (
    analysis.inferred.damageOutletCount >= 1 &&
    (signals.damagePayoff || signals.finisherPiece)
  ) {
    add(4);
  }

  if (
    analysis.inferred.commanderEngineCount >= 1 &&
    (signals.activationSupport || signals.untapPiece || signals.protectionPiece)
  ) {
    add(4);
  }

  if (analysis.inferred.comboPieceCount >= 4 && (signals.comboPiece || signals.untapPiece)) {
    add(5);
  }

  if (signals.lowManaEngine) add(2);
  if (signals.legendary && !profile.commanderTags.length) add(1);
  if (card.colorIdentity.length === 0) add(1);

  if (signals.broadGoodstuff) add(-7);

  if (
    !signals.createsTokens &&
    !signals.tokenPayoff &&
    !signals.sacrificeOutlet &&
    !signals.deathTrigger &&
    !signals.damagePayoff &&
    !signals.untapPiece &&
    !signals.activationSupport &&
    !signals.counterSupport &&
    !signals.proliferateSupport &&
    !signals.reanimatorPiece &&
    !signals.treasurePiece &&
    !signals.copyPiece &&
    !signals.cheatIntoPlayPiece &&
    !signals.goblin &&
    !signals.dragon &&
    !signals.elf &&
    !signals.zombie
  ) {
    add(-5);
  }

  if (
    profile.themes.includes('tribalGoblin') &&
    signals.creature &&
    !signals.goblin &&
    !signals.artifact &&
    !signals.untapPiece &&
    !signals.protectionPiece &&
    !signals.finisherPiece
  ) {
    add(-6);
  }

  if (
    profile.themes.includes('proliferate') &&
    !signals.counterSupport &&
    !signals.proliferateSupport &&
    !signals.drawEngine &&
    !signals.removalPiece
  ) {
    add(-4);
  }

  if (
    profile.themes.includes('reanimator') &&
    !signals.reanimatorPiece &&
    !signals.sacrificeOutlet &&
    !signals.drawEngine
  ) {
    add(-4);
  }

  if (oracle.includes('planeswalker') && !profile.themes.includes('proliferate')) {
    add(-2);
  }

  return clamp(score, -50, 1000);
}

function buildReason(
  card: CandidateCard,
  analysis: DeckAnalysisResult,
  profile: StrategyProfile,
): string {
  const signals = getCandidateSignals({
    name: card.name,
    color_identity: card.colorIdentity,
    oracle_text: card.oracleText,
    type_line: card.typeLine,
  });

  if (profile.themes.includes('tribalGoblin') && signals.goblin && signals.untapPiece) {
    return 'High-impact Goblin engine piece that also improves commander activation lines.';
  }

  if (profile.themes.includes('tribalGoblin') && signals.goblin && signals.tokenPayoff) {
    return 'Directly upgrades your Goblin swarm plan and turns wide boards into real pressure.';
  }

  if (signals.createsTokens && signals.damagePayoff) {
    return 'Creates bodies and converts those bodies into immediate pressure, which is exactly the kind of layered synergy this deck wants.';
  }

  if (signals.sacrificeOutlet && signals.deathTrigger) {
    return 'Combines sacrifice utility with payoff value, helping your engine become more self-contained.';
  }

  if (signals.untapPiece && signals.activationSupport) {
    return 'Improves explosive turns by increasing how often your core engines can be activated.';
  }

  if (signals.proliferateSupport && profile.themes.includes('proliferate')) {
    return 'Direct proliferate support that scales with the rest of your counter-based shell.';
  }

  if (signals.reanimatorPiece && profile.themes.includes('reanimator')) {
    return 'Adds real graveyard velocity instead of just being generically strong.';
  }

  if (signals.drawEngine && profile.themes.includes('needsDraw')) {
    return 'Fills one of the deck’s current weak spots by improving sustained card flow.';
  }

  if (signals.rampPiece && profile.themes.includes('needsRamp')) {
    return 'Helps the deck deploy its core plan earlier and more consistently.';
  }

  if (signals.protectionPiece && profile.themes.includes('needsProtection')) {
    return 'Protects your key engine turns, which matters more than adding another generic threat.';
  }

  if (signals.finisherPiece && profile.themes.includes('needsFinisher')) {
    return 'Gives the deck a cleaner way to convert a strong board state into an actual win.';
  }

  return 'Fits the deck because it connects to multiple parts of your game plan instead of only being generically playable.';
}

function buildSynergy(
  card: CandidateCard,
  analysis: DeckAnalysisResult,
  profile: StrategyProfile,
): string {
  const signals = getCandidateSignals({
    name: card.name,
    color_identity: card.colorIdentity,
    oracle_text: card.oracleText,
    type_line: card.typeLine,
  });

  const matches: string[] = [];

  if (signals.createsTokens) matches.push('token production');
  if (signals.tokenPayoff) matches.push('go-wide payoff');
  if (signals.sacrificeOutlet) matches.push('sac outlets');
  if (signals.deathTrigger) matches.push('death triggers');
  if (signals.damagePayoff) matches.push('damage conversion');
  if (signals.drawEngine) matches.push('card flow');
  if (signals.rampPiece) matches.push('ramp');
  if (signals.protectionPiece) matches.push('protection');
  if (signals.untapPiece) matches.push('untap lines');
  if (signals.activationSupport) matches.push('activation support');
  if (signals.proliferateSupport) matches.push('proliferate');
  if (signals.counterSupport) matches.push('counter scaling');
  if (signals.reanimatorPiece) matches.push('graveyard recursion');
  if (signals.treasurePiece) matches.push('treasure synergies');
  if (signals.copyPiece) matches.push('copy effects');

  if (profile.themes.includes('tribalGoblin') && signals.goblin) {
    matches.unshift('Goblin tribal');
  }

  if (matches.length > 0) {
    return `Best fit areas: ${matches.slice(0, 4).join(', ')}.`;
  }

  if (analysis.inferred.commanderEngineCount >= 1) {
    return 'Supports the commander-centric structure of the deck.';
  }

  return 'Improves structural cohesion more than a typical goodstuff inclusion.';
}

function mapCategory(card: CandidateCard): string {
  const signals = getCandidateSignals({
    name: card.name,
    color_identity: card.colorIdentity,
    oracle_text: card.oracleText,
    type_line: card.typeLine,
  });

  if (signals.goblin) return 'Tribal';
  if (signals.proliferateSupport) return 'Proliferate';
  if (signals.counterSupport) return 'Counters';
  if (signals.reanimatorPiece) return 'Recursion';
  if (signals.createsTokens) return 'Tokens';
  if (signals.sacrificeOutlet) return 'Sacrifice';
  if (signals.damagePayoff) return 'Damage';
  if (signals.drawEngine) return 'Draw';
  if (signals.rampPiece) return 'Ramp';
  if (signals.removalPiece) return 'Removal';
  if (signals.protectionPiece) return 'Protection';
  if (signals.finisherPiece) return 'Finisher';
  if (signals.untapPiece || signals.activationSupport) return 'Engine';
  if (signals.copyPiece) return 'Synergy';
  return 'Utility';
}

function mapStrongRecommendation(
  recommendation: StrongUpgradeRecommendation,
): UpgradeRecommendation | null {
  if (
    !recommendation.cardName ||
    recommendation.cardName === 'Add more lands' ||
    recommendation.cardName.startsWith('Consider adding')
  ) {
    return null;
  }

  return {
    cardName: recommendation.cardName,
    category: recommendation.category,
    reason: recommendation.reason,
    synergy:
      recommendation.synergy ??
      (recommendation.suggestedCut &&
      recommendation.suggestedCut !== 'No specific cut found'
        ? `Suggested cut: ${recommendation.suggestedCut}. ${recommendation.suggestedCutReason || ''}`.trim()
        : recommendation.explanation?.triggeredBy?.length
          ? `Prioritized because it addresses: ${recommendation.explanation.triggeredBy
              .slice(0, 3)
              .join(', ')}.`
          : 'Prioritized by commander fit, deck plan gaps, and local candidate scoring.'),
    suggestedCut: recommendation.suggestedCut,
    cutReason: recommendation.suggestedCutReason,
    bracketImpact: 'neutral',
    candidateScore: recommendation.candidateScore ?? recommendation.score,
    scoringNotes: recommendation.scoringNotes,
  };
}

function buildFallbackDeck(
  analysis: DeckAnalysisResult,
  options: GenerateUpgradeOptions,
): DeckForUpgrade {
  return {
    name: options.commanderName
      ? `${options.commanderName} Deck`
      : 'Commander Deck',
    commander: options.commanderName,
    cards: analysis.rawCards.map((card) => ({
      name: card.name,
      oracleText: card.oracleText,
    })),
    basicLands: {
      Plains: 0,
      Island: 0,
      Swamp: 0,
      Mountain: 0,
      Forest: 0,
      Wastes: 0,
    },
  };
}

async function generateLegacyUpgradeRecommendations(
  analysis: DeckAnalysisResult,
  options: GenerateUpgradeOptions = {},
): Promise<DeckUpgradeResult> {
  const recommendationLimit = Math.max(
    1,
    Math.min(20, Math.floor(options.recommendationLimit ?? 10)),
  );
  const commanderColorIdentity = options.commanderColorIdentity ?? [];
  const deckCardNames = new Set(
    (options.deckCardNames ?? []).map(normalizeCardName),
  );

  const profile = buildStrategyProfile(analysis, options.commanderName);
  const queries = buildSearchQueries(analysis, options, profile);

  const rawResults = await Promise.all(
    queries.map((query) => searchScryfall(query)),
  );

  const candidateMap = new Map<string, CandidateCard>();

  for (const resultSet of rawResults) {
    for (const card of resultSet) {
      const normalizedName = normalizeCardName(card.name);

      if (!card.name) continue;
      if (deckCardNames.has(normalizedName)) continue;

      const colorIdentity = normalizeColorIdentity(card.color_identity);

      if (!isCardInColorIdentity(colorIdentity, commanderColorIdentity)) {
        continue;
      }

      const oracleText = getCardOracleText(card);
      const typeLine = getCardTypeLine(card);
      const tags = inferCardTags(card);

      const candidate: CandidateCard = {
        name: card.name,
        colorIdentity,
        oracleText,
        typeLine,
        tags,
        score: 0,
      };

      candidate.score = scoreCandidate(candidate, analysis, profile);

      const existing = candidateMap.get(normalizedName);
      if (!existing || candidate.score > existing.score) {
        candidateMap.set(normalizedName, candidate);
      }
    }
  }

  const recommendations = Array.from(candidateMap.values())
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, recommendationLimit)
    .map<UpgradeRecommendation>((candidate) => ({
      cardName: candidate.name,
      category: mapCategory(candidate),
      reason: buildReason(candidate, analysis, profile),
      synergy: buildSynergy(candidate, analysis, profile),
      bracketImpact: 'neutral',
    }));

  return {
    recommendations,
  };
}

export async function generateUpgradeRecommendations(
  analysis: DeckAnalysisResult,
  options: GenerateUpgradeOptions = {},
): Promise<DeckUpgradeResult> {
  try {
    const strongResult = await getDeckUpgradeRecommendations(
      options.deck ?? buildFallbackDeck(analysis, options),
      {
        playStyle: options.playStyle ?? 'balanced',
        goal: options.goal ?? 'stronger',
        recommendationLimit: options.recommendationLimit,
      },
    );

    const recommendations = strongResult.recommendations
      .map(mapStrongRecommendation)
      .filter(
        (recommendation): recommendation is UpgradeRecommendation =>
          recommendation !== null,
      )
      .slice(0, Math.max(1, Math.min(20, Math.floor(options.recommendationLimit ?? 10))));

    if (recommendations.length > 0) {
      return {
        recommendations,
      };
    }
  } catch {
    // Keep the paid upgrade flow resilient if local provider data is unavailable.
  }

  return generateLegacyUpgradeRecommendations(analysis, options);
}
