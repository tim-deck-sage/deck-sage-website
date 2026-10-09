import {
  isBasicLandCard,
  isBoardWipe,
  isCardDraw,
  isHasteEnabler,
  isProtection,
  isRamp,
  isSacOutlet,
  isSingleTargetRemoval,
  isTokenMaker,
  isTokenPayoff,
  isUtilityLand,
} from '../analysis/cardRoleClassifier';
import type { DeckCard } from '../../types/deckUpgrade';
import type { CandidateCardFeatures, NormalizedCandidateCard } from './types';

const STRUCTURAL_FALLBACKS: Record<string, { evidence: 'structural_fallback_sol_ring' }> = {
  'name:sol ring': { evidence: 'structural_fallback_sol_ring' },
};

const BASIC_LAND_CANONICAL_NAMES = new Set([
  'plains',
  'island',
  'swamp',
  'mountain',
  'forest',
  'wastes',
  'snow-covered plains',
  'snow-covered island',
  'snow-covered swamp',
  'snow-covered mountain',
  'snow-covered forest',
]);

function deckCard(card: NormalizedCandidateCard): DeckCard {
  return {
    name: card.name,
    manaCost: card.manaCost,
    cmc: card.cmc,
    typeLine: card.typeLine,
    oracleText: card.oracleText,
    power: card.power,
    toughness: card.toughness,
    imageUrl: card.imageUrl,
    scryfallId: card.scryfallId,
    oracleId: card.oracleId,
    colorIdentity: card.colorIdentity as DeckCard['colorIdentity'],
    quantity: card.quantity,
  };
}

function extractCreatureTypes(typeLine = ''): string[] {
  if (!typeLine.toLowerCase().includes('creature')) return [];
  return Array.from(new Set(typeLine.split(/[—-]/).slice(1).join(' ').toLowerCase().split(/\s+/).filter(Boolean))).sort();
}

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function extractTribalLordTypes(text: string): string[] {
  const types = new Set<string>();
  const pattern = /(?:other\s+)?([a-z][a-z'-]*) creatures you control (?:get|have)/g;
  let match = pattern.exec(text);
  while (match) {
    types.add(match[1]);
    match = pattern.exec(text);
  }
  return Array.from(types).sort();
}

function isManaSinkText(text: string): boolean {
  if (text.includes('{x}')) return true;
  if (/pay (?:x|any amount of) mana/.test(text)) return true;
  if (/for each mana (?:spent|paid)/.test(text)) return true;
  const activatedAbility = /(?:\{(?:[1-9]\d*|[wubrgc])\}[, ]*)+(?:\{t\}[, ]*)?:/;
  if (!activatedAbility.test(text)) return false;
  const activatedSegments = text.split('.').filter((segment) => activatedAbility.test(segment));
  return activatedSegments.some((segment) => !/:\s*add\b/.test(segment));
}

function auraFeatures(card: NormalizedCandidateCard, text: string): string[] {
  const type = (card.typeLine || '').toLowerCase();
  const features: string[] = [];
  const aura = /(?:^|\s|—|-)aura(?:\s|$)/.test(type);
  if (aura) features.push('aura');
  const creatureAura = aura && /\benchant (?:artifact or )?(?:target )?(?:commander|creature|artifact, creature|creature you control)\b/.test(text);
  if (creatureAura) features.push('creature_aura');
  const removalAura = aura && /enchanted [^.]*\b(?:can(?:not|’t|'t) attack|can(?:not|’t|'t) block|loses all other abilities|activated abilities can(?:not|’t|'t) be activated|base power and toughness 0\/1)\b|exile target [^.]*opponent controls/.test(text);
  if (removalAura) features.push('removal_aura');
  const beneficialAura = creatureAura && !removalAura && /enchanted creature [^.]*\b(?:gets? [+-]|has |gains? |hexproof|indestructible|protection|flying|first strike|double strike|vigilance|lifelink)\b/.test(text);
  if (beneficialAura) features.push('beneficial_aura');
  if (aura && /totem armor|return [^.]*aura[^.]*graveyard[^.]*battlefield|return [^.]*from your graveyard to the battlefield attached/.test(text)) features.push('aura_resilience');
  if (/whenever you cast (?:an? )?(?:aura|enchantment)|when [^.]*aura enters/.test(text)) features.push('aura_cast_value');
  if (/search your library for (?:an? )?(?:aura|enchantment)|search [^.]* for an aura/.test(text)) features.push('aura_tutor');
  if (/return [^.]*\b(?:aura|enchantment)[^.]*\bgraveyard[^.]*\bbattlefield|return [^.]*\b(?:aura|enchantment) cards? from [^.]*graveyard|return [^.]*\b(?:artifact and enchantment|aura and equipment) cards?[^.]*graveyard[^.]*battlefield/.test(text)) features.push('aura_recursion');
  if (/aura[s]? attached|for each (?:aura|enchantment)|enchanted creature gets \+[^.]*for each/.test(text)) features.push('voltron_scaling');
  if (/\bequipment\b|\bequip\b/.test(type + ' ' + text)) features.push('equipment_support');
  return features;
}

function blinkFeatures(card: NormalizedCandidateCard, text: string): string[] {
  const features: string[] = [];
  const friendlyBlink = /exile [^.]*\b(?:permanent|creature|artifact|enchantment|cards?)s? you control[^.]*(?:then |and )?return [^.]*to the battlefield|exile target [^.]*\b(?:permanent|creature|artifact)[^.]*you (?:own|control)[^.]*return [^.]*to the battlefield|exile [^.]*you control[^.]*return (?:it|them|those cards) to the battlefield/.test(text);
  const delayedBlink = /exile [^.]*you (?:own|control)[^.]*return [^.]*to the battlefield (?:at|under)[^.]*end step/.test(text);
  if ((friendlyBlink || delayedBlink) && !/phase[s]? out|return [^.]*to (?:its owner's|their owner's) hand/.test(text)) features.push('blink');
  const type = (card.typeLine || '').toLowerCase();
  const isPermanent = !/\binstant\b|\bsorcery\b/.test(type);
  const ownEtb = /\bwhen (?:this |~ |[a-z0-9,'’ -]+)enters(?: the battlefield)?\b/.test(text) || /\bwhen [^.]* enters(?: the battlefield)?\b/.test(text);
  if (isPermanent && ownEtb) features.push('etb_value', 'blink_target');
  if (/triggered ability [^.]*triggers? an additional time|copy target triggered ability|whenever [^.]*enters[^.]*additional time/.test(text)) features.push('trigger_enhancer');
  if (/at the beginning of [^.]*end step[^.]*exile [^.]*you control[^.]*return/.test(text)) features.push('repeatable_blink');
  return features;
}

function createsCreatureToken(text: string): boolean {
  return (
    /create(?:s)? (?:a|an|one|two|three|four|five|six|x|\d+) [^.]*creature token/.test(text) ||
    /create(?:s)? [^.]* token(?:s)? (?:that are|with) [^.]*creature/.test(text) ||
    (/\bamass\b/.test(text) && /\b(?:army|zombie) tokens?\b/.test(text))
  );
}

function opponentCreatesToken(text: string): boolean {
  return /(?:its controller|that player|an opponent|target opponent) creates? [^.]*tokens?/.test(text);
}

function isInstantOrSorcery(card: NormalizedCandidateCard): boolean {
  const typeLine = (card.typeLine || '').toLowerCase();
  return typeLine.includes('instant') || typeLine.includes('sorcery');
}

function hasCountermagic(text: string): boolean {
  return /counter target [^.]*spell/.test(text);
}

function hasSpellCostReduction(text: string): boolean {
  return /(?:instant and sorcery|instant or sorcery|noncreature) spells? you cast cost [^.]*less/.test(text);
}

function hasSpellCopy(text: string): boolean {
  const copyInstructions = text.replace(/cast or copy/g, 'cast or trigger from');
  return (
    /copy (?:target |the next )?(?:instant|sorcery|instant or sorcery) spell/.test(copyInstructions) ||
    /copy [^.]*instant or sorcery spell/.test(copyInstructions)
  );
}

function hasSpellReuse(text: string): boolean {
  return (
    /return target instant or sorcery card from [^.]*graveyard/.test(text) ||
    /choose an instant or sorcery card in your graveyard[^.]*cast that card/.test(text) ||
    /(?:cast|play) [^.]*instant or sorcery [^.]*from your graveyard/.test(text) ||
    /put target instant or sorcery card from [^.]*graveyard (?:on top of|into) your library/.test(text)
  );
}

function hasSpellCastTrigger(text: string): boolean {
  return /whenever you cast (?:or copy )?(?:an? |your |the first )?(?:instant|sorcery|instant or sorcery|noncreature) spell/.test(text) ||
    /magecraft/.test(text);
}

function hasExplicitFinisher(text: string): boolean {
  return (
    /\bwin the game\b|\bextra combat\b|\bdouble the number\b|\bdamage to each opponent\b/.test(text) ||
    /\beach opponent loses\b|\bcreatures you control get \+/.test(text) ||
    /\bput all creature cards from all graveyards onto the battlefield\b/.test(text) ||
    /\bcreate [^.]*creature token for each [^.]*card in your graveyard\b/.test(text)
  );
}

function hasCreatureDeathRelationship(text: string): boolean {
  return /(?:whenever|when|if) [^.]*\b(?:creature|nontoken creature|token creature)[^.]*\bdies\b/.test(text) ||
    /\bwhenever (?:one or more )?(?:another |other )?creatures? die\b/.test(text);
}

function hasRecursion(text: string): boolean {
  return (
    /return [^.]*\bfrom (?:your |a )?graveyard\b[^.]*\b(?:battlefield|hand)\b/.test(text) ||
    /return target [^.]*\bcard (?:from|in) (?:your |a )?graveyard\b/.test(text) ||
    /put [^.]*\bcard[s]? from [^.]*graveyard[s]? onto the battlefield/.test(text) ||
    /\b(?:cast|play) [^.]*\bfrom your graveyard\b/.test(text) ||
    (/\bcreature cards? from graveyards?\b/.test(text) && /\b(?:return|put|battlefield)\b/.test(text))
  );
}

function hasDamageConversion(text: string): boolean {
  const engineEvent = /\b(?:creature|token|permanent)[^.]*\b(?:dies|enters)\b|\bsacrifice\b/.test(text);
  const opponentImpact = /\b(?:each |target )?opponents? (?:loses?|lose) [^.]*life\b|\bdeals? [^.]*damage to (?:each |target )?opponents?\b/.test(text);
  return engineEvent && opponentImpact;
}

function isSacrificePayoff(text: string): boolean {
  return /\bsacrifice\b/.test(text) && (
    /\b(?:each |target )?opponents? (?:loses?|lose) [^.]*life\b/.test(text) ||
    /\bdeals? [^.]*damage\b/.test(text) ||
    /\btarget player mills\b/.test(text)
  );
}

export function classifyCandidateCard(card: NormalizedCandidateCard): CandidateCardFeatures {
  const comparable = deckCard(card);
  const text = (card.oracleText || '').toLowerCase();
  const strategy = new Set<string>();
  const roles = new Set<CandidateCardFeatures['structuralRoles'][number]>();
  const evidence: CandidateCardFeatures['evidence'] = [];

  const creatureTokens = createsCreatureToken(text) && !opponentCreatesToken(text);
  const recursion = hasRecursion(text);
  const creatureDeath = hasCreatureDeathRelationship(text);
  const instantOrSorcery = isInstantOrSorcery(card);
  const countermagic = instantOrSorcery && hasCountermagic(text);
  const spellCopy = hasSpellCopy(text);
  const spellReuse = hasSpellReuse(text);
  const spellCastTrigger = hasSpellCastTrigger(text);
  const spellCostReduction = hasSpellCostReduction(text);
  auraFeatures(card, text).forEach((feature) => strategy.add(feature));
  blinkFeatures(card, text).forEach((feature) => strategy.add(feature));
  if (instantOrSorcery) strategy.add('instant_sorcery_spell');
  if (countermagic) strategy.add('countermagic');
  if (spellCopy) strategy.add('spell_copy');
  if (spellReuse) strategy.add('spell_reuse');
  if (spellCastTrigger) strategy.add('spell_cast_support');
  if (spellCostReduction) strategy.add('spell_cost_reduction');
  if ((isTokenMaker(comparable) && creatureTokens) || creatureTokens) strategy.add('tokens');
  const groundedTokenPayoff = isTokenPayoff(comparable) && (
    /\btoken\b|\bcreatures? (?:enters?|dies?)\b/.test(text) || creatureDeath
  ) && (!text.includes('sacrifice') || isSacrificePayoff(text));
  if (groundedTokenPayoff) strategy.add('token_payoff');
  if (includesAny(text, ['enters the battlefield', 'enters under your control'])) strategy.add('creature_entry');
  if (text.includes('-1/-1 counter')) strategy.add('minus_counters');
  if (text.includes('+1/+1 counter')) strategy.add('plus_counters');
  if (text.includes('proliferate')) strategy.add('proliferate');
  const referencesCounteringSpell = /counter(?:s|ed|ing)? (?:target |a |an )?[^.]*spell/.test(text);
  if (text.includes('counter') && !countermagic && !referencesCounteringSpell && !includesAny(text, ['-1/-1 counter', '+1/+1 counter', 'proliferate'])) {
    strategy.add('generic_counters');
  }
  if (text.includes('untap')) strategy.add('untap');
  if (includesAny(text, ['equal to its power', 'greatest power', 'power among creatures'])) strategy.add('power_matters');
  if (isManaSinkText(text)) strategy.add('mana_sink');
  if (isSacOutlet(comparable) || text.includes('sacrifice a creature')) strategy.add('sacrifice');
  if (creatureDeath) strategy.add('creature_death');
  if (recursion) strategy.add('recursion');
  if ((creatureTokens || (recursion && (card.typeLine || '').toLowerCase().includes('creature')))) {
    strategy.add('expendable_body');
  }
  if (hasDamageConversion(text)) strategy.add('damage_conversion');
  if (isHasteEnabler(comparable)) strategy.add('haste');
  if (includesAny(text, ['activated abilities', 'activate abilities', 'untap target creature'])) strategy.add('activation_support');
  const tribalLordTypes = extractTribalLordTypes(text);
  if (tribalLordTypes.length > 0 || /other creatures you control (?:get|have)/.test(text)) {
    strategy.add('tribal_lord');
    tribalLordTypes.forEach((type) => strategy.add(`tribal_lord:${type}`));
  }

  if (isRamp(comparable) && !opponentCreatesToken(text)) roles.add('ramp_fixing');
  if (isCardDraw(comparable)) roles.add('draw');
  if (isSingleTargetRemoval(comparable) || isBoardWipe(comparable)) roles.add('interaction');
  if (strategy.has('removal_aura') || strategy.has('blink')) roles.add('interaction');
  if (isProtection(comparable)) roles.add('protection');
  if (strategy.has('beneficial_aura') && includesAny(text, ['hexproof', 'indestructible', 'protection', 'totem armor'])) roles.add('protection');
  const spellTokenEngine = creatureTokens && (spellCastTrigger || /for each instant and sorcery card/.test(text));
  if (spellTokenEngine) strategy.add('spell_token_engine');
  const cheapCardSelection = instantOrSorcery && (card.cmc ?? Number.POSITIVE_INFINITY) <= 2 && (
    roles.has('draw') || includesAny(text, ['scry ', 'surveil ', 'look at the top'])
  );
  if (cheapCardSelection) strategy.add('cantrip');
  const efficientManaValue = (card.cmc ?? Number.POSITIVE_INFINITY) <= 2;
  if (
    instantOrSorcery &&
    (cheapCardSelection || (efficientManaValue && (countermagic || roles.has('interaction') || roles.has('protection'))))
  ) {
    strategy.add('efficient_spell');
  }
  if (
    (tribalLordTypes.length === 0 && hasExplicitFinisher(text)) ||
    strategy.has('voltron_scaling') || strategy.has('trigger_enhancer') ||
    spellTokenEngine ||
    (tribalLordTypes.length === 0 && groundedTokenPayoff) ||
    isSacrificePayoff(text)
  ) {
    roles.add('payoff_finisher');
  }
  const utilityLand = isUtilityLand(comparable);
  if (utilityLand) roles.add('utility_land');

  let usedStructuralFallback = false;
  const fallback = STRUCTURAL_FALLBACKS[card.functionalId] || STRUCTURAL_FALLBACKS[`name:${card.normalizedName}`];
  if (!card.oracleText && fallback) {
    roles.add('ramp_fixing');
    evidence.push(fallback.evidence);
    usedStructuralFallback = true;
  }

  return {
    creatureTypes: extractCreatureTypes(card.typeLine),
    strategyFeatures: Array.from(strategy).sort(),
    structuralRoles: Array.from(roles).sort(),
    utilityLand,
    basicLand: isBasicLandCard(comparable) || BASIC_LAND_CANONICAL_NAMES.has(card.normalizedName),
    usedStructuralFallback,
    evidence,
  };
}
