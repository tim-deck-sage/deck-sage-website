// app/app/utils/commander/strengthConcernBuilder.ts

import { DeckAnalysisResult } from './deckAnalysisCore';

export interface StrengthConcernResult {
  strengths: {
    official: string[];
    inferred: string[];
  };
  concerns: {
    official: string[];
    inferred: string[];
  };
}

export function buildStrengthsAndConcerns(
  analysis: DeckAnalysisResult,
): StrengthConcernResult {
  const strengthsOfficial: string[] = [];
  const concernsOfficial: string[] = [];

  const strengthsInferred: string[] = [];
  const concernsInferred: string[] = [];

  const {
    gameChangerCount,
    comboResult,
    turnWindow,
    metrics,
  } = analysis;

  // --- OFFICIAL (Wizards-style signals) ---

  if (gameChangerCount === 0) {
    strengthsOfficial.push('No Game Changers — appropriate for lower brackets');
  }

  if (gameChangerCount > 3) {
    concernsOfficial.push('High number of Game Changers — pushes deck into higher brackets');
  }

  if (comboResult.comboCount > 0) {
    strengthsOfficial.push(`Contains ${comboResult.comboCount} combo line(s)`);
  }

  if (comboResult.hasInfiniteCombo) {
    concernsOfficial.push('Includes infinite combo potential — may be too strong for casual tables');
  }

  if (turnWindow.earliestWinTurn !== null && turnWindow.earliestWinTurn <= 4) {
    concernsOfficial.push('Very fast win potential (≤ turn 4)');
  } else if (
    turnWindow.earliestWinTurn !== null &&
    turnWindow.earliestWinTurn >= 9
  ) {
    strengthsOfficial.push('Slower pacing — suitable for relaxed games');
  }

  // --- INFERRED (Deck Sage intelligence) ---

  if (metrics.speed >= 7) {
    strengthsInferred.push('Deck plays at a high speed');
  } else if (metrics.speed <= 3) {
    concernsInferred.push('Deck may be too slow to keep up');
  }

  if (metrics.consistency >= 7) {
    strengthsInferred.push('High consistency — reliable game plan');
  } else if (metrics.consistency <= 3) {
    concernsInferred.push('Low consistency — may struggle to find key pieces');
  }

  if (metrics.synergy >= 7) {
    strengthsInferred.push('Strong synergy between cards');
  } else if (metrics.synergy <= 3) {
    concernsInferred.push('Low synergy — cards may not work well together');
  }

  if (metrics.resilience >= 7) {
    strengthsInferred.push('Good resilience — can recover from disruption');
  } else if (metrics.resilience <= 3) {
    concernsInferred.push('Low resilience — vulnerable to removal');
  }

  if (metrics.interaction >= 6) {
    strengthsInferred.push('Solid interaction package');
  } else if (metrics.interaction <= 3) {
    concernsInferred.push('Limited interaction — may struggle to stop opponents');
  }

  if (metrics.finishPotential >= 7) {
    strengthsInferred.push('Strong ability to close out games');
  } else if (metrics.finishPotential <= 3) {
    concernsInferred.push('Weak finishing power');
  }

  if (metrics.manaQuality >= 7) {
    strengthsInferred.push('Efficient mana base');
  } else if (metrics.manaQuality <= 3) {
    concernsInferred.push('Mana base may be inconsistent');
  }

  return {
    strengths: {
      official: strengthsOfficial,
      inferred: strengthsInferred,
    },
    concerns: {
      official: concernsOfficial,
      inferred: concernsInferred,
    },
  };
}