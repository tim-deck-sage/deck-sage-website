// app/app/utils/bulkOpportunity/buildOpportunityEngine.ts

import { adaptBulkCards } from './bulkCardAdapter';
import { detectArchetypeSignals } from './archetypeSignals';
import { findCommanderCandidates } from './commanderCandidates';
import { buildDeckOpportunity } from './opportunityScorer';
import { detectSynergyPackages } from './synergyPackages';
import {
  BulkCard,
  DeckOpportunity,
  SynergyPackage,
  ArchetypeSignal,
  CommanderCandidate,
  AnalyzedBulkCard,
  ArchetypeType,
} from './types';
import { tagBulkCards } from './bulkTagger';

const DEBUG = true;

const MIN_COMPLETE_OPPORTUNITY_PERCENT = 25;
const MIN_PARTIAL_OPPORTUNITY_PERCENT = 8;

function log(...args: any[]) {
  if (DEBUG) console.log('[BulkOpportunity]', ...args);
}

function normalizeName(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function filterPackagesForArchetype(
  packages: SynergyPackage[],
  archetype: string,
): SynergyPackage[] {
  return packages.filter((pkg) => pkg.type === archetype);
}

function filterSignalsForCommander(
  signals: ArchetypeSignal[],
  commander: CommanderCandidate,
): ArchetypeSignal[] {
  return signals.filter((signal) =>
    commander.supportedArchetypes.includes(signal.archetype),
  );
}

function dedupeByCommander(
  opportunities: DeckOpportunity[],
): DeckOpportunity[] {
  const bestByCommander = new Map<string, DeckOpportunity>();

  for (const opportunity of opportunities) {
    const key = normalizeName(opportunity.commander.card.name);
    const existing = bestByCommander.get(key);

    if (!existing) {
      bestByCommander.set(key, opportunity);
      continue;
    }

    if (opportunity.confidenceScore > existing.confidenceScore) {
      bestByCommander.set(key, opportunity);
      continue;
    }

    if (
      opportunity.confidenceScore === existing.confidenceScore &&
      opportunity.deckCompletionPercent > existing.deckCompletionPercent
    ) {
      bestByCommander.set(key, opportunity);
      continue;
    }

    if (
      opportunity.confidenceScore === existing.confidenceScore &&
      opportunity.deckCompletionPercent === existing.deckCompletionPercent &&
      opportunity.supportingCards.length > existing.supportingCards.length
    ) {
      bestByCommander.set(key, opportunity);
    }
  }

  return Array.from(bestByCommander.values());
}

function getColorIdentitySet(card: AnalyzedBulkCard): Set<string> {
  const values =
    card.colorIdentity && card.colorIdentity.length > 0
      ? card.colorIdentity
      : card.colors;

  return new Set(
    (values || [])
      .filter(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      )
      .map((value) => value.trim().toUpperCase()),
  );
}

function isColorCompatible(
  commander: CommanderCandidate,
  card: AnalyzedBulkCard,
): boolean {
  const commanderColors = getColorIdentitySet(commander.card);
  const cardColors = getColorIdentitySet(card);

  if (cardColors.size === 0 || commanderColors.size === 0) {
    return true;
  }

  for (const color of cardColors) {
    if (!commanderColors.has(color)) {
      return false;
    }
  }

  return true;
}

function getCompatibleCardsForCommander(
  cards: AnalyzedBulkCard[],
  commander: CommanderCandidate,
): AnalyzedBulkCard[] {
  return cards.filter((card) => isColorCompatible(commander, card));
}

function getCompatibleSignalForCommander(
  signal: ArchetypeSignal,
  commander: CommanderCandidate,
): ArchetypeSignal {
  return {
    ...signal,
    supportingCards: signal.supportingCards.filter((card) =>
      isColorCompatible(commander, card),
    ),
  };
}

function getCompatiblePackagesForCommander(
  packages: SynergyPackage[],
  commander: CommanderCandidate,
): SynergyPackage[] {
  return packages
    .map((pkg) => ({
      ...pkg,
      pieces: pkg.pieces.filter((card) => isColorCompatible(commander, card)),
    }))
    .filter((pkg) => pkg.pieces.length > 0);
}

function getArchetypeTagHints(archetype: ArchetypeType): string[] {
  switch (archetype) {
    case 'tokens':
      return ['token-maker', 'token-payoff', 'finisher'];
    case 'aristocrats':
      return ['sac-outlet', 'death-trigger', 'token-maker', 'recursion'];
    case 'artifacts':
      return ['artifact', 'artifact-payoff', 'ramp', 'draw'];
    case 'spellslinger':
      return ['spell', 'spell-payoff', 'draw', 'interaction'];
    case 'counters':
      return ['counter', 'proliferate', 'finisher'];
    case 'graveyard':
      return ['graveyard', 'recursion', 'finisher'];
    case 'treasure':
      return ['treasure', 'artifact-payoff', 'ramp'];
    case 'tribal':
      return ['tribal', 'lord', 'token-maker', 'finisher'];
    case 'landfall':
      return ['landfall', 'ramp', 'finisher'];
    case 'lifegain':
      return ['lifegain', 'lifegain-payoff', 'draw'];
    case 'blink':
      return ['blink', 'etb', 'draw', 'interaction'];
    default:
      return [];
  }
}

function buildFallbackSignalsForCommander(
  commander: CommanderCandidate,
  compatibleCards: AnalyzedBulkCard[],
): ArchetypeSignal[] {
  return commander.supportedArchetypes.map((archetype) => {
    const tagHints = getArchetypeTagHints(archetype);

    const supportingCards = compatibleCards.filter((card) =>
      card.tags.some((tag) => tagHints.includes(tag)),
    );

    const weightedSupport = supportingCards.reduce(
      (sum, card) => sum + Math.max(1, card.quantity),
      0,
    );

    const strength = Math.max(
      10,
      Math.min(100, Math.round(weightedSupport * 6 + commander.score * 0.15)),
    );

    return {
      archetype,
      strength,
      supportingCards,
    };
  });
}

function hasEnoughColorAlignedSupport(
  commander: CommanderCandidate,
  signal: ArchetypeSignal,
  packages: SynergyPackage[],
): boolean {
  const compatibleSupportCount = signal.supportingCards.reduce(
    (sum, card) => sum + Math.max(1, card.quantity),
    0,
  );

  const compatiblePackageCount = packages.reduce(
    (sum, pkg) =>
      sum +
      pkg.pieces.reduce(
        (pieceSum, piece) => pieceSum + Math.max(1, piece.quantity),
        0,
      ),
    0,
  );

  const commanderColors = getColorIdentitySet(commander.card).size;
  const supportFloor =
    commanderColors >= 3 ? 6 : commanderColors === 2 ? 4 : 2;

  const passes =
    compatibleSupportCount >= supportFloor ||
    compatiblePackageCount >= supportFloor ||
    commander.score >= 50;

  log('Support Check', {
    commander: commander.card.name,
    archetype: signal.archetype,
    supportCount: compatibleSupportCount,
    packageCount: compatiblePackageCount,
    supportFloor,
    passes,
  });

  return passes;
}

export function buildBulkDeckOpportunities(
  bulkCards: BulkCard[],
): DeckOpportunity[] {
  log('--- START BULK OPPORTUNITY BUILD ---');

  const adapted = adaptBulkCards(bulkCards);
  log('Adapted cards:', adapted.length);

  const tagged = tagBulkCards(adapted);
  log('Tagged cards:', tagged.length);

  const commanders = findCommanderCandidates(tagged);
  log(
    'Commander candidates:',
    commanders.map((c) => ({
      name: c.card.name,
      score: c.score,
      archetypes: c.supportedArchetypes,
    })),
  );

  if (commanders.length === 0) {
    log('❌ No commanders detected');
    return [];
  }

  const signals = detectArchetypeSignals(tagged);
  log(
    'Archetype signals:',
    signals.map((s) => ({
      archetype: s.archetype,
      strength: s.strength,
      supportCount: s.supportingCards.length,
    })),
  );

  const packages = detectSynergyPackages(tagged);
  log(
    'Synergy packages:',
    packages.map((p) => ({
      type: p.type,
      pieces: p.pieces.length,
    })),
  );

  const opportunities: DeckOpportunity[] = [];

  for (const commander of commanders) {
    log('--- Evaluating Commander ---', commander.card.name);

    const compatibleCards = getCompatibleCardsForCommander(tagged, commander);
    log('Compatible cards:', compatibleCards.length);

    if (compatibleCards.length === 0) {
      log('❌ Rejected: No compatible cards');
      continue;
    }

    let matchingSignals = filterSignalsForCommander(signals, commander);

    if (matchingSignals.length === 0) {
      log('⚠️ No strong matching signals. Building partial fallback signals.');
      matchingSignals = buildFallbackSignalsForCommander(
        commander,
        compatibleCards,
      );
    }

    log(
      'Matching signals:',
      matchingSignals.map((s) => s.archetype),
    );

    for (const rawSignal of matchingSignals) {
      log('--- Evaluating Archetype ---', rawSignal.archetype);

      const signal = getCompatibleSignalForCommander(rawSignal, commander);

      log('Filtered supporting cards:', signal.supportingCards.length);

      const matchingPackages = getCompatiblePackagesForCommander(
        filterPackagesForArchetype(packages, signal.archetype),
        commander,
      );

      log('Matching packages:', matchingPackages.length);

      if (
        signal.supportingCards.length === 0 &&
        matchingPackages.length === 0
      ) {
        log('❌ Rejected: No supporting cards or packages');
        continue;
      }

      if (
        !hasEnoughColorAlignedSupport(
          commander,
          signal,
          matchingPackages,
        )
      ) {
        log('⚠️ Partial opportunity: below ideal support threshold');
      }

      const opportunity = buildDeckOpportunity({
        commander,
        archetypeSignal: signal,
        synergyPackages: matchingPackages,
        cards: compatibleCards,
      });

      log('Opportunity built:', {
        commander: commander.card.name,
        archetype: signal.archetype,
        completion: opportunity.deckCompletionPercent,
        confidence: opportunity.confidenceScore,
      });

      if (opportunity.deckCompletionPercent >= MIN_COMPLETE_OPPORTUNITY_PERCENT) {
        log('✅ Accepted complete opportunity');
        opportunities.push(opportunity);
        continue;
      }

      if (opportunity.deckCompletionPercent >= MIN_PARTIAL_OPPORTUNITY_PERCENT) {
        log('🟡 Accepted partial opportunity');
        opportunities.push(opportunity);
        continue;
      }

      log('❌ Rejected: Deck completion too low');
    }
  }

  const result = dedupeByCommander(opportunities).sort((a, b) => {
    if (b.confidenceScore !== a.confidenceScore) {
      return b.confidenceScore - a.confidenceScore;
    }
    return b.deckCompletionPercent - a.deckCompletionPercent;
  });

  log('FINAL OPPORTUNITIES:', result.length);
  log(
    'FINAL COMMANDERS:',
    result.map((item) => ({
      commander: item.commander.card.name,
      archetypes: item.archetypes,
      confidence: item.confidenceScore,
      completion: item.deckCompletionPercent,
    })),
  );
  log('--- END BULK OPPORTUNITY BUILD ---');

  return result;
}