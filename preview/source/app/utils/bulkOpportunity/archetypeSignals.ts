// app/app/utils/bulkOpportunity/archetypeSignals.ts

import {
  AnalyzedBulkCard,
  ArchetypeSignal,
  ArchetypeType,
  CardTag,
} from './types';

type ArchetypeRule = {
  archetype: ArchetypeType;
  primaryTags: CardTag[];
  secondaryTags: CardTag[];
  textPatterns: string[];
  bonus?: (card: AnalyzedBulkCard) => number;
};

const TRIBAL_SUBTYPES = [
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
];

const ARCHETYPE_RULES: ArchetypeRule[] = [
  {
    archetype: 'tokens',
    primaryTags: ['token-maker', 'token-payoff'],
    secondaryTags: ['finisher'],
    textPatterns: [
      'create a token',
      'create two tokens',
      'create x',
      'tokens you control',
      'if one or more tokens would be created',
      'creature tokens you control',
    ],
  },
  {
    archetype: 'aristocrats',
    primaryTags: ['sac-outlet', 'death-trigger'],
    secondaryTags: ['token-maker', 'graveyard', 'recursion'],
    textPatterns: [
      'whenever a creature dies',
      'whenever another creature dies',
      'sacrifice another creature',
      'sacrifice a creature',
      'dies,',
      'dies.',
      'lose 1 life and you gain 1 life',
    ],
  },
  {
    archetype: 'artifacts',
    primaryTags: ['artifact', 'artifact-payoff'],
    secondaryTags: ['draw', 'ramp'],
    textPatterns: [
      'artifact spells',
      'artifacts you control',
      'whenever an artifact enters the battlefield',
      'affinity for artifacts',
      'metalcraft',
      'improvise',
    ],
  },
  {
    archetype: 'spellslinger',
    primaryTags: ['spell', 'spell-payoff'],
    secondaryTags: ['draw', 'interaction'],
    textPatterns: [
      'instant and sorcery',
      'whenever you cast an instant',
      'whenever you cast a sorcery',
      'whenever you cast or copy',
      'copy target instant or sorcery spell',
      'magecraft',
      'storm',
    ],
  },
  {
    archetype: 'counters',
    primaryTags: ['counter', 'proliferate'],
    secondaryTags: ['finisher'],
    textPatterns: [
      '+1/+1 counter',
      '+1/+1 counters',
      'put a counter on',
      'put counters on',
      'proliferate',
      'enters with a +1/+1 counter',
    ],
  },
  {
    archetype: 'graveyard',
    primaryTags: ['graveyard', 'recursion'],
    secondaryTags: ['finisher'],
    textPatterns: [
      'graveyard',
      'mill',
      'from your graveyard',
      'return target card from your graveyard',
      'return a creature card from your graveyard',
      'from your graveyard to the battlefield',
      'reanimate',
    ],
  },
  {
    archetype: 'treasure',
    primaryTags: ['treasure'],
    secondaryTags: ['artifact-payoff', 'ramp'],
    textPatterns: [
      'treasure token',
      'treasure tokens',
      'create a treasure',
      'create two treasures',
      'sacrifice a treasure',
    ],
  },
  {
    archetype: 'tribal',
    primaryTags: ['tribal', 'lord'],
    secondaryTags: ['token-maker', 'finisher'],
    textPatterns: [
      'creatures of the chosen type',
      'creatures you control of the chosen type',
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
    ],
    bonus: (card) => {
      const subtypeHits = card.subtypes.filter((subtype) =>
        TRIBAL_SUBTYPES.includes(subtype.toLowerCase()),
      ).length;

      return subtypeHits > 0 ? Math.min(2, subtypeHits) : 0;
    },
  },
  {
    archetype: 'landfall',
    primaryTags: ['landfall'],
    secondaryTags: ['ramp', 'treasure', 'finisher'],
    textPatterns: [
      'landfall',
      'whenever a land enters the battlefield under your control',
      'whenever one or more lands enter the battlefield under your control',
      'search your library for a land',
      'put a land card from your library onto the battlefield',
    ],
  },
  {
    archetype: 'lifegain',
    primaryTags: ['lifegain', 'lifegain-payoff'],
    secondaryTags: ['draw', 'finisher'],
    textPatterns: [
      'gain life',
      'whenever you gain life',
      'if you gained life this turn',
      'lifelink',
      'at the beginning of each end step, if you gained life',
    ],
  },
  {
    archetype: 'blink',
    primaryTags: ['blink', 'etb'],
    secondaryTags: ['draw', 'interaction'],
    textPatterns: [
      'exile another target creature you control, then return it',
      'exile target creature you control, then return that card',
      'at the beginning of your end step, exile',
      'when this enters the battlefield',
      'enters the battlefield,',
    ],
  },
];

function normalizeText(value?: string): string {
  return (value || '').toLowerCase();
}

function countMatchingTags(card: AnalyzedBulkCard, tags: CardTag[]): number {
  return tags.filter((tag) => card.tags.includes(tag)).length;
}

function countTextPatternMatches(text: string, patterns: string[]): number {
  return patterns.filter((pattern) => text.includes(pattern)).length;
}

function scoreCardForArchetype(card: AnalyzedBulkCard, rule: ArchetypeRule): number {
  const primaryMatches = countMatchingTags(card, rule.primaryTags);
  const secondaryMatches = countMatchingTags(card, rule.secondaryTags);

  const oracle = normalizeText(card.oracleText);
  const typeLine = normalizeText(card.typeLine);
  const name = normalizeText(card.name);
  const fullText = `${name} ${typeLine} ${oracle}`;

  const textMatches = countTextPatternMatches(fullText, rule.textPatterns);

  let score = primaryMatches * 3.5 + secondaryMatches * 1.5 + textMatches * 2;

  if (rule.bonus) {
    score += rule.bonus(card);
  }

  if (card.quantity > 1) {
    score += Math.min(4, (card.quantity - 1) * 0.5);
  }

  return score;
}

function normalizeStrength(rawScore: number, weightedCardCount: number): number {
  if (weightedCardCount <= 0) {
    return 0;
  }

  const scaled = (rawScore / Math.max(10, weightedCardCount)) * 18;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

export function detectArchetypeSignals(cards: AnalyzedBulkCard[]): ArchetypeSignal[] {
  return ARCHETYPE_RULES.map((rule) => {
    const scoredCards = cards
      .map((card) => ({
        card,
        score: scoreCardForArchetype(card, rule),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const rawScore = scoredCards.reduce(
      (sum, entry) => sum + entry.score * Math.max(1, entry.card.quantity),
      0,
    );

    const weightedCardCount = cards.reduce(
      (sum, card) => sum + Math.max(1, card.quantity),
      0,
    );

    return {
      archetype: rule.archetype,
      strength: normalizeStrength(rawScore, weightedCardCount),
      supportingCards: scoredCards.map((entry) => entry.card),
    };
  })
    .filter((signal) => signal.strength >= 15 && signal.supportingCards.length > 0)
    .sort((a, b) => b.strength - a.strength);
}