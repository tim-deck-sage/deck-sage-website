import { CommanderBracketResult } from '../../types/commanderBracket';
import { DeckAnalysisResult } from './deckAnalysisCore';
import { buildSageNarrative } from './sageNarrativeBuilder';
import { SagePowerRatingResult } from './sagePowerRating';

export interface DeckIdentityResult {
  primary: string;
  secondary?: string;
}

export interface DeckReportNarrative {
  identity: DeckIdentityResult;
  deckIdentityDescription: string;
  whatSageSees: string;
  sagePowerExplanations: string[];
  ratingReasons: string[];
  strengths: string[];
  tableWarning?: string;
  concerns: {
    official: string[];
    inferred: string[];
  };
}

function identityCandidates(analysis: DeckAnalysisResult): {
  label: string;
  score: number;
}[] {
  const { inferred, metrics, comboResult } = analysis;

  return [
    {
      label: 'Aristocrats Engine',
      score:
        inferred.sacOutletCount +
        inferred.freeSacOutletCount * 2 +
        inferred.deathTriggerCount +
        inferred.damageOutletCount +
        Math.min(inferred.tokenMakerCount, 3),
    },
    {
      label: 'Token Swarm',
      score:
        inferred.tokenMakerCount * 2 +
        inferred.damageOutletCount +
        inferred.finisherCount +
        (metrics.synergy >= 7 ? 2 : 0),
    },
    {
      label: 'Graveyard Recursion',
      score:
        inferred.recursionCount * 2 +
        inferred.deathTriggerCount +
        inferred.valueEngineCount +
        (metrics.resilience >= 7 ? 2 : 0),
    },
    {
      label: 'Midrange Value',
      score:
        inferred.valueEngineCount * 2 +
        inferred.drawEngineCount +
        inferred.drawCount +
        inferred.removalCount +
        (metrics.interaction >= 6 ? 1 : 0),
    },
    {
      label: 'Spell Velocity',
      score:
        inferred.drawCount +
        inferred.tutorCount +
        inferred.costReducerCount +
        (metrics.speed >= 7 ? 2 : 0),
    },
    {
      label: 'Combo Engine',
      score:
        comboResult.comboCount * 3 +
        inferred.comboPieceCount +
        Math.floor(inferred.likelyComboDensity / 2) +
        (comboResult.hasInfiniteCombo ? 3 : 0),
    },
    {
      label: 'Combat Pressure',
      score:
        inferred.finisherCount * 2 +
        inferred.tokenMakerCount +
        inferred.fastManaCount +
        (metrics.finishPotential >= 7 ? 2 : 0),
    },
    {
      label: 'Control Strategy',
      score:
        inferred.removalCount +
        inferred.wipeCount * 2 +
        inferred.drawCount +
        (metrics.interaction >= 7 ? 2 : 0),
    },
    {
      label: 'Ramp & Big Threats',
      score:
        inferred.fastManaCount +
        inferred.manaPositiveCount +
        inferred.finisherCount * 2 +
        (metrics.manaQuality >= 7 ? 2 : 0),
    },
    {
      label: 'Blink Value',
      score:
        inferred.blinkCount * 3 +
        inferred.valueEngineCount +
        inferred.drawEngineCount,
    },
    {
      label: 'Sacrifice Engine',
      score:
        inferred.sacOutletCount * 2 +
        inferred.freeSacOutletCount * 2 +
        inferred.deathTriggerCount +
        inferred.damageOutletCount,
    },
  ].sort((a, b) => b.score - a.score);
}

function identifyDeck(analysis: DeckAnalysisResult): DeckIdentityResult {
  const candidates = identityCandidates(analysis);
  const primary = candidates[0];
  const secondary = candidates[1];

  if (!primary || primary.score < 4) {
    return { primary: 'Balanced Commander' };
  }

  if (
    secondary &&
    secondary.score >= 7 &&
    secondary.score >= primary.score - 2 &&
    secondary.label !== primary.label
  ) {
    return {
      primary: primary.label,
      secondary: secondary.label,
    };
  }

  return { primary: primary.label };
}

export function buildDeckReportNarrative(
  analysis: DeckAnalysisResult,
  sagePowerRating: SagePowerRatingResult,
  commanderBracket: CommanderBracketResult,
): DeckReportNarrative {
  const identity = identifyDeck(analysis);
  const sageNarrative = buildSageNarrative({
    analysis,
    sagePowerRating,
    commanderBracket,
    identity,
  });

  return {
    identity,
    deckIdentityDescription: sageNarrative.deckIdentityDescription,
    whatSageSees: sageNarrative.whatSageSees,
    sagePowerExplanations: sageNarrative.sagePowerExplanations,
    ratingReasons: sageNarrative.whySageRatedThisDeck,
    strengths: sageNarrative.strengths,
    tableWarning: sageNarrative.tableWarning,
    concerns: sageNarrative.concerns,
  };
}
