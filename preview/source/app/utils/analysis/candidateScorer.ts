import {
  CandidateScore,
  CommanderSignals,
  DeckForUpgrade,
  DeckMismatch,
  DeckPlanProfile,
  DeckSignals,
  RecommendationPoolCard,
  UpgradeExplanation,
  UpgradeGoal,
  UpgradePlayStyle,
} from '../../types/deckUpgrade';
import { searchProviderRecommendationCandidates } from '../data/providerCardSearch';
import { buildDeckNameSet, normalizeName, uniqueStrings } from './deckUpgradeHelpers';

export function colorsAreCompatible(
  candidateColors: string[],
  commanderColors: string[],
): boolean {
  if (candidateColors.length === 0) return true;
  if (candidateColors.every((c) => c === 'C')) return true;
  if (commanderColors.length === 1 && commanderColors[0] === 'C') {
    return candidateColors.every((c) => c === 'C');
  }

  return candidateColors.every((c) => commanderColors.includes(c));
}

function getMismatchBoost(
  candidate: RecommendationPoolCard,
  mismatches: DeckMismatch[],
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  for (const mismatch of mismatches) {
    const roles = mismatch.relatedRoles;

    if (candidate.roles.some((role) => roles.includes(role))) {
      score += mismatch.severity * 3;
      reasons.push(`helps solve: ${mismatch.label.toLowerCase()}`);
    }

    if (
      mismatch.id === 'low-token-makers' &&
      candidate.roles.includes('tokenMaker')
    ) {
      score += 10;
    }

    if (
      mismatch.id === 'low-token-payoffs' &&
      (candidate.roles.includes('tokenPayoff') || candidate.roles.includes('finisher'))
    ) {
      score += 10;
    }

    if (
      mismatch.id === 'low-tribal-payoffs' &&
      candidate.roles.includes('tribalPayoff')
    ) {
      score += 10;
    }

    if (
      mismatch.id === 'low-sac-outlets' &&
      candidate.roles.includes('sacOutlet')
    ) {
      score += 10;
    }

    if (
      mismatch.id === 'low-death-payoffs' &&
      candidate.roles.includes('deathPayoff')
    ) {
      score += 10;
    }

    if (
      mismatch.id === 'low-haste' &&
      candidate.roles.includes('haste')
    ) {
      score += 10;
    }

    if (
      mismatch.id === 'low-combo-density' &&
      candidate.roles.includes('combo')
    ) {
      score += 10;
    }
  }

  return {
    score,
    reasons: uniqueStrings(reasons),
  };
}

function getCommanderFitBoost(
  candidate: RecommendationPoolCard,
  commanderSignals: CommanderSignals,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (candidate.tags.some((tag) => commanderSignals.primaryArchetypes.includes(tag))) {
    score += 20;
    reasons.push('matches the commander’s main strategy');
  }

  if (candidate.tags.some((tag) => commanderSignals.secondaryArchetypes.includes(tag))) {
    score += 8;
    reasons.push('supports a secondary commander strategy');
  }

  if (candidate.roles.some((role) => commanderSignals.preferredRoles.includes(role))) {
    score += 16;
    reasons.push('fills a role the commander strongly prefers');
  }

  if (
    commanderSignals.preferredCreatureType &&
    candidate.roles.includes('tribalPayoff')
  ) {
    score += 12;
    reasons.push('supports the commander’s preferred tribe plan');
  }

  if (commanderSignals.wantsTokens && candidate.roles.includes('tokenMaker')) {
    score += 10;
    reasons.push('supports the commander’s token plan');
  }

  if (commanderSignals.wantsTokens && candidate.roles.includes('tokenPayoff')) {
    score += 12;
    reasons.push('improves token conversion and payoff quality');
  }

  if (commanderSignals.wantsSacrifice && candidate.roles.includes('sacOutlet')) {
    score += 12;
    reasons.push('supports sacrifice lines the commander appears to want');
  }

  if (commanderSignals.wantsDeathTriggers && candidate.roles.includes('deathPayoff')) {
    score += 10;
    reasons.push('supports death-trigger value lines');
  }

  if ((commanderSignals.wantsCombat || commanderSignals.wantsGoWide) && candidate.roles.includes('haste')) {
    score += 10;
    reasons.push('improves immediate board impact for a combat shell');
  }

  if (commanderSignals.comboFocus && candidate.roles.includes('combo')) {
    score += 14;
    reasons.push('supports the commander’s combo-oriented ceiling');
  }

  return {
    score,
    reasons: uniqueStrings(reasons),
  };
}

function getPlanFitBoost(
  candidate: RecommendationPoolCard,
  planProfile: DeckPlanProfile,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (candidate.roles.some((role) => planProfile.weakRoles.includes(role))) {
    score += 18;
    reasons.push('fills one of the shell’s weak roles');
  }

  if (candidate.roles.some((role) => planProfile.supportedRoles.includes(role))) {
    score += 8;
    reasons.push('fits naturally into the shell’s existing support structure');
  }

  if (candidate.roles.some((role) => planProfile.overloadedRoles.includes(role))) {
    score -= 10;
    reasons.push('competes with a role the deck may already be overloaded on');
  }

  if (planProfile.comboFocus && candidate.roles.includes('combo')) {
    score += 10;
  }

  if (planProfile.commanderReliance === 'high' && candidate.roles.includes('protection')) {
    score += 12;
    reasons.push('protects a shell that relies heavily on its commander');
  }

  if (planProfile.commanderReliance === 'high' && candidate.roles.includes('haste')) {
    score += 12;
    reasons.push('helps a commander-reliant shell get value immediately');
  }

  return {
    score,
    reasons: uniqueStrings(reasons),
  };
}

function getStructuralBoost(
  candidate: RecommendationPoolCard,
  deckSignals: DeckSignals,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const needs = deckSignals.structuralNeeds;

  if (candidate.category === 'Ramp' && needs.ramp) {
    score += 14;
    reasons.push('addresses a current ramp shortfall');
  }

  if (candidate.category === 'Draw' && needs.draw) {
    score += 14;
    reasons.push('addresses a current draw shortfall');
  }

  if (candidate.category === 'Removal' && needs.removal) {
    score += 10;
    reasons.push('improves interaction density');
  }

  if (candidate.category === 'Removal' && needs.wipes && candidate.roles.includes('boardWipe')) {
    score += 8;
    reasons.push('helps cover a board wipe gap');
  }

  if (candidate.category === 'Protection' && needs.protection) {
    score += 12;
    reasons.push('helps protect key engine pieces');
  }

  if (candidate.category === 'Finisher' && needs.finishers) {
    score += 12;
    reasons.push('improves the deck’s ability to close games');
  }

  if (candidate.category === 'Synergy' && needs.synergy) {
    score += 14;
    reasons.push('improves shell cohesion and commander alignment');
  }

  if (candidate.roles.includes('manaRock') && deckSignals.manaRockCount < 3) {
    score += 8;
    reasons.push('deck is still light on mana rocks');
  }

  if (candidate.roles.includes('landRamp') && deckSignals.landRampCount < 2) {
    score += 6;
    reasons.push('deck is still light on true land ramp');
  }

  if (candidate.roles.includes('singleRemoval') && deckSignals.singleRemovalCount < 5) {
    score += 6;
    reasons.push('deck is still light on spot removal');
  }

  if (candidate.roles.includes('tokenMaker') && deckSignals.tokenMakerCount < 6) {
    score += 10;
    reasons.push('deck is still light on token production');
  }

  if (candidate.roles.includes('tokenPayoff') && deckSignals.tokenPayoffCount < 4) {
    score += 10;
    reasons.push('deck is still light on token payoff density');
  }

  if (candidate.roles.includes('tribalPayoff') && deckSignals.tribalPayoffCount < 5) {
    score += 10;
    reasons.push('deck is still light on tribal payoff density');
  }

  if (candidate.roles.includes('sacOutlet') && deckSignals.sacOutletCount < 2) {
    score += 10;
    reasons.push('deck is still light on sacrifice outlets');
  }

  if (candidate.roles.includes('haste') && deckSignals.hasteEnablerCount < 2) {
    score += 10;
    reasons.push('deck is still light on haste access');
  }

  if (candidate.roles.includes('combo') && deckSignals.comboPieceCount < 3) {
    score += 8;
    reasons.push('deck is still light on combo support');
  }

  return {
    score,
    reasons: uniqueStrings(reasons),
  };
}

function getSpecialCaseBoost(
  candidate: RecommendationPoolCard,
  deck: DeckForUpgrade,
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const commanderName = normalizeName(commanderSignals.commanderName);

  if (candidate.cardName === 'Skullclamp' && deckSignals.tokenMakerCount >= 5) {
    score += 16;
    reasons.push('has excellent token-to-card conversion for a wide shell');
  }

  if (candidate.cardName === 'Jeska’s Will' && commanderSignals.comboFocus) {
    score += 18;
    reasons.push('creates explosive turns for proactive or combo-oriented shells');
  }

  if (candidate.cardName === 'Thornbite Staff' && commanderName.includes('krenko')) {
    score += 22;
    reasons.push('is a premier combo piece with this commander');
  }

  if (candidate.cardName === 'Skirk Prospector' && commanderName.includes('krenko')) {
    score += 18;
    reasons.push('converts token volume into mana for high-ceiling turns');
  }

  if (
    commanderSignals.preferredCreatureType === 'goblin' &&
    (candidate.cardName === 'Goblin Warchief' || candidate.cardName === 'Goblin Chieftain')
  ) {
    score += 16;
    reasons.push('is a premium goblin shell support piece');
  }

  if (
    commanderSignals.wantsTokens &&
    (candidate.cardName === 'Impact Tremors' || candidate.cardName === 'Purphoros, God of the Forge')
  ) {
    score += 14;
    reasons.push('converts creature volume into real closing power');
  }

  if (
    commanderSignals.commanderReliance === 'high' &&
    (candidate.cardName === 'Lightning Greaves' || candidate.cardName === 'Swiftfoot Boots')
  ) {
    score += 16;
    reasons.push('is premium support for a commander-reliant shell');
  }

  if (buildDeckNameSet(deck).has(normalizeName(candidate.cardName))) {
    score -= 9999;
  }

  return {
    score,
    reasons: uniqueStrings(reasons),
  };
}

const KNOWN_EXPENSIVE_STAPLES = new Set(
  [
    'dockside extortionist',
    "jeska's will",
    'rhystic study',
    'smothering tithe',
    'the one ring',
    'mana crypt',
    'mana vault',
    'chrome mox',
    'mox diamond',
    'fierce guardianship',
    'deflecting swat',
    'cyclonic rift',
    'doubling season',
    'parallel lives',
    'ancient tomb',
    'cavern of souls',
    'jeweled lotus',
    'vampiric tutor',
    'demonic tutor',
    'enlightened tutor',
  ].map(normalizeName),
);

function getPlayStyleBoost(
  candidate: RecommendationPoolCard,
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
  playStyle: UpgradePlayStyle,
): { score: number; reasons: string[] } {
  if (playStyle === 'balanced') {
    return {
      score: 0,
      reasons: [],
    };
  }

  let score = 0;
  const reasons: string[] = [];
  const normalizedName = normalizeName(candidate.cardName);
  const roles = new Set(candidate.roles);
  const tags = new Set<string>(candidate.tags);

  const hasRole = (...values: string[]) =>
    values.some((value) => roles.has(value));
  const hasTag = (...values: string[]) =>
    values.some((value) => tags.has(value));

  if (playStyle === 'aggressive') {
    if (hasRole('haste', 'finisher', 'tokenMaker', 'tokenPayoff')) {
      score += 30;
      reasons.push('matches the requested aggressive upgrade style');
    }

    if (hasTag('aggro', 'tokens', 'tribal')) score += 16;
    if (candidate.category === 'Finisher') score += 16;

    if (
      candidate.category === 'Draw' &&
      !hasRole('tokenPayoff', 'finisher', 'haste')
    ) {
      score -= 12;
    }
  }

  if (playStyle === 'defensive') {
    if (hasRole('protection', 'singleRemoval', 'boardWipe', 'draw')) {
      score += 30;
      reasons.push('matches the requested defensive upgrade style');
    }

    if (
      candidate.category === 'Protection' ||
      candidate.category === 'Removal'
    ) {
      score += 18;
    }

    if (hasTag('control', 'graveyard', 'aristocrats')) score += 12;

    if (
      hasRole('finisher', 'tokenPayoff') &&
      !deckSignals.structuralNeeds.finishers
    ) {
      score -= 12;
    }
  }

  if (playStyle === 'combo') {
    if (hasRole('combo', 'sacOutlet') || hasTag('combo', 'aristocrats')) {
      score += 34;
      reasons.push('matches the requested combo upgrade style');
    }

    if (
      hasRole('draw', 'ramp') &&
      (commanderSignals.comboFocus || deckSignals.comboPieceCount >= 2)
    ) {
      score += 14;
    }

    if (
      hasRole('haste', 'tokenPayoff', 'finisher') &&
      !commanderSignals.wantsCombat &&
      !commanderSignals.wantsGoWide
    ) {
      score -= 14;
    }
  }

  if (playStyle === 'budget') {
    // Full budget scoring should use live or cached price data when available.
    if (KNOWN_EXPENSIVE_STAPLES.has(normalizedName)) {
      score -= 34;
      reasons.push('deprioritized for budget-friendly upgrade style');
    }

    if (
      candidate.priority < 80 &&
      !KNOWN_EXPENSIVE_STAPLES.has(normalizedName)
    ) {
      score += 12;
      reasons.push('keeps the upgrade path practical');
    }
  }

  return {
    score,
    reasons: uniqueStrings(reasons),
  };
}

function getGoalBoost(
  candidate: RecommendationPoolCard,
  deckSignals: DeckSignals,
  goal: UpgradeGoal,
): { score: number; reasons: string[] } {
  if (goal === 'stronger') {
    return {
      score: 0,
      reasons: [],
    };
  }

  let score = 0;
  const reasons: string[] = [];
  const normalizedName = normalizeName(candidate.cardName);
  const roles = new Set(candidate.roles);
  const tags = new Set<string>(candidate.tags);

  const hasRole = (...values: string[]) =>
    values.some((value) => roles.has(value));
  const hasTag = (...values: string[]) =>
    values.some((value) => tags.has(value));

  if (goal === 'faster') {
    if (candidate.category === 'Ramp' || hasRole('ramp', 'manaRock', 'landRamp')) {
      score += 38;
      reasons.push('matches the goal of making the deck faster');
    }

    if (hasRole('haste') || candidate.priority >= 90) score += 18;
    if (candidate.category === 'Draw' && !hasRole('ramp', 'haste')) score -= 14;
  }

  if (goal === 'consistency') {
    if (candidate.category === 'Draw' || hasRole('draw', 'combo', 'synergy')) {
      score += 34;
      reasons.push('matches the goal of improving consistency');
    }

    if (hasTag('combo', 'midrange') || candidate.priority >= 85) score += 14;
  }

  if (goal === 'survivability') {
    if (
      candidate.category === 'Protection' ||
      candidate.category === 'Removal' ||
      hasRole('protection', 'boardWipe', 'singleRemoval', 'draw')
    ) {
      score += 38;
      reasons.push('matches the goal of improving survivability');
    }

    if (hasTag('control', 'graveyard')) score += 14;
  }

  if (goal === 'card_draw') {
    if (candidate.category === 'Draw' || hasRole('draw')) {
      score += 56;
      reasons.push('directly supports the card draw goal');
    }

    if (deckSignals.structuralNeeds.draw && hasRole('draw')) score += 18;
  }

  if (goal === 'mana_ramp') {
    if (candidate.category === 'Ramp' || hasRole('ramp', 'manaRock', 'landRamp')) {
      score += 56;
      reasons.push('directly supports the mana ramp goal');
    }

    if (deckSignals.structuralNeeds.ramp && candidate.category === 'Ramp') score += 18;
  }

  if (goal === 'interaction') {
    if (
      candidate.category === 'Removal' ||
      candidate.category === 'Protection' ||
      hasRole('singleRemoval', 'boardWipe', 'protection')
    ) {
      score += 50;
      reasons.push('directly supports the interaction goal');
    }

    if (deckSignals.structuralNeeds.removal || deckSignals.structuralNeeds.wipes) {
      score += 16;
    }
  }

  if (goal === 'combat') {
    if (
      candidate.category === 'Finisher' ||
      hasRole('finisher', 'haste', 'tokenPayoff', 'tribalPayoff') ||
      hasTag('aggro', 'tokens', 'tribal')
    ) {
      score += 46;
      reasons.push('matches the goal of improving combat power');
    }
  }

  if (goal === 'combo') {
    if (hasRole('combo', 'sacOutlet', 'deathPayoff') || hasTag('combo', 'aristocrats')) {
      score += 52;
      reasons.push('matches the goal of improving combo potential');
    }

    if (candidate.category === 'Synergy') score += 16;
  }

  if (goal === 'budget') {
    // Full budget scoring should use live or cached price data when available.
    if (KNOWN_EXPENSIVE_STAPLES.has(normalizedName)) {
      score -= 44;
      reasons.push('deprioritized for the lower-budget goal');
    }

    if (candidate.priority < 80 && !KNOWN_EXPENSIVE_STAPLES.has(normalizedName)) {
      score += 16;
      reasons.push('keeps the upgrade goal practical');
    }
  }

  if (goal === 'raise_power') {
    if (candidate.priority >= 90) {
      score += 36;
      reasons.push('matches the goal of raising overall power');
    }

    if (
      hasRole('combo', 'finisher', 'tokenPayoff', 'draw', 'ramp') ||
      candidate.category === 'Finisher'
    ) {
      score += 22;
    }
  }

  if (goal === 'stay_bracket') {
    if (candidate.priority >= 92 || hasRole('combo')) {
      score -= 32;
      reasons.push('is moderated to help stay near the current bracket');
    }

    if (
      candidate.category === 'Draw' ||
      candidate.category === 'Ramp' ||
      candidate.category === 'Removal' ||
      candidate.category === 'Protection' ||
      hasRole('draw', 'ramp', 'singleRemoval', 'protection')
    ) {
      score += 22;
      reasons.push('improves a role without strongly pushing bracket classification');
    }
  }

  return {
    score,
    reasons: uniqueStrings(reasons),
  };
}

function getPreferredTags(
  commanderSignals: CommanderSignals,
  planProfile: DeckPlanProfile,
): string[] {
  return uniqueStrings([
    ...commanderSignals.primaryArchetypes,
    ...commanderSignals.secondaryArchetypes,
    ...planProfile.archetypes,
  ]);
}

function getPreferredRoles(
  commanderSignals: CommanderSignals,
  planProfile: DeckPlanProfile,
  deckSignals: DeckSignals,
): string[] {
  const roles = [
    ...commanderSignals.preferredRoles,
    ...planProfile.weakRoles,
  ];

  if (deckSignals.structuralNeeds.ramp) roles.push('ramp', 'manaRock', 'landRamp');
  if (deckSignals.structuralNeeds.draw) roles.push('draw');
  if (deckSignals.structuralNeeds.removal) roles.push('singleRemoval');
  if (deckSignals.structuralNeeds.wipes) roles.push('boardWipe');
  if (deckSignals.structuralNeeds.protection) roles.push('protection', 'haste');
  if (deckSignals.structuralNeeds.finishers) roles.push('finisher', 'tokenPayoff', 'tribalPayoff');
  if (deckSignals.structuralNeeds.synergy) roles.push('synergy', 'combo', 'tokenMaker', 'tribalPayoff');

  return uniqueStrings(roles);
}

function extractDeckCardNames(deck: DeckForUpgrade): string[] {
  const names: string[] = [];

  const possibleArrays = [
    (deck as { cards?: unknown[] }).cards,
    (deck as { mainboard?: unknown[] }).mainboard,
    (deck as { deckCards?: unknown[] }).deckCards,
  ];

  for (const arr of possibleArrays) {
    if (!Array.isArray(arr)) continue;

    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;

      const maybeName =
        (item as { cardName?: string; name?: string }).cardName ??
        (item as { cardName?: string; name?: string }).name;

      if (typeof maybeName === 'string' && maybeName.trim()) {
        names.push(maybeName.trim());
      }
    }
  }

  return uniqueStrings(names);
}

function isBroadlyRelevantCandidate(
  candidate: RecommendationPoolCard,
  planProfile: DeckPlanProfile,
  deckSignals: DeckSignals,
  preferredTags: string[],
  preferredRoles: string[],
): boolean {
  const tagMatch =
    candidate.tags.length === 0 ||
    candidate.tags.some((tag) => preferredTags.includes(tag)) ||
    candidate.tags.some((tag) => planProfile.archetypes.includes(tag));

  const roleMatch =
    candidate.roles.some((role) => preferredRoles.includes(role)) ||
    candidate.roles.some((role) => planProfile.supportedRoles.includes(role)) ||
    candidate.roles.some((role) => planProfile.weakRoles.includes(role));

  const structuralRelevance =
    (candidate.category === 'Ramp' && (deckSignals.structuralNeeds.ramp || candidate.roles.includes('ramp'))) ||
    (candidate.category === 'Draw' && (deckSignals.structuralNeeds.draw || candidate.roles.includes('draw'))) ||
    (candidate.category === 'Removal' &&
      (deckSignals.structuralNeeds.removal ||
        deckSignals.structuralNeeds.wipes ||
        candidate.roles.includes('singleRemoval') ||
        candidate.roles.includes('boardWipe'))) ||
    (candidate.category === 'Protection' &&
      (deckSignals.structuralNeeds.protection || candidate.roles.includes('protection') || candidate.roles.includes('haste'))) ||
    (candidate.category === 'Finisher' &&
      (deckSignals.structuralNeeds.finishers || candidate.roles.includes('finisher') || candidate.roles.includes('tokenPayoff') || candidate.roles.includes('tribalPayoff'))) ||
    (candidate.category === 'Synergy' &&
      (deckSignals.structuralNeeds.synergy ||
        candidate.roles.includes('tokenMaker') ||
        candidate.roles.includes('tokenPayoff') ||
        candidate.roles.includes('tribalPayoff') ||
        candidate.roles.includes('sacOutlet') ||
        candidate.roles.includes('deathPayoff') ||
        candidate.roles.includes('combo') ||
        candidate.roles.includes('haste')));

  return tagMatch || roleMatch || structuralRelevance;
}

export async function getCandidatePool(
  deck: DeckForUpgrade,
  commanderSignals: CommanderSignals,
  planProfile: DeckPlanProfile,
  deckSignals: DeckSignals,
): Promise<RecommendationPoolCard[]> {
  const deckNames = buildDeckNameSet(deck);
  const preferredTags = getPreferredTags(commanderSignals, planProfile);
  const preferredRoles = getPreferredRoles(commanderSignals, planProfile, deckSignals);
  const deckCardNames = extractDeckCardNames(deck);

  const providerResult = await searchProviderRecommendationCandidates({
    commanderColors: commanderSignals.colors,
    deckCardNames,
    preferredTags,
    preferredRoles,
    categories: [
      'Ramp',
      'Draw',
      'Removal',
      'Protection',
      'Finisher',
      'Synergy',
    ],
    limit: 300,
  });

  return providerResult.candidates
    .filter((candidate) => !deckNames.has(normalizeName(candidate.cardName)))
    .filter((candidate) => colorsAreCompatible(candidate.colors, commanderSignals.colors))
    .filter((candidate) =>
      isBroadlyRelevantCandidate(
        candidate,
        planProfile,
        deckSignals,
        preferredTags,
        preferredRoles,
      ),
    );
}

export function scoreCandidateAgainstPlan(
  candidate: RecommendationPoolCard,
  deck: DeckForUpgrade,
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
  planProfile: DeckPlanProfile,
  mismatches: DeckMismatch[],
  playStyle: UpgradePlayStyle = 'balanced',
  goal: UpgradeGoal = 'stronger',
): CandidateScore {
  let score = candidate.priority;
  const reasonBoosts: string[] = [];

  const mismatchBoost = getMismatchBoost(candidate, mismatches);
  score += mismatchBoost.score;
  reasonBoosts.push(...mismatchBoost.reasons);

  const commanderBoost = getCommanderFitBoost(candidate, commanderSignals);
  score += commanderBoost.score;
  reasonBoosts.push(...commanderBoost.reasons);

  const planBoost = getPlanFitBoost(candidate, planProfile);
  score += planBoost.score;
  reasonBoosts.push(...planBoost.reasons);

  const structuralBoost = getStructuralBoost(candidate, deckSignals);
  score += structuralBoost.score;
  reasonBoosts.push(...structuralBoost.reasons);

  const specialBoost = getSpecialCaseBoost(candidate, deck, commanderSignals, deckSignals);
  score += specialBoost.score;
  reasonBoosts.push(...specialBoost.reasons);

  const playStyleBoost = getPlayStyleBoost(
    candidate,
    commanderSignals,
    deckSignals,
    playStyle,
  );
  score += playStyleBoost.score;
  reasonBoosts.push(...playStyleBoost.reasons);

  const goalBoost = getGoalBoost(candidate, deckSignals, goal);
  score += goalBoost.score;
  reasonBoosts.push(...goalBoost.reasons);

  return {
    candidate,
    score,
    playStyleScore: playStyleBoost.score,
    goalScore: goalBoost.score,
    reasonBoosts: uniqueStrings(reasonBoosts),
  };
}

export async function getSmartCandidatePool(
  deck: DeckForUpgrade,
  commanderSignals: CommanderSignals,
  deckSignals: DeckSignals,
  planProfile: DeckPlanProfile,
  mismatches: DeckMismatch[],
  playStyle: UpgradePlayStyle = 'balanced',
  goal: UpgradeGoal = 'stronger',
): Promise<CandidateScore[]> {
  const rawPool = await getCandidatePool(
    deck,
    commanderSignals,
    planProfile,
    deckSignals,
  );

  return rawPool
    .map((candidate) =>
      scoreCandidateAgainstPlan(
        candidate,
        deck,
        commanderSignals,
        deckSignals,
        planProfile,
        mismatches,
        playStyle,
        goal,
      ),
    )
    .sort((a, b) => b.score - a.score);
}

export function buildSmartReason(
  baseReason: string,
  boosts: string[],
): string {
  if (boosts.length === 0) return baseReason;

  const topBoosts = boosts.slice(0, 2);
  return `${baseReason} This suggestion was prioritized because it ${topBoosts.join(' and ')}.`;
}

export function buildExplanation(
  candidate: RecommendationPoolCard,
  archetypes: string[],
  weakRoles: string[],
  mismatches: DeckMismatch[],
  cutReason: string,
): UpgradeExplanation {
  return {
    triggeredBy:
      uniqueStrings(
        mismatches
          .filter((mismatch) =>
            candidate.roles.some((role) => mismatch.relatedRoles.includes(role)),
          )
          .map((mismatch) => mismatch.label.toLowerCase()),
      ).length > 0
        ? uniqueStrings(
            mismatches
              .filter((mismatch) =>
                candidate.roles.some((role) => mismatch.relatedRoles.includes(role)),
              )
              .map((mismatch) => mismatch.label.toLowerCase()),
          )
        : ['general upgrade fit'],
    deckWeaknesses: weakRoles,
    archetypesDetected: archetypes as UpgradeExplanation['archetypesDetected'],
    candidateRoles: candidate.roles,
    cutWhy: cutReason,
  };
}
