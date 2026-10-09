// app/app/utils/bulkOpportunity/opportunityScorer.ts

import {
  AnalyzedBulkCard,
  ArchetypeSignal,
  CommanderCandidate,
  DeckOpportunity,
  SynergyPackage,
} from './types';
import { scoreDeckShell } from './shellCompleteness';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function topSupportingCards(cards: AnalyzedBulkCard[], limit = 18): AnalyzedBulkCard[] {
  return [...cards]
    .sort((a, b) => {
      const aScore = a.tags.length * Math.max(1, a.quantity);
      const bScore = b.tags.length * Math.max(1, b.quantity);
      return bScore - aScore;
    })
    .slice(0, limit);
}

function buildMissingKeyPieces(archetype: string): string[] {
  switch (archetype) {
    case 'tokens':
      return ['more token producers', 'anthem/token payoff cards', 'finishers', 'mana ramp'];
    case 'aristocrats':
      return ['free sacrifice outlets', 'death payoff effects', 'token fodder', 'recursion'];
    case 'artifacts':
      return ['artifact ramp', 'artifact payoffs', 'card advantage engines', 'finishers'];
    case 'spellslinger':
      return ['cheap instants and sorceries', 'spell payoffs', 'cost reduction', 'card draw'];
    case 'counters':
      return ['counter enablers', 'proliferate pieces', 'payoff creatures', 'resilience'];
    case 'graveyard':
      return ['self-mill', 'recursion', 'graveyard payoffs', 'reanimation targets'];
    case 'treasure':
      return ['treasure makers', 'artifact synergy', 'payoff threats', 'card draw'];
    case 'tribal':
      return ['tribe density', 'lords', 'tribal payoffs', 'tribe-specific interaction'];
    case 'landfall':
      return ['extra land drops', 'landfall payoffs', 'ramp', 'recursion for lands'];
    case 'lifegain':
      return ['repeatable lifegain', 'lifegain payoffs', 'draw engines', 'finishers'];
    case 'blink':
      return ['ETB creatures', 'repeatable blink', 'value engines', 'interaction'];
    default:
      return ['ramp', 'draw', 'interaction', 'payoffs'];
  }
}

function buildSummary(
  commanderName: string,
  archetype: string,
  shellScore: number,
  packageCount: number,
): string {
  return `${commanderName} projects as a ${archetype} shell with ${shellScore}% structural support already present in bulk and ${packageCount} meaningful synergy package(s).`;
}

function computeDeckCompletionPercent(
  shellScore: number,
  archetypeStrength: number,
  commanderScore: number,
  synergyPackages: SynergyPackage[],
): number {
  const synergyStrength =
    synergyPackages.length > 0
      ? synergyPackages.reduce((sum, pkg) => sum + pkg.strength, 0) / synergyPackages.length
      : 0;

  const raw =
    shellScore * 0.4 +
    archetypeStrength * 0.25 +
    commanderScore * 0.2 +
    synergyStrength * 0.15;

  return clamp(Math.round(raw), 0, 100);
}

function computeConfidenceScore(
  deckCompletionPercent: number,
  shellScore: number,
  commanderScore: number,
  archetypeStrength: number,
  synergyPackages: SynergyPackage[],
): number {
  const packageBonus = Math.min(12, synergyPackages.length * 4);
  const packageStrengthBonus =
    synergyPackages.length > 0
      ? Math.min(
          10,
          Math.round(
            synergyPackages.reduce((sum, pkg) => sum + pkg.strength, 0) /
              synergyPackages.length /
              10,
          ),
        )
      : 0;

  return clamp(
    Math.round(
      deckCompletionPercent * 0.45 +
        shellScore * 0.2 +
        commanderScore * 0.15 +
        archetypeStrength * 0.1 +
        packageBonus +
        packageStrengthBonus,
    ),
    0,
    100,
  );
}

export function buildDeckOpportunity(params: {
  commander: CommanderCandidate;
  archetypeSignal: ArchetypeSignal;
  synergyPackages: SynergyPackage[];
  cards: AnalyzedBulkCard[];
}): DeckOpportunity {
  const { commander, archetypeSignal, synergyPackages, cards } = params;

  const matchingCards = cards.filter((card) => {
    const hasArchetypeSupport = archetypeSignal.supportingCards.some(
      (supportCard) => supportCard.name === card.name,
    );

    const hasPackageSupport = synergyPackages.some((pkg) =>
      pkg.pieces.some((piece) => piece.name === card.name),
    );

    const supportsCommanderArchetype = commander.supportedArchetypes.includes(
      archetypeSignal.archetype,
    );

    return hasArchetypeSupport || hasPackageSupport || supportsCommanderArchetype;
  });

  const shell = scoreDeckShell(matchingCards, archetypeSignal.archetype);

  const deckCompletionPercent = computeDeckCompletionPercent(
    shell.shellScore,
    archetypeSignal.strength,
    commander.score,
    synergyPackages,
  );

  const confidenceScore = computeConfidenceScore(
    deckCompletionPercent,
    shell.shellScore,
    commander.score,
    archetypeSignal.strength,
    synergyPackages,
  );

  return {
    commander,
    confidenceScore,
    deckCompletionPercent,
    archetypes: [archetypeSignal.archetype],
    summary: buildSummary(
      commander.card.name,
      archetypeSignal.archetype,
      shell.shellScore,
      synergyPackages.length,
    ),
    supportingCards: topSupportingCards(matchingCards),
    missingKeyPieces: buildMissingKeyPieces(archetypeSignal.archetype),
    roleCoverage: shell.roleCoverage,
    synergyPackages,
  };
}