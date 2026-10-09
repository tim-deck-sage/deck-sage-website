import {
  CardRole,
  CommanderSignals,
  CutScore,
  DeckCard,
  DeckForUpgrade,
  DeckPlanProfile,
  DeckSignals,
  SuggestedCutResult,
  NO_SPECIFIC_CUT_FOUND,
} from '../../types/deckUpgrade';
import {
  normalizeName,
  resolveExactLoadedDeckCard,
} from './deckUpgradeHelpers';
import {
  getCardRoles,
  isCreature,
  isLand,
} from './cardRoleClassifier';

function hasRole(roles: CardRole[], role: CardRole): boolean {
  return roles.includes(role);
}

export function isLikelyCoreSupport(
  card: DeckCard,
  commanderSignals: CommanderSignals,
  planProfile: DeckPlanProfile,
): boolean {
  const cardName = normalizeName(card.name);
  const commanderName = normalizeName(commanderSignals.commanderName);
  const text = `${card.typeLine || ''} ${card.oracleText || ''}`.toLowerCase();
  const roles = getCardRoles(card, planProfile.archetypes, commanderSignals);

  if (cardName === commanderName) return true;
  if (cardName === 'sol ring') return true;
  if (cardName === 'arcane signet') return true;
  if (cardName === 'lightning greaves') return true;
  if (cardName === 'swiftfoot boots') return true;

  if (planProfile.commanderReliance === 'high') {
    if (roles.includes('protection') || roles.includes('haste')) return true;
  }

  if (roles.includes('combo') && planProfile.comboFocus) return true;

  if (commanderSignals.preferredCreatureType) {
    const tribe = commanderSignals.preferredCreatureType.toLowerCase();

    if (
      text.includes(tribe) &&
      (
        roles.includes('tribalPayoff') ||
        roles.includes('tokenMaker') ||
        roles.includes('tokenPayoff') ||
        roles.includes('haste')
      )
    ) {
      return true;
    }
  }

  if (commanderSignals.wantsTokens) {
    if (
      roles.includes('tokenMaker') ||
      roles.includes('tokenPayoff')
    ) {
      return true;
    }
  }

  if (commanderSignals.wantsSacrifice) {
    if (roles.includes('sacOutlet')) return true;
  }

  if (commanderSignals.wantsDeathTriggers) {
    if (roles.includes('deathPayoff')) return true;
  }

  return false;
}

export function isCardClearlyOffPlan(
  card: DeckCard,
  commanderSignals: CommanderSignals,
  planProfile: DeckPlanProfile,
): boolean {
  const roles = getCardRoles(card, planProfile.archetypes, commanderSignals);
  const text = `${card.typeLine || ''} ${card.oracleText || ''}`.toLowerCase();

  if (roles.length === 0) return true;

  const supportedRoles = new Set(planProfile.supportedRoles);
  const weakRoles = new Set(planProfile.weakRoles);

  const contributesToPlan = roles.some((role) => supportedRoles.has(role) || weakRoles.has(role));

  if (contributesToPlan) return false;

  if (roles.includes('ramp')) return false;
  if (roles.includes('draw')) return false;
  if (roles.includes('singleRemoval')) return false;
  if (roles.includes('boardWipe')) return false;
  if (roles.includes('protection')) return false;
  if (roles.includes('finisher')) return false;
  if (roles.includes('synergy')) return false;

  if (commanderSignals.preferredCreatureType) {
    const isPreferredTribeCard = text.includes(commanderSignals.preferredCreatureType.toLowerCase());

    const supportsPreferredPlan =
      roles.includes('tokenMaker') ||
      roles.includes('tokenPayoff') ||
      roles.includes('sacOutlet') ||
      roles.includes('deathPayoff') ||
      roles.includes('draw') ||
      roles.includes('ramp') ||
      roles.includes('protection') ||
      roles.includes('haste') ||
      roles.includes('finisher') ||
      roles.includes('combo');

    if (!isPreferredTribeCard && !supportsPreferredPlan && isCreature(card)) {
      return true;
    }
  }

  if (commanderSignals.wantsTokens || commanderSignals.wantsGoWide) {
    const contributesToWidePlan =
      roles.includes('tokenMaker') ||
      roles.includes('tokenPayoff') ||
      roles.includes('draw') ||
      roles.includes('ramp') ||
      roles.includes('protection') ||
      roles.includes('finisher') ||
      roles.includes('combo') ||
      roles.includes('sacOutlet') ||
      roles.includes('haste');

    if (!contributesToWidePlan && isCreature(card) && (card.cmc ?? 0) >= 5) {
      return true;
    }
  }

  if (commanderSignals.wantsSacrifice) {
    const supportsSacrificePlan =
      roles.includes('sacOutlet') ||
      roles.includes('deathPayoff') ||
      roles.includes('tokenMaker') ||
      roles.includes('draw') ||
      roles.includes('finisher') ||
      roles.includes('combo');

    if (!supportsSacrificePlan && isCreature(card) && (card.cmc ?? 0) >= 4) {
      return true;
    }
  }

  return false;
}

export function getCardRoleScore(
  card: DeckCard,
  commanderSignals: CommanderSignals,
  planProfile: DeckPlanProfile,
): number {
  let score = 0;
  const roles = getCardRoles(card, planProfile.archetypes, commanderSignals);

  if (hasRole(roles, 'ramp')) score += 3;
  if (hasRole(roles, 'draw')) score += 3;
  if (hasRole(roles, 'singleRemoval')) score += 3;
  if (hasRole(roles, 'boardWipe')) score += 4;
  if (hasRole(roles, 'protection')) score += 4;
  if (hasRole(roles, 'finisher')) score += 3;
  if (hasRole(roles, 'synergy')) score += 3;
  if (hasRole(roles, 'tokenMaker')) score += 3;
  if (hasRole(roles, 'tokenPayoff')) score += 4;
  if (hasRole(roles, 'tribalPayoff')) score += 4;
  if (hasRole(roles, 'combo')) score += 4;
  if (hasRole(roles, 'sacOutlet')) score += 4;
  if (hasRole(roles, 'deathPayoff')) score += 2;
  if (hasRole(roles, 'haste')) score += 4;

  if (
    commanderSignals.preferredCreatureType &&
    hasRole(roles, 'tribalPayoff')
  ) {
    score += 2;
  }

  if (planProfile.comboFocus && hasRole(roles, 'combo')) score += 3;
  if (planProfile.comboFocus && hasRole(roles, 'sacOutlet')) score += 2;

  if (
    roles.some((role) => planProfile.supportedRoles.includes(role)) ||
    roles.some((role) => planProfile.weakRoles.includes(role))
  ) {
    score += 2;
  }

  return score;
}

export function getCutReason(
  card: DeckCard,
  commanderSignals: CommanderSignals,
  planProfile: DeckPlanProfile,
): string {
  const roles = getCardRoles(card, planProfile.archetypes, commanderSignals);
  const cmc = card.cmc ?? 0;

  if (isCardClearlyOffPlan(card, commanderSignals, planProfile)) {
    return 'This real card appears to fit the commander plan less cleanly than the proposed upgrade.';
  }

  if (cmc >= 6 && roles.length <= 1 && !roles.includes('finisher')) {
    return 'This real card looks expensive for its actual impact in the current shell.';
  }

  if (
    !roles.includes('ramp') &&
    !roles.includes('draw') &&
    !roles.includes('singleRemoval') &&
    !roles.includes('boardWipe') &&
    !roles.includes('protection') &&
    !roles.includes('finisher') &&
    !roles.includes('synergy')
  ) {
    return 'This real card appears to contribute less to the deck’s main plan than the proposed upgrade.';
  }

  if (isCreature(card) && !isLikelyCoreSupport(card, commanderSignals, planProfile)) {
    return 'This real creature looks more replaceable than the deck’s stronger synergy and engine pieces.';
  }

  return 'This real card looks more replaceable than the deck’s stronger synergy and role-support pieces.';
}

export function scoreLoadedCardAsCut(
  card: DeckCard,
  deck: DeckForUpgrade,
  commanderSignals: CommanderSignals,
  planProfile: DeckPlanProfile,
  deckSignals: DeckSignals,
): CutScore {
  let score = 0;
  const reasons: string[] = [];
  const roles = getCardRoles(card, planProfile.archetypes, commanderSignals);
  const name = normalizeName(card.name);
  const commanderName = normalizeName(deck.commander);

  if (isLand(card)) {
    score += 1000;
    reasons.push('lands are protected from normal cut logic');
  }

  if (name === commanderName) {
    score += 10000;
    reasons.push('commander cannot be cut');
  }

  if (isLikelyCoreSupport(card, commanderSignals, planProfile)) {
    score += 500;
    reasons.push('card looks like a core shell piece');
  }

  const roleValue = getCardRoleScore(card, commanderSignals, planProfile);
  score += roleValue * 8;

  if (roles.includes('ramp') && deckSignals.rolePressure.ramp <= 8) {
    score += 20;
    reasons.push('deck is not rich in ramp');
  }

  if (roles.includes('draw') && deckSignals.rolePressure.draw <= 8) {
    score += 20;
    reasons.push('deck is not rich in draw');
  }

  if (
    (roles.includes('singleRemoval') || roles.includes('boardWipe')) &&
    deckSignals.rolePressure.removal <= 6
  ) {
    score += 18;
    reasons.push('interaction count is not high enough to trim this lightly');
  }

  if (roles.includes('protection') && deckSignals.rolePressure.protection <= 3) {
    score += 24;
    reasons.push('protection is too important to trim casually');
  }

  if (roles.includes('tokenMaker') && deckSignals.rolePressure.tokenMakers <= 6) {
    score += 18;
    reasons.push('token production is still a structural need');
  }

  if (roles.includes('tokenPayoff') && deckSignals.rolePressure.tokenPayoffs <= 4) {
    score += 18;
    reasons.push('token payoff count is still developing');
  }

  if (roles.includes('haste') && deckSignals.rolePressure.hasteEnablers <= 2) {
    score += 20;
    reasons.push('haste access is premium in this shell');
  }

  if (roles.includes('sacOutlet') && deckSignals.rolePressure.sacOutlets <= 2) {
    score += 24;
    reasons.push('sacrifice outlets are high-value glue pieces here');
  }

  if (roles.includes('combo') && planProfile.comboFocus) {
    score += 30;
    reasons.push('combo support is a core part of the commander ceiling');
  }

  if (isCardClearlyOffPlan(card, commanderSignals, planProfile)) {
    score -= 40;
    reasons.push('card looks off-plan for the commander shell');
  }

  if (
    isCreature(card) &&
    !roles.includes('synergy') &&
    !roles.includes('finisher') &&
    !roles.includes('tokenMaker') &&
    !roles.includes('tokenPayoff') &&
    !roles.includes('tribalPayoff') &&
    !roles.includes('combo')
  ) {
    score -= 16;
    reasons.push('creature seems low-synergy relative to the shell');
  }

  if ((card.cmc ?? 0) >= 6 && !roles.includes('finisher') && !roles.includes('combo')) {
    score -= 14;
    reasons.push('high mana cost without matching payoff');
  }

  if (
    planProfile.overloadedRoles.includes('finisher') &&
    roles.includes('finisher') &&
    !isLikelyCoreSupport(card, commanderSignals, planProfile)
  ) {
    score -= 10;
    reasons.push('deck appears dense in finishers, making this slot more replaceable');
  }

  if (
    planProfile.overloadedRoles.includes('draw') &&
    roles.includes('draw') &&
    !planProfile.weakRoles.includes('draw')
  ) {
    score -= 8;
    reasons.push('deck appears dense in draw effects');
  }

  if (
    planProfile.overloadedRoles.includes('ramp') &&
    roles.includes('ramp') &&
    !planProfile.weakRoles.includes('ramp')
  ) {
    score -= 8;
    reasons.push('deck appears dense in ramp effects');
  }

  return {
    card,
    score,
    reasons,
  };
}

export function getRealCutCandidates(
  deck: DeckForUpgrade,
  commanderSignals: CommanderSignals,
  planProfile: DeckPlanProfile,
  deckSignals: DeckSignals,
): CutScore[] {
  return [...deck.cards]
    .filter((card) => !isLand(card))
    .map((card) =>
      scoreLoadedCardAsCut(card, deck, commanderSignals, planProfile, deckSignals),
    )
    .sort((a, b) => a.score - b.score);
}

export function finalizeSuggestedCut(
  deck: DeckForUpgrade,
  cut: SuggestedCutResult,
): SuggestedCutResult {
  if (!cut.card) {
    return {
      name: NO_SPECIFIC_CUT_FOUND,
      reason: cut.reason || 'No safe real-card cut was found in the current deck list.',
    };
  }

  const exactLoadedCard = resolveExactLoadedDeckCard(deck, cut.card);

  if (!exactLoadedCard) {
    return {
      name: NO_SPECIFIC_CUT_FOUND,
      reason: 'The proposed cut could not be validated against the exact loaded deck payload.',
    };
  }

  return {
    name: exactLoadedCard.name,
    reason: cut.reason,
    card: exactLoadedCard,
  };
}

export function pickSuggestedCut(
  deck: DeckForUpgrade,
  commanderSignals: CommanderSignals,
  planProfile: DeckPlanProfile,
  deckSignals: DeckSignals,
  usedCuts: Set<string>,
  deckStatus: 'under' | 'exact' | 'over',
): SuggestedCutResult {
  if (deckStatus === 'under') {
    return {
      name: NO_SPECIFIC_CUT_FOUND,
      reason: 'This deck is currently under 100 cards, so cuts are being skipped in favor of additions.',
    };
  }

  const candidates = getRealCutCandidates(
    deck,
    commanderSignals,
    planProfile,
    deckSignals,
  );

  for (const candidate of candidates) {
    const normalized = normalizeName(candidate.card.name);

    if (usedCuts.has(normalized)) continue;
    if (isLikelyCoreSupport(candidate.card, commanderSignals, planProfile)) continue;

    usedCuts.add(normalized);

    return {
      name: candidate.card.name,
      reason: getCutReason(candidate.card, commanderSignals, planProfile),
      card: candidate.card,
    };
  }

  return {
    name: NO_SPECIFIC_CUT_FOUND,
    reason: 'No safe real-card cut was found in the current deck list.',
  };
}