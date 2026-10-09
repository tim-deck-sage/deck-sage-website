// app/app/utils/commander/commanderBracketEvaluator.ts

import {
  CommanderBracket,
  CommanderBracketResult,
  BracketConfidence,
  COMMANDER_BRACKET_INFO,
} from '../../types/commanderBracket';

import { DeckAnalysisResult } from './deckAnalysisCore';

function clampBracket(value: number): CommanderBracket {
  if (value <= 1.5) return CommanderBracket.Exhibition;
  if (value <= 2.5) return CommanderBracket.Core;
  if (value <= 3.5) return CommanderBracket.Upgraded;
  if (value <= 4.5) return CommanderBracket.Optimized;
  return CommanderBracket.cEDH;
}

function getConfidence(score: number): { level: BracketConfidence; value: number } {
  if (score >= 0.75) return { level: 'high', value: score };
  if (score >= 0.5) return { level: 'medium', value: score };
  return { level: 'low', value: score };
}

export function evaluateCommanderBracket(
  analysis: DeckAnalysisResult,
): CommanderBracketResult {
  let bracketScore = 2.1; // conservative Core baseline

  const officialReasons: string[] = [];
  const inferredReasons: string[] = [];
  const warnings: string[] = [];

  const {
    gameChangerCount,
    comboResult,
    turnWindow,
    inferred,
  } = analysis;

  // --- OFFICIAL-STYLE SIGNALS ---
  // Quality metrics are intentionally excluded here. They belong to Sage Power.

  if (gameChangerCount >= 1 && gameChangerCount <= 3) {
    bracketScore += 0.45;
    officialReasons.push(`Contains ${gameChangerCount} Game Changer(s)`);
  }

  if (gameChangerCount > 3) {
    bracketScore += 1.0;
    officialReasons.push('Exceeds typical Game Changer limits');
  }

  if (comboResult.comboCount >= 1) {
    bracketScore += 0.35;
    officialReasons.push(`Detected ${comboResult.comboCount} combo(s)`);
  }

  if (comboResult.comboCount >= 3) {
    bracketScore += 0.25;
    officialReasons.push('Multiple combo lines detected');
  }

  if (comboResult.hasInfiniteCombo) {
    bracketScore += 0.75;
    officialReasons.push('Includes infinite combo potential');
  }

  if (turnWindow.earliestWinTurn !== null) {
    if (turnWindow.earliestWinTurn <= 3) {
      bracketScore += 1.4;
      officialReasons.push('Extremely fast win potential (turn 3 or earlier)');
    } else if (turnWindow.earliestWinTurn <= 4) {
      bracketScore += 0.9;
      officialReasons.push('Very fast win potential (turn 4 or earlier)');
    } else if (turnWindow.earliestWinTurn <= 6) {
      bracketScore += 0.35;
      officialReasons.push('Fast win potential (turn 6 or earlier)');
    }
  }

  if (turnWindow.stableWinTurn !== null) {
    if (turnWindow.stableWinTurn <= 4) {
      bracketScore += 0.9;
      officialReasons.push('Stable win window is very fast (turn 4 or earlier)');
    } else if (turnWindow.stableWinTurn <= 6) {
      bracketScore += 0.35;
      officialReasons.push('Stable win window is fast (turn 6 or earlier)');
    }
  }

  // --- EXISTING INFERRED BRACKET SUPPORT ---
  // These are support signals only. No new card tiering or tagging is added.

  if (inferred.fastManaCount >= 8) {
    bracketScore += 0.45;
    inferredReasons.push('High fast mana count');
  } else if (inferred.fastManaCount >= 5) {
    bracketScore += 0.25;
    inferredReasons.push('Meaningful fast mana count');
  }

  if (inferred.tutorCount >= 5) {
    bracketScore += 0.35;
    inferredReasons.push('High tutor count');
  } else if (inferred.tutorCount >= 3) {
    bracketScore += 0.2;
    inferredReasons.push('Meaningful tutor count');
  }

  if (inferred.likelyComboDensity >= 12) {
    bracketScore += 0.35;
    inferredReasons.push('High combo-piece density');
  } else if (inferred.likelyComboDensity >= 8) {
    bracketScore += 0.2;
    inferredReasons.push('Meaningful combo-piece density');
  }

  const bracketPressureSignals =
    (gameChangerCount > 0 ? 1 : 0) +
    (comboResult.comboCount > 0 ? 1 : 0) +
    (comboResult.hasInfiniteCombo ? 1 : 0) +
    ((turnWindow.earliestWinTurn ?? 99) <= 6 ? 1 : 0) +
    ((turnWindow.stableWinTurn ?? 99) <= 6 ? 1 : 0) +
    (inferred.fastManaCount >= 5 ? 1 : 0) +
    (inferred.tutorCount >= 3 ? 1 : 0) +
    (inferred.likelyComboDensity >= 8 ? 1 : 0);

  const cedhSignals =
    (gameChangerCount > 3 ? 1 : 0) +
    (comboResult.hasInfiniteCombo ? 1 : 0) +
    ((turnWindow.earliestWinTurn ?? 99) <= 4 ? 1 : 0) +
    ((turnWindow.stableWinTurn ?? 99) <= 5 ? 1 : 0) +
    (inferred.fastManaCount >= 8 ? 1 : 0) +
    (inferred.tutorCount >= 5 ? 1 : 0) +
    (comboResult.comboCount >= 3 ? 1 : 0);

  let finalBracket = clampBracket(bracketScore);

  if (finalBracket === CommanderBracket.cEDH && cedhSignals < 4) {
    finalBracket = CommanderBracket.Optimized;
    warnings.push('Deck showed some high-power signals, but not enough for cEDH classification.');
  }

  if (
    finalBracket === CommanderBracket.Optimized &&
    bracketPressureSignals < 2
  ) {
    finalBracket = CommanderBracket.Upgraded;
    warnings.push('Deck quality alone is not enough for Bracket 4 without stronger bracket pressure.');
  }

  if (
    finalBracket === CommanderBracket.Upgraded &&
    bracketPressureSignals === 0 &&
    bracketScore <= 3.2
  ) {
    finalBracket = CommanderBracket.Core;
  }

  let confidenceScore = 0.45;

  if (officialReasons.length >= 2) confidenceScore += 0.15;
  if (officialReasons.length >= 4) confidenceScore += 0.1;
  if (inferredReasons.length >= 2) confidenceScore += 0.08;
  if (cedhSignals >= 4 || bracketScore <= 2.5) confidenceScore += 0.1;

  if (confidenceScore > 1) confidenceScore = 1;

  const confidence = getConfidence(confidenceScore);

  return {
    bracket: finalBracket,
    bracketName: COMMANDER_BRACKET_INFO[finalBracket].label,
    confidence: confidence.level,
    confidenceScore: confidence.value,

    reasoning: {
      official: officialReasons,
      inferred: inferredReasons,
    },

    officialSignals: [],
    inferredSignals: [],

    scoreBreakdown: {
      officialPressure: officialReasons.length,
      inferredPressure: inferredReasons.length,
      finalScore: bracketScore,
    },

    estimatedEarliestWinTurn: turnWindow.earliestWinTurn,
    estimatedStableWinTurn: turnWindow.stableWinTurn,
    gameChangerCount,
    gameChangers: analysis.gameChangers,
    detectedCombos: analysis.comboResult.combos.map((c) => c.name),
    warnings,
  };
}
