import { DeckAnalysisResult } from './deckAnalysisCore';

export type SagePowerConfidence = 'low' | 'medium' | 'high';

export interface SagePowerRatingResult {
  score: number;
  label: string;
  confidence: SagePowerConfidence;
  explanations: string[];
  dimensionScores: {
    speed: number;
    consistency: number;
    synergy: number;
    resilience: number;
    interaction: number;
    finishPotential: number;
    manaQuality: number;
    engineDensity: number;
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(10, value));
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function getLabel(score: number): string {
  if (score >= 9) return 'Very High Power';
  if (score >= 8) return 'High Power';
  if (score >= 6.5) return 'Strong';
  if (score >= 5) return 'Tuned';
  if (score >= 3.5) return 'Focused Casual';
  return 'Casual';
}

function getConfidence(analysis: DeckAnalysisResult): SagePowerConfidence {
  const cardCount = analysis.rawCards.length;
  let confidenceScore = 0.45;

  if (cardCount >= 90) {
    confidenceScore += 0.25;
  } else if (cardCount >= 60) {
    confidenceScore += 0.12;
  }

  if (analysis.taggedCards.length >= cardCount && cardCount > 0) {
    confidenceScore += 0.08;
  }

  if (
    analysis.comboResult.comboCount > 0 ||
    analysis.inferred.likelyEngineDensity >= 8
  ) {
    confidenceScore += 0.08;
  }

  if (analysis.inferred.drawCount + analysis.inferred.removalCount > 0) {
    confidenceScore += 0.05;
  }

  if (confidenceScore >= 0.75) return 'high';
  if (confidenceScore >= 0.55) return 'medium';
  return 'low';
}

function buildExplanations(
  analysis: DeckAnalysisResult,
  score: number,
  engineDensity: number,
): string[] {
  const { metrics, inferred } = analysis;
  const explanations: string[] = [];

  if (metrics.consistency >= 7) {
    explanations.push('Strong consistency from card flow, tutors, or redundant support pieces.');
  }

  if (metrics.speed >= 7) {
    explanations.push('Fast development pressure from acceleration and engine support.');
  }

  if (metrics.synergy >= 7) {
    explanations.push('Connected synergy package gives the deck a clear game plan.');
  }

  if (metrics.finishPotential >= 7) {
    explanations.push('Reliable finish potential from payoffs, engines, or combo pieces.');
  }

  if (metrics.interaction >= 7) {
    explanations.push('Interaction suite is strong enough to contest opposing plans.');
  }

  if (metrics.resilience >= 7) {
    explanations.push('Protection, recursion, or value engines help the deck recover.');
  }

  if (metrics.manaQuality >= 7) {
    explanations.push('Mana quality supports efficient sequencing.');
  }

  if (engineDensity >= 7) {
    explanations.push('High engine density increases repeatable pressure over a game.');
  }

  if (analysis.comboResult.comboCount > 0) {
    explanations.push(`Detected ${analysis.comboResult.comboCount} combo line(s) that raise danger level.`);
  }

  if (explanations.length === 0) {
    if (score >= 5) {
      explanations.push('Balanced fundamentals produce a playable but not extreme power profile.');
    } else {
      explanations.push('Current list shows limited speed, consistency, and finishing pressure.');
    }
  }

  if (inferred.drawCount <= 3 && metrics.consistency < 5) {
    explanations.push('Low card flow limits consistency.');
  }

  return explanations.slice(0, 4);
}

export function evaluateSagePowerRating(
  analysis: DeckAnalysisResult,
): SagePowerRatingResult {
  const { metrics, inferred } = analysis;
  const engineDensity = clamp(inferred.likelyEngineDensity * 0.45);

  const weightedScore =
    metrics.speed * 0.15 +
    metrics.consistency * 0.18 +
    metrics.synergy * 0.14 +
    metrics.resilience * 0.1 +
    metrics.interaction * 0.12 +
    metrics.finishPotential * 0.13 +
    metrics.manaQuality * 0.1 +
    engineDensity * 0.08;

  const score = roundToTenth(clamp(weightedScore));

  return {
    score,
    label: getLabel(score),
    confidence: getConfidence(analysis),
    explanations: buildExplanations(analysis, score, engineDensity),
    dimensionScores: {
      speed: metrics.speed,
      consistency: metrics.consistency,
      synergy: metrics.synergy,
      resilience: metrics.resilience,
      interaction: metrics.interaction,
      finishPotential: metrics.finishPotential,
      manaQuality: metrics.manaQuality,
      engineDensity: roundToTenth(engineDensity),
    },
  };
}
