// app/app/utils/bulkOpportunity/synergyPackages.ts

import {
  AnalyzedBulkCard,
  ArchetypeType,
  CardTag,
  SynergyPackage,
} from './types';

type SynergyRule = {
  type: SynergyPackage['type'];
  requiredTags: CardTag[];
  supportTags: CardTag[];
  archetype: ArchetypeType;
};

const SYNERGY_RULES: SynergyRule[] = [
  {
    type: 'tokens',
    requiredTags: ['token-maker', 'token-payoff'],
    supportTags: ['finisher'],
    archetype: 'tokens',
  },
  {
    type: 'aristocrats',
    requiredTags: ['sac-outlet', 'death-trigger'],
    supportTags: ['token-maker', 'graveyard', 'recursion'],
    archetype: 'aristocrats',
  },
  {
    type: 'artifacts',
    requiredTags: ['artifact', 'artifact-payoff'],
    supportTags: ['draw', 'ramp'],
    archetype: 'artifacts',
  },
  {
    type: 'spellslinger',
    requiredTags: ['spell', 'spell-payoff'],
    supportTags: ['draw', 'interaction'],
    archetype: 'spellslinger',
  },
  {
    type: 'graveyard',
    requiredTags: ['graveyard', 'recursion'],
    supportTags: ['finisher'],
    archetype: 'graveyard',
  },
  {
    type: 'tribal',
    requiredTags: ['tribal', 'lord'],
    supportTags: ['token-maker', 'finisher'],
    archetype: 'tribal',
  },
];

function getWeightedCount(cards: AnalyzedBulkCard[], tag: CardTag): number {
  return cards.reduce((sum, card) => {
    if (card.tags.includes(tag)) {
      return sum + Math.max(1, card.quantity);
    }
    return sum;
  }, 0);
}

function getCardsWithAnyTags(cards: AnalyzedBulkCard[], tags: CardTag[]): AnalyzedBulkCard[] {
  return cards.filter((card) => tags.some((tag) => card.tags.includes(tag)));
}

function clampStrength(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildPackage(cards: AnalyzedBulkCard[], rule: SynergyRule): SynergyPackage | null {
  const requiredCounts = rule.requiredTags.map((tag) => getWeightedCount(cards, tag));
  const supportCount = rule.supportTags.reduce((sum, tag) => sum + getWeightedCount(cards, tag), 0);

  const hasAllRequired = requiredCounts.every((count) => count > 0);
  if (!hasAllRequired) {
    return null;
  }

  const requiredBase = requiredCounts.reduce((sum, count) => sum + Math.min(8, count), 0);
  const supportScore = Math.min(10, supportCount);
  const strength = clampStrength((requiredBase * 6) + (supportScore * 2));

  if (strength < 20) {
    return null;
  }

  const pieces = getCardsWithAnyTags(cards, [...rule.requiredTags, ...rule.supportTags])
    .sort((a, b) => {
      const aHits =
        [...rule.requiredTags, ...rule.supportTags].filter((tag) => a.tags.includes(tag)).length *
        Math.max(1, a.quantity);
      const bHits =
        [...rule.requiredTags, ...rule.supportTags].filter((tag) => b.tags.includes(tag)).length *
        Math.max(1, b.quantity);
      return bHits - aHits;
    });

  return {
    type: rule.type,
    strength,
    pieces,
  };
}

export function detectSynergyPackages(cards: AnalyzedBulkCard[]): SynergyPackage[] {
  return SYNERGY_RULES.map((rule) => buildPackage(cards, rule))
    .filter((pkg): pkg is SynergyPackage => pkg !== null)
    .sort((a, b) => b.strength - a.strength);
}