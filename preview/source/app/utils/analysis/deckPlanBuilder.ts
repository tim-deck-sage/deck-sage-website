import {
  Archetype,
  CommanderSignals,
  DeckPlanProfile,
  DeckSignals,
} from '../../types/deckUpgrade';
import { uniqueStrings } from './deckUpgradeHelpers';

function pickPrimaryPlan(
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
): string {
  const topCommanderArchetype = commanderSignals.primaryArchetypes[0];
  const topDeckArchetype = deckSignals.archetypes[0];

  if (topCommanderArchetype && topCommanderArchetype === topDeckArchetype) {
    return topCommanderArchetype;
  }

  if (topCommanderArchetype) {
    return topCommanderArchetype;
  }

  if (topDeckArchetype) {
    return topDeckArchetype;
  }

  return 'midrange';
}

function pickSecondaryPlan(
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
  primaryPlan: string,
): string | undefined {
  const commanderSecondary = commanderSignals.primaryArchetypes.find(
    (archetype) => archetype !== primaryPlan,
  );

  if (commanderSecondary) return commanderSecondary;

  const deckSecondary = deckSignals.archetypes.find(
    (archetype) => archetype !== primaryPlan,
  );

  if (deckSecondary) return deckSecondary;

  return undefined;
}

function getWeakRoles(
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
): string[] {
  const weakRoles: string[] = [];
  const needs = deckSignals.structuralNeeds;

  if (needs.lands) weakRoles.push('lands');
  if (needs.ramp) weakRoles.push('ramp');
  if (needs.draw) weakRoles.push('draw');
  if (needs.removal) weakRoles.push('singleRemoval');
  if (needs.wipes) weakRoles.push('boardWipe');
  if (needs.protection) weakRoles.push('protection');
  if (needs.finishers) weakRoles.push('finisher');
  if (needs.synergy) weakRoles.push('synergy');

  if (commanderSignals.wantsTokens) {
    if (deckSignals.tokenMakerCount < 6) weakRoles.push('tokenMaker');
    if (deckSignals.tokenPayoffCount < 4) weakRoles.push('tokenPayoff');
  }

  if (commanderSignals.preferredCreatureType) {
    if (deckSignals.tribalPayoffCount < 5) weakRoles.push('tribalPayoff');
  }

  if (commanderSignals.wantsSacrifice && deckSignals.sacOutletCount < 2) {
    weakRoles.push('sacOutlet');
  }

  if (commanderSignals.wantsDeathTriggers && deckSignals.deathPayoffCount < 2) {
    weakRoles.push('deathPayoff');
  }

  if ((commanderSignals.wantsCombat || commanderSignals.wantsGoWide) && deckSignals.hasteEnablerCount < 2) {
    weakRoles.push('haste');
  }

  if (commanderSignals.comboFocus && deckSignals.comboPieceCount < 3) {
    weakRoles.push('combo');
  }

  return uniqueStrings(weakRoles);
}

function getSupportedRoles(
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
): string[] {
  const supported: string[] = [];

  if (deckSignals.rampCount >= 8) supported.push('ramp');
  if (deckSignals.drawCount >= 8) supported.push('draw');
  if (deckSignals.singleRemovalCount >= 5) supported.push('singleRemoval');
  if (deckSignals.boardWipeCount >= 2) supported.push('boardWipe');
  if (deckSignals.protectionCount >= 3) supported.push('protection');
  if (deckSignals.finisherCount >= 4) supported.push('finisher');
  if (deckSignals.synergyCount >= 10) supported.push('synergy');

  if (commanderSignals.wantsTokens) {
    if (deckSignals.tokenMakerCount >= 6) supported.push('tokenMaker');
    if (deckSignals.tokenPayoffCount >= 4) supported.push('tokenPayoff');
  }

  if (commanderSignals.preferredCreatureType && deckSignals.tribalPayoffCount >= 5) {
    supported.push('tribalPayoff');
  }

  if (commanderSignals.wantsSacrifice && deckSignals.sacOutletCount >= 2) {
    supported.push('sacOutlet');
  }

  if (commanderSignals.wantsDeathTriggers && deckSignals.deathPayoffCount >= 2) {
    supported.push('deathPayoff');
  }

  if ((commanderSignals.wantsCombat || commanderSignals.wantsGoWide) && deckSignals.hasteEnablerCount >= 2) {
    supported.push('haste');
  }

  if (commanderSignals.comboFocus && deckSignals.comboPieceCount >= 3) {
    supported.push('combo');
  }

  return uniqueStrings(supported);
}

function getOverloadedRoles(deckSignals: DeckSignals): string[] {
  const overloaded: string[] = [];

  if (deckSignals.creatureCount >= 30 && deckSignals.offPlanCount >= 8) {
    overloaded.push('creature');
  }

  if (deckSignals.finisherCount >= 8) {
    overloaded.push('finisher');
  }

  if (deckSignals.boardWipeCount >= 5) {
    overloaded.push('boardWipe');
  }

  if (deckSignals.protectionCount >= 7) {
    overloaded.push('protection');
  }

  if (deckSignals.rampCount >= 16) {
    overloaded.push('ramp');
  }

  if (deckSignals.drawCount >= 16) {
    overloaded.push('draw');
  }

  return uniqueStrings(overloaded);
}

function calculateShellConfidence(
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
): number {
  let score = 40;

  const preferredRoleHits = commanderSignals.preferredRoles.filter((role) => {
    if (role === 'tokenMaker') return deckSignals.tokenMakerCount >= 6;
    if (role === 'tokenPayoff') return deckSignals.tokenPayoffCount >= 4;
    if (role === 'tribalPayoff') return deckSignals.tribalPayoffCount >= 5;
    if (role === 'sacOutlet') return deckSignals.sacOutletCount >= 2;
    if (role === 'deathPayoff') return deckSignals.deathPayoffCount >= 2;
    if (role === 'haste') return deckSignals.hasteEnablerCount >= 2;
    if (role === 'combo') return deckSignals.comboPieceCount >= 3;
    if (role === 'draw') return deckSignals.drawCount >= 8;
    if (role === 'ramp') return deckSignals.rampCount >= 8;
    if (role === 'protection') return deckSignals.protectionCount >= 3;
    if (role === 'finisher') return deckSignals.finisherCount >= 4;
    return false;
  }).length;

  score += preferredRoleHits * 5;

  if (deckSignals.offPlanCount <= 4) score += 12;
  else if (deckSignals.offPlanCount <= 8) score += 6;
  else score -= 10;

  if (deckSignals.commanderSupportCount >= 10) score += 12;
  else if (deckSignals.commanderSupportCount >= 6) score += 6;
  else score -= 8;

  if (deckSignals.structuralNeeds.ramp) score -= 6;
  if (deckSignals.structuralNeeds.draw) score -= 6;
  if (deckSignals.structuralNeeds.removal) score -= 4;
  if (deckSignals.structuralNeeds.protection) score -= 4;
  if (deckSignals.structuralNeeds.finishers) score -= 4;
  if (deckSignals.structuralNeeds.synergy) score -= 8;

  return Math.max(0, Math.min(100, score));
}

function calculateSynergyScore(
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
): number {
  let score = 35;

  score += Math.min(deckSignals.synergyCount * 2, 20);
  score += Math.min(deckSignals.commanderSupportCount * 2, 20);

  if (commanderSignals.wantsTokens) {
    score += Math.min(deckSignals.tokenMakerCount * 2, 10);
    score += Math.min(deckSignals.tokenPayoffCount * 3, 12);
  }

  if (commanderSignals.preferredCreatureType) {
    score += Math.min(deckSignals.tribalPayoffCount * 3, 12);
  }

  if (commanderSignals.wantsSacrifice) {
    score += Math.min(deckSignals.sacOutletCount * 4, 12);
  }

  if (commanderSignals.comboFocus) {
    score += Math.min(deckSignals.comboPieceCount * 4, 12);
  }

  score -= Math.min(deckSignals.offPlanCount * 2, 20);

  return Math.max(0, Math.min(100, score));
}

function buildSummaryNotes(
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
  weakRoles: string[],
  supportedRoles: string[],
): string[] {
  const notes: string[] = [];

  if (commanderSignals.preferredCreatureType) {
    notes.push(`commander appears to prefer ${commanderSignals.preferredCreatureType} support`);
  }

  if (commanderSignals.wantsTokens) {
    notes.push('commander plan leans toward token production and payoff scaling');
  }

  if (commanderSignals.wantsSacrifice) {
    notes.push('commander plan values sacrifice lines or death conversion');
  }

  if (commanderSignals.comboFocus) {
    notes.push('commander has combo-oriented ceiling potential');
  }

  if (deckSignals.offPlanCount > deckSignals.onPlanCount / 3) {
    notes.push('deck contains a noticeable number of off-plan cards relative to the commander shell');
  }

  if (supportedRoles.length >= 5) {
    notes.push('deck already has a meaningful core of supported structural roles');
  }

  if (weakRoles.length >= 4) {
    notes.push('deck still has multiple structural gaps preventing the shell from running smoothly');
  }

  if (deckSignals.structuralNeeds.lands) {
    notes.push('mana base appears a little light for the current curve');
  }

  if (deckSignals.structuralNeeds.draw) {
    notes.push('card advantage density looks below target for a Commander deck');
  }

  if (deckSignals.structuralNeeds.ramp) {
    notes.push('mana acceleration density looks below target for the current plan');
  }

  return uniqueStrings(notes);
}

export function buildDeckPlanProfile(
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
): DeckPlanProfile {
  const primaryPlan = pickPrimaryPlan(commanderSignals, deckSignals);
  const secondaryPlan = pickSecondaryPlan(commanderSignals, deckSignals, primaryPlan);

  const weakRoles = getWeakRoles(commanderSignals, deckSignals);
  const supportedRoles = getSupportedRoles(commanderSignals, deckSignals);
  const overloadedRoles = getOverloadedRoles(deckSignals);

  const shellConfidence = calculateShellConfidence(commanderSignals, deckSignals);
  const synergyScore = calculateSynergyScore(commanderSignals, deckSignals);

  const summaryNotes = buildSummaryNotes(
    commanderSignals,
    deckSignals,
    weakRoles,
    supportedRoles,
  );

  return {
    commanderName: commanderSignals.commanderName,
    colors: commanderSignals.colors,
    primaryPlan,
    secondaryPlan,
    archetypes: uniqueStrings([
      ...commanderSignals.primaryArchetypes,
      ...deckSignals.archetypes,
    ]) as Archetype[],
    preferredCreatureType: commanderSignals.preferredCreatureType,
    shellConfidence,
    synergyScore,
    commanderReliance: commanderSignals.commanderReliance,
    comboFocus: commanderSignals.comboFocus,
    supportedRoles,
    weakRoles,
    overloadedRoles,
    structuralNeeds: deckSignals.structuralNeeds,
    summaryNotes,
  };
}
