import {
  DeckMismatch,
  DeckPlanProfile,
  DeckSignals,
  StructuralNeeds,
} from '../../types/deckUpgrade';
import { uniqueStrings } from './deckUpgradeHelpers';

export function getWeaknessLabels(needs: StructuralNeeds): string[] {
  const labels: string[] = [];

  if (needs.lands) labels.push('low land count');
  if (needs.ramp) labels.push('low ramp count');
  if (needs.draw) labels.push('low card draw');
  if (needs.removal) labels.push('low single-target removal');
  if (needs.wipes) labels.push('low board wipe count');
  if (needs.protection) labels.push('low protection');
  if (needs.finishers) labels.push('low finisher density');
  if (needs.synergy) labels.push('low synergy density');

  return labels;
}

function buildStructuralMismatches(
  planProfile: DeckPlanProfile,
  deckSignals: DeckSignals,
): DeckMismatch[] {
  const mismatches: DeckMismatch[] = [];
  const needs = deckSignals.structuralNeeds;

  if (needs.lands) {
    mismatches.push({
      id: 'low-lands',
      label: 'Low land count',
      reason: `The deck appears to have only about ${needs.totalLandCount} lands, which is light for its current curve.`,
      severity: 9,
      relatedRoles: ['lands', 'ramp'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (needs.ramp) {
    mismatches.push({
      id: 'low-ramp',
      label: 'Low ramp density',
      reason: `The deck appears to have about ${needs.rampPieces} ramp pieces, which is below the usual target for Commander.`,
      severity: 8,
      relatedRoles: ['ramp'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (needs.draw) {
    mismatches.push({
      id: 'low-draw',
      label: 'Low card draw',
      reason: `The deck appears to have about ${needs.drawPieces} draw pieces, which may cause the shell to stall out.`,
      severity: 8,
      relatedRoles: ['draw'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (needs.removal) {
    mismatches.push({
      id: 'low-removal',
      label: 'Low spot removal',
      reason: `The deck appears to have about ${needs.singleRemovalCount} single-target interaction pieces, which is light for a multiplayer environment.`,
      severity: 6,
      relatedRoles: ['singleRemoval'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (needs.wipes) {
    mismatches.push({
      id: 'low-wipes',
      label: 'Low board wipe count',
      reason: `The deck appears to have about ${needs.boardWipeCount} board wipes, which may make it harder to recover from opposing board development.`,
      severity: 5,
      relatedRoles: ['boardWipe'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (needs.protection) {
    mismatches.push({
      id: 'low-protection',
      label: 'Low protection',
      reason: `The shell appears light on protection, with only about ${needs.protectionCount} cards helping key pieces survive interaction.`,
      severity: planProfile.commanderReliance === 'high' ? 9 : 6,
      relatedRoles: ['protection'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (needs.finishers) {
    mismatches.push({
      id: 'low-finishers',
      label: 'Low finisher density',
      reason: `The deck appears to have about ${needs.finisherCount} real finishers, which may leave it good at developing but weak at closing.`,
      severity: 6,
      relatedRoles: ['finisher'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (needs.synergy) {
    mismatches.push({
      id: 'low-synergy',
      label: 'Low synergy density',
      reason: `The shell still looks light on tightly aligned synergy pieces for the commander plan.`,
      severity: 9,
      relatedRoles: ['synergy'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  return mismatches;
}

function buildPlanSpecificMismatches(
  planProfile: DeckPlanProfile,
  deckSignals: DeckSignals,
): DeckMismatch[] {
  const mismatches: DeckMismatch[] = [];

  if (planProfile.weakRoles.includes('tokenMaker')) {
    mismatches.push({
      id: 'low-token-makers',
      label: 'Too few token makers',
      reason: `This shell appears to want token production, but only has about ${deckSignals.tokenMakerCount} reliable token makers.`,
      severity: 9,
      relatedRoles: ['tokenMaker'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.weakRoles.includes('tokenPayoff')) {
    mismatches.push({
      id: 'low-token-payoffs',
      label: 'Too few token payoffs',
      reason: `The deck can generate some board presence, but appears to be light on cards that convert creature volume into wins.`,
      severity: 9,
      relatedRoles: ['tokenPayoff', 'finisher'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.weakRoles.includes('tribalPayoff')) {
    mismatches.push({
      id: 'low-tribal-payoffs',
      label: 'Too few tribal payoffs',
      reason: `The commander plan appears tribe-oriented, but the deck still looks light on true tribal payoff density.`,
      severity: 8,
      relatedRoles: ['tribalPayoff', 'synergy'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.weakRoles.includes('sacOutlet')) {
    mismatches.push({
      id: 'low-sac-outlets',
      label: 'Too few sacrifice outlets',
      reason: `The shell appears to want sacrifice lines, but it does not yet have enough sac outlets to support them reliably.`,
      severity: 9,
      relatedRoles: ['sacOutlet'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.weakRoles.includes('deathPayoff')) {
    mismatches.push({
      id: 'low-death-payoffs',
      label: 'Too few death payoffs',
      reason: `The deck shows signs of caring about creatures dying, but it still looks light on cards that reward those lines.`,
      severity: 7,
      relatedRoles: ['deathPayoff'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.weakRoles.includes('haste')) {
    mismatches.push({
      id: 'low-haste',
      label: 'Low haste access',
      reason: `This shell appears to benefit from immediate board impact, but haste support is still below target.`,
      severity: planProfile.commanderReliance === 'high' ? 9 : 7,
      relatedRoles: ['haste', 'protection'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.weakRoles.includes('combo')) {
    mismatches.push({
      id: 'low-combo-density',
      label: 'Low combo support density',
      reason: `The commander profile suggests combo potential, but the current shell is still light on supporting combo pieces.`,
      severity: 8,
      relatedRoles: ['combo', 'synergy'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  return mismatches;
}

function buildOverloadMismatches(
  planProfile: DeckPlanProfile,
  deckSignals: DeckSignals,
): DeckMismatch[] {
  const mismatches: DeckMismatch[] = [];

  if (planProfile.overloadedRoles.includes('creature')) {
    mismatches.push({
      id: 'too-many-low-impact-creatures',
      label: 'Too many low-impact creatures',
      reason: `The deck appears creature-heavy, and some of that density likely comes from cards that do not strongly support the commander plan.`,
      severity: 7,
      relatedRoles: ['creature', 'synergy'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.overloadedRoles.includes('finisher')) {
    mismatches.push({
      id: 'too-many-finishers',
      label: 'Too many finishers',
      reason: `The deck appears to have more finishers than the rest of the shell can currently support consistently.`,
      severity: 5,
      relatedRoles: ['finisher'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.overloadedRoles.includes('boardWipe')) {
    mismatches.push({
      id: 'too-many-board-wipes',
      label: 'Too many board wipes',
      reason: `The deck appears heavy on wipes relative to its other structural roles, which may reduce pressure or internal synergy.`,
      severity: 4,
      relatedRoles: ['boardWipe'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.overloadedRoles.includes('protection')) {
    mismatches.push({
      id: 'too-much-protection',
      label: 'Too much protection',
      reason: `The shell appears to be devoting a large number of slots to protection compared to its actual plan development needs.`,
      severity: 3,
      relatedRoles: ['protection'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.overloadedRoles.includes('ramp')) {
    mismatches.push({
      id: 'too-much-ramp',
      label: 'Too much ramp',
      reason: `The deck appears heavy on ramp relative to the rest of its shell quality, suggesting some mana pieces may be replaceable.`,
      severity: 3,
      relatedRoles: ['ramp'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.overloadedRoles.includes('draw')) {
    mismatches.push({
      id: 'too-much-draw',
      label: 'Too much draw',
      reason: `The shell appears very dense in draw effects relative to its other needs, which can create replaceable redundancy.`,
      severity: 3,
      relatedRoles: ['draw'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (deckSignals.offPlanCount >= 8) {
    mismatches.push({
      id: 'off-plan-density',
      label: 'Too many off-plan cards',
      reason: `The deck appears to contain about ${deckSignals.offPlanCount} cards that do not strongly align with the commander’s preferred shell.`,
      severity: 9,
      relatedRoles: ['synergy'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  return mismatches;
}

function buildConfidenceMismatches(
  planProfile: DeckPlanProfile,
  deckSignals: DeckSignals,
): DeckMismatch[] {
  const mismatches: DeckMismatch[] = [];

  if (planProfile.shellConfidence < 45) {
    mismatches.push({
      id: 'low-shell-confidence',
      label: 'Low shell confidence',
      reason: `The current deck only loosely matches the commander plan, suggesting the shell still needs stronger structural alignment.`,
      severity: 9,
      relatedRoles: ['synergy', 'plan fit'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (planProfile.synergyScore < 45) {
    mismatches.push({
      id: 'low-synergy-score',
      label: 'Low overall synergy score',
      reason: `The deck has some plan signals, but overall synergy density still looks below where the shell wants to be.`,
      severity: 8,
      relatedRoles: ['synergy'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  if (deckSignals.commanderSupportCount < 6) {
    mismatches.push({
      id: 'low-commander-support',
      label: 'Low commander support density',
      reason: `The deck appears light on cards that directly reinforce what the commander is trying to do.`,
      severity: 8,
      relatedRoles: ['synergy', 'commander support'],
      affectedPlan: planProfile.primaryPlan,
    });
  }

  return mismatches;
}

export function detectDeckMismatches(
  planProfile: DeckPlanProfile,
  deckSignals: DeckSignals,
): DeckMismatch[] {
  const mismatches = [
    ...buildStructuralMismatches(planProfile, deckSignals),
    ...buildPlanSpecificMismatches(planProfile, deckSignals),
    ...buildOverloadMismatches(planProfile, deckSignals),
    ...buildConfidenceMismatches(planProfile, deckSignals),
  ];

  const deduped = mismatches.filter((mismatch, index, arr) => {
    return index === arr.findIndex((other) => other.id === mismatch.id);
  });

  return deduped
    .map((mismatch) => ({
      ...mismatch,
      relatedRoles: uniqueStrings(mismatch.relatedRoles),
    }))
    .sort((a, b) => b.severity - a.severity);
}