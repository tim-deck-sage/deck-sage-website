// app/app/utils/bulkOpportunity/shellCompleteness.ts

import {
  AnalyzedBulkCard,
  ArchetypeType,
  RoleCoverage,
} from './types';

export interface DeckShellScore {
  roleCoverage: RoleCoverage;
  manaSupport: number;
  payoffDensity: number;
  enablerDensity: number;
  shellScore: number; // 0-100
}

function countByTag(cards: AnalyzedBulkCard[], tag: string): number {
  return cards.reduce((sum, card) => {
    if (card.tags.includes(tag as never)) {
      return sum + Math.max(1, card.quantity);
    }
    return sum;
  }, 0);
}

function countManaSupport(cards: AnalyzedBulkCard[]): number {
  return cards.reduce((sum, card) => {
    const colorCount = card.colorIdentity.length;
    if (card.tags.includes('ramp')) {
      return sum + Math.max(1, card.quantity);
    }
    if (colorCount >= 2) {
      return sum + 0.5;
    }
    return sum;
  }, 0);
}

function getArchetypeEnablerTags(archetype: ArchetypeType): string[] {
  switch (archetype) {
    case 'tokens':
      return ['token-maker'];
    case 'aristocrats':
      return ['sac-outlet', 'death-trigger', 'token-maker'];
    case 'artifacts':
      return ['artifact'];
    case 'spellslinger':
      return ['spell'];
    case 'counters':
      return ['counter', 'proliferate'];
    case 'graveyard':
      return ['graveyard', 'recursion'];
    case 'treasure':
      return ['treasure'];
    case 'tribal':
      return ['tribal'];
    case 'landfall':
      return ['landfall', 'ramp'];
    case 'lifegain':
      return ['lifegain'];
    case 'blink':
      return ['blink', 'etb'];
    default:
      return [];
  }
}

function getArchetypePayoffTags(archetype: ArchetypeType): string[] {
  switch (archetype) {
    case 'tokens':
      return ['token-payoff', 'finisher'];
    case 'aristocrats':
      return ['death-trigger', 'finisher'];
    case 'artifacts':
      return ['artifact-payoff', 'finisher'];
    case 'spellslinger':
      return ['spell-payoff', 'finisher'];
    case 'counters':
      return ['proliferate', 'finisher'];
    case 'graveyard':
      return ['recursion', 'finisher'];
    case 'treasure':
      return ['artifact-payoff', 'finisher'];
    case 'tribal':
      return ['lord', 'finisher'];
    case 'landfall':
      return ['landfall', 'finisher'];
    case 'lifegain':
      return ['lifegain-payoff', 'finisher'];
    case 'blink':
      return ['etb', 'finisher'];
    default:
      return [];
  }
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreDeckShell(
  cards: AnalyzedBulkCard[],
  primaryArchetype: ArchetypeType,
): DeckShellScore {
  const roleCoverage: RoleCoverage = {
    ramp: countByTag(cards, 'ramp'),
    draw: countByTag(cards, 'draw'),
    interaction: countByTag(cards, 'interaction'),
    removal: countByTag(cards, 'removal'),
    payoffs: 0,
    enablers: 0,
  };

  const enablerTags = getArchetypeEnablerTags(primaryArchetype);
  const payoffTags = getArchetypePayoffTags(primaryArchetype);

  const enablerDensity = cards.reduce((sum, card) => {
    const matches = enablerTags.filter((tag) => card.tags.includes(tag as never)).length;
    return sum + matches * Math.max(1, card.quantity);
  }, 0);

  const payoffDensity = cards.reduce((sum, card) => {
    const matches = payoffTags.filter((tag) => card.tags.includes(tag as never)).length;
    return sum + matches * Math.max(1, card.quantity);
  }, 0);

  roleCoverage.enablers = enablerDensity;
  roleCoverage.payoffs = payoffDensity;

  const manaSupport = countManaSupport(cards);

  const rampScore = Math.min(15, roleCoverage.ramp * 1.5);
  const drawScore = Math.min(15, roleCoverage.draw * 1.5);
  const interactionScore = Math.min(12, roleCoverage.interaction * 1.2);
  const removalScore = Math.min(10, roleCoverage.removal * 1.25);
  const enablerScore = Math.min(20, enablerDensity * 1.4);
  const payoffScore = Math.min(18, payoffDensity * 1.5);
  const manaScore = Math.min(10, manaSupport * 1.1);

  const shellScore = clampScore(
    rampScore +
      drawScore +
      interactionScore +
      removalScore +
      enablerScore +
      payoffScore +
      manaScore,
  );

  return {
    roleCoverage,
    manaSupport,
    payoffDensity,
    enablerDensity,
    shellScore,
  };
}