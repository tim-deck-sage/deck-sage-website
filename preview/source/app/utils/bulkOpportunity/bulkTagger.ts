// app/app/utils/bulkOpportunity/bulkTagger.ts

import { AnalyzedBulkCard, CardTag } from './types';

function normalizeText(value?: string): string {
  return (value || '').toLowerCase();
}

function hasType(card: AnalyzedBulkCard, type: string): boolean {
  return card.types.some((entry) => entry.toLowerCase() === type.toLowerCase());
}

function hasSubtype(card: AnalyzedBulkCard, subtype: string): boolean {
  return card.subtypes.some(
    (entry) => entry.toLowerCase() === subtype.toLowerCase(),
  );
}

function textIncludesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function addTag(tags: Set<CardTag>, condition: boolean, tag: CardTag) {
  if (condition) {
    tags.add(tag);
  }
}

function detectTags(card: AnalyzedBulkCard): CardTag[] {
  const tags = new Set<CardTag>();

  const name = normalizeText(card.name);
  const oracle = normalizeText(card.oracleText);
  const typeLine = normalizeText(card.typeLine);
  const fullText = `${name} ${oracle} ${typeLine}`;

  const isCreature = hasType(card, 'Creature');
  const isArtifact = hasType(card, 'Artifact');
  const isInstant = hasType(card, 'Instant');
  const isSorcery = hasType(card, 'Sorcery');
  const isEnchantment = hasType(card, 'Enchantment');
  const isPlaneswalker = hasType(card, 'Planeswalker');

  addTag(
    tags,
    textIncludesAny(fullText, [
      'search your library for a land',
      'search your library for up to',
      'put a land card from your library onto the battlefield',
      'add one mana',
      'add two mana',
      'add three mana',
      'treasure token',
      'treasure tokens',
      'mana of any color',
    ]) ||
      textIncludesAny(name, [
        'sol ring',
        'arcane signet',
        'fellwar stone',
        'mind stone',
        'cultivate',
        'kodama',
        'rampant growth',
      ]),
    'ramp',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'draw a card',
      'draw two cards',
      'draw three cards',
      'whenever you draw',
      'at the beginning of your upkeep, draw',
      'whenever another',
    ]) ||
      textIncludesAny(name, [
        'rhystic study',
        'phyrexian arena',
        'ponder',
        'preordain',
        'brainstorm',
        'harmonize',
      ]),
    'draw',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'counter target',
      'destroy target',
      'exile target',
      'return target',
      'tap target',
      'target player sacrifices',
      'each opponent sacrifices',
      'fight target',
      'deals damage to any target',
    ]),
    'interaction',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'destroy target creature',
      'destroy target permanent',
      'exile target creature',
      'exile target permanent',
      'destroy all creatures',
      'exile all creatures',
      'return all',
      'each opponent sacrifices a creature',
    ]),
    'removal',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'create a token',
      'create two',
      'create x',
      'create a 1/1',
      'create a 2/2',
      'create a treasure token',
      'create a food token',
      'create a clue token',
      'create a creature token',
    ]),
    'token-maker',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'tokens you control',
      'if one or more tokens would be created',
      'anointed procession',
      'parallel lives',
      'double the number of tokens',
      'creature tokens you control get',
      'whenever a creature enters the battlefield under your control',
    ]) ||
      textIncludesAny(name, ['impact tremors', 'purphoros']),
    'token-payoff',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'sacrifice another creature',
      'sacrifice an artifact',
      'sacrifice a creature',
      'sacrifice a permanent',
      'sacrifice another permanent',
      'sacrifice a token',
    ]) ||
      textIncludesAny(name, ['altar', 'bombardment', 'viscera seer']),
    'sac-outlet',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'whenever a creature dies',
      'whenever another creature dies',
      'whenever an artifact is put into a graveyard',
      'dies,',
      'dies.',
      'when this creature dies',
      'lose 1 life and you gain 1 life',
    ]) ||
      textIncludesAny(name, ['blood artist', 'zulaport', 'bastion']),
    'death-trigger',
  );

  addTag(tags, isArtifact, 'artifact');

  addTag(
    tags,
    isArtifact ||
      textIncludesAny(fullText, [
        'artifacts you control',
        'artifact spells',
        'affinity for artifacts',
        'metalcraft',
        'improvise',
        'whenever an artifact enters',
      ]),
    'artifact-payoff',
  );

  addTag(tags, isInstant || isSorcery, 'spell');

  addTag(
    tags,
    textIncludesAny(fullText, [
      'whenever you cast an instant',
      'whenever you cast a sorcery',
      'magecraft',
      'storm',
      'instant and sorcery spells',
      'whenever you cast or copy',
      'copy target instant or sorcery spell',
    ]),
    'spell-payoff',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      '+1/+1 counter',
      '+1/+1 counters',
      'put a counter on',
      'put counters on',
      'enters with a +1/+1 counter',
    ]),
    'counter',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'proliferate',
      'proliferates',
      'whenever you proliferate',
    ]),
    'proliferate',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'mill',
      'put the top',
      'from your library into your graveyard',
      'return from your graveyard',
      'cards in your graveyard',
      'graveyard',
      'reanimate',
    ]),
    'graveyard',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'return target card from your graveyard',
      'return a creature card from your graveyard',
      'return up to one target card from your graveyard',
      'from your graveyard to the battlefield',
      'reanimate',
      'regrowth',
      'buyback',
      'flashback',
      'escape',
    ]),
    'recursion',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'treasure token',
      'treasure tokens',
      'create a treasure',
      'create two treasures',
      'sacrifice a treasure',
    ]),
    'treasure',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'gain life',
      'you gain 1 life',
      'you gain 2 life',
      'you gain 3 life',
      'whenever you gain life',
      'lifelink',
    ]),
    'lifegain',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'whenever you gain life',
      'if you gained life this turn',
      'put a +1/+1 counter on this creature whenever you gain life',
      'at the beginning of each end step, if you gained life',
    ]),
    'lifegain-payoff',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'exile another target creature you control, then return it',
      'exile target creature you control, then return that card',
      'blink',
      'flicker',
      'at the beginning of your end step, exile',
    ]),
    'blink',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'when this enters the battlefield',
      'when enters the battlefield',
      'whenever another creature enters the battlefield',
      'enters the battlefield,',
      'enters,',
    ]) ||
      textIncludesAny(name, ['mulldrifter', 'solemn simulacrum', 'sun titan']),
    'etb',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'other goblin',
      'other elves',
      'other zombies',
      'other dragons',
      'other vampires',
      'other soldiers',
      'other humans',
      'other spirits',
      'other wizards',
      'other knights',
      'other clerics',
      'creatures of the chosen type',
      'creatures you control of the chosen type',
    ]) ||
      textIncludesAny(name, ['lord', 'chieftain', 'archdruid', 'warchief', 'king']),
    'lord',
  );

  addTag(
    tags,
    [
      'goblin',
      'elf',
      'zombie',
      'dragon',
      'vampire',
      'soldier',
      'human',
      'spirit',
      'wizard',
      'knight',
      'cleric',
      'warrior',
      'merfolk',
      'angel',
      'demon',
    ].some((tribe) => hasSubtype(card, tribe)),
    'tribal',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'landfall',
      'whenever a land enters the battlefield under your control',
      'whenever one or more lands enter the battlefield under your control',
    ]),
    'landfall',
  );

  addTag(
    tags,
    textIncludesAny(fullText, [
      'each opponent loses',
      'you win the game',
      'double the power',
      'creatures you control get +',
      'overrun',
      'for each opponent',
      'x damage to each opponent',
      'whenever a creature enters the battlefield under your control, this deals damage to each opponent',
    ]) ||
      textIncludesAny(name, ['craterhoof', 'exsanguinate', 'torment of hailfire', 'finale']),
    'finisher',
  );

  if (isCreature && (isEnchantment || isArtifact || isPlaneswalker)) {
    addTag(tags, true, 'artifact-payoff');
  }

  return Array.from(tags);
}

export function tagBulkCards(cards: AnalyzedBulkCard[]): AnalyzedBulkCard[] {
  return cards.map((card) => ({
    ...card,
    tags: detectTags(card),
  }));
}