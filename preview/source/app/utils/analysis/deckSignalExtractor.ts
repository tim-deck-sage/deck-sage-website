import {
  Archetype,
  CommanderSignals,
  DeckColor,
  DeckForUpgrade,
  DeckSignals,
  RolePressure,
  StructuralNeeds,
} from '../../types/deckUpgrade';
import { getAllLandCount, uniqueStrings } from './deckUpgradeHelpers';
import {
  getAverageCmc,
  getCardRoles,
  isArtifact,
  isBoardWipe,
  isCardDraw,
  isCreature,
  isEnchantment,
  isFinisher,
  isHasteEnabler,
  isInstantOrSorcery,
  isLand,
  isLandRamp,
  isManaRock,
  isProtection,
  isRamp,
  isSacOutlet,
  isSingleTargetRemoval,
  isSynergyCard,
  isTokenMaker,
  isTokenPayoff,
  isTreasureRamp,
  isUntapComboPiece,
  isUtilityLand,
} from './cardRoleClassifier';

function inferDeckColors(deck: DeckForUpgrade, commanderSignals?: CommanderSignals): DeckColor[] {
  if (commanderSignals?.colors?.length) {
    return commanderSignals.colors;
  }

  const colors = new Set<DeckColor>();

  for (const card of deck.cards) {
    for (const color of card.colorIdentity || []) {
      if (['W', 'U', 'B', 'R', 'G', 'C'].includes(color)) {
        colors.add(color as DeckColor);
      }
    }
  }

  if (colors.size === 0) return ['C'];
  return Array.from(colors);
}

export function detectArchetypes(
  deck: DeckForUpgrade,
  commanderSignals?: CommanderSignals,
): Archetype[] {
  const spellCards = deck.cards.filter((card) => !isLand(card));

  const scores: Record<Archetype, number> = {
    tribal: 0,
    tokens: 0,
    sacrifice: 0,
    artifacts: 0,
    spellslinger: 0,
    aristocrats: 0,
    graveyard: 0,
    counters: 0,
    blink: 0,
    control: 0,
    stompy: 0,
    aggro: 0,
    combo: 0,
    midrange: 0,
  };

  for (const card of spellCards) {
    const roles = getCardRoles(card, [], commanderSignals);
    const text = `${card.typeLine || ''} ${card.oracleText || ''}`.toLowerCase();

    if (roles.includes('tribalPayoff') || text.includes('goblin') || text.includes('dragon') || text.includes('elf') || text.includes('zombie')) {
      scores.tribal += 2;
    }

    if (isTokenMaker(card) || isTokenPayoff(card)) {
      scores.tokens += 2;
    }

    if (isArtifact(card) || text.includes('artifact')) {
      scores.artifacts += 2;
    }

    if (isInstantOrSorcery(card) || text.includes('whenever you cast')) {
      scores.spellslinger += 2;
    }

    if (isSacOutlet(card) || text.includes('dies') || text.includes('death')) {
      scores.aristocrats += 2;
    }

    if (text.includes('graveyard') || text.includes('return target card from your graveyard') || text.includes('reanimate')) {
      scores.graveyard += 2;
    }

    if (text.includes('+1/+1 counter') || text.includes('proliferate')) {
      scores.counters += 2;
    }

    if (text.includes('return it to the battlefield') || text.includes('exile another target')) {
      scores.blink += 2;
    }

    if (isSingleTargetRemoval(card) || isBoardWipe(card)) {
      scores.control += 1;
    }

    if ((card.cmc ?? 0) >= 6 || (isCreature(card) && (parseInt(card.power || '0', 10) || 0) >= 6)) {
      scores.stompy += 1;
    }

    if (isUntapComboPiece(card) || text.includes('copy') || text.includes('double')) {
      scores.combo += 1;
    }
  }

  if (commanderSignals) {
    for (const archetype of commanderSignals.primaryArchetypes) {
      scores[archetype] += 2;
    }
    for (const archetype of commanderSignals.secondaryArchetypes) {
      scores[archetype] += 1;
    }
  }

  if (spellCards.length > 0) {
    scores.midrange += 1;
  }

  const archetypes = (Object.entries(scores) as [Archetype, number][])
    .filter(([, score]) => score >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  if (archetypes.length === 0) return ['midrange'];
  return archetypes.slice(0, 3);
}

export function getCurrentDeckRolePressure(
  deck: DeckForUpgrade,
  commanderSignals?: CommanderSignals,
  archetypes: Archetype[] = [],
): RolePressure {
  const pressure: RolePressure = {
    ramp: 0,
    draw: 0,
    removal: 0,
    protection: 0,
    finishers: 0,
    synergy: 0,
    tokenMakers: 0,
    tokenPayoffs: 0,
    tribalPayoffs: 0,
    comboPieces: 0,
    sacOutlets: 0,
    deathPayoffs: 0,
    hasteEnablers: 0,
  };

  for (const card of deck.cards) {
    if (isLand(card)) continue;

    const roles = getCardRoles(card, archetypes, commanderSignals);

    if (roles.includes('ramp')) pressure.ramp += 1;
    if (roles.includes('draw')) pressure.draw += 1;
    if (roles.includes('singleRemoval') || roles.includes('boardWipe')) pressure.removal += 1;
    if (roles.includes('protection')) pressure.protection += 1;
    if (roles.includes('finisher')) pressure.finishers += 1;
    if (roles.includes('synergy')) pressure.synergy += 1;
    if (roles.includes('tokenMaker')) pressure.tokenMakers += 1;
    if (roles.includes('tokenPayoff')) pressure.tokenPayoffs += 1;
    if (roles.includes('tribalPayoff')) pressure.tribalPayoffs += 1;
    if (roles.includes('combo')) pressure.comboPieces += 1;
    if (roles.includes('sacOutlet')) pressure.sacOutlets += 1;
    if (roles.includes('deathPayoff')) pressure.deathPayoffs += 1;
    if (roles.includes('haste')) pressure.hasteEnablers += 1;
  }

  return pressure;
}

export function analyzeStructuralNeeds(
  deck: DeckForUpgrade,
  archetypes: Archetype[],
  commanderSignals?: CommanderSignals,
): StructuralNeeds {
  const nonLandCards = deck.cards.filter((card) => !isLand(card));
  const totalLandCount = getAllLandCount(deck);
  const averageCmc = getAverageCmc(nonLandCards);

  const manaRockCount = nonLandCards.filter(isManaRock).length;
  const landRampCount = nonLandCards.filter(isLandRamp).length;
  const treasureRampCount = nonLandCards.filter(isTreasureRamp).length;

  const rampPieces =
    manaRockCount +
    landRampCount +
    treasureRampCount +
    nonLandCards.filter((card) => {
      const text = (card.oracleText || '').toLowerCase();
      return text.includes('costs {1} less') || text.includes('spells you cast cost less');
    }).length;

  const drawPieces = nonLandCards.filter(isCardDraw).length;
  const singleRemovalCount = nonLandCards.filter(isSingleTargetRemoval).length;
  const boardWipeCount = nonLandCards.filter(isBoardWipe).length;
  const protectionCount = nonLandCards.filter(isProtection).length;
  const finisherCount = nonLandCards.filter(isFinisher).length;
  const synergyCount = nonLandCards.filter((card) => isSynergyCard(card, archetypes, commanderSignals)).length;
  const tokenMakerCount = nonLandCards.filter(isTokenMaker).length;
  const tokenPayoffCount = nonLandCards.filter(isTokenPayoff).length;
  const tribalPayoffCount = nonLandCards.filter((card) => {
    const roles = getCardRoles(card, archetypes, commanderSignals);
    return roles.includes('tribalPayoff');
  }).length;
  const sacOutletCount = nonLandCards.filter(isSacOutlet).length;
  const hasteEnablerCount = nonLandCards.filter(isHasteEnabler).length;
  const comboPieceCount = nonLandCards.filter(isUntapComboPiece).length;
  const utilityLandCount = deck.cards.filter((card) => isLand(card) && isUtilityLand(card)).length;

  const recommendedLandFloor =
    averageCmc >= 4.2 ? 37 :
    averageCmc >= 3.6 ? 36 :
    35;

  const wantsTokens = commanderSignals?.wantsTokens || archetypes.includes('tokens');
  const wantsTribal = (commanderSignals?.tribeSignals?.length || 0) > 0 || archetypes.includes('tribal');
  const wantsSacrifice = commanderSignals?.wantsSacrifice || archetypes.includes('aristocrats');
  const wantsCombo = commanderSignals?.comboFocus || archetypes.includes('combo');

  const needsMoreTokenSupport =
    wantsTokens && (tokenMakerCount < 6 || tokenPayoffCount < 4);

  const needsMoreTribalSupport =
    wantsTribal && tribalPayoffCount < 5;

  const needsMoreSacrificeSupport =
    wantsSacrifice && sacOutletCount < 2;

  const needsMoreComboSupport =
    wantsCombo && comboPieceCount < 3;

  return {
    lands: totalLandCount < recommendedLandFloor,
    ramp: rampPieces < 8,
    draw: drawPieces < 8,
    removal: singleRemovalCount < 5,
    protection: protectionCount < 3,
    finishers: finisherCount < 4,
    wipes: boardWipeCount < 2,
    synergy:
      synergyCount < 10 ||
      needsMoreTokenSupport ||
      needsMoreTribalSupport ||
      needsMoreSacrificeSupport ||
      needsMoreComboSupport,
    rampPieces,
    manaRockCount,
    landRampCount,
    treasureRampCount,
    drawPieces,
    singleRemovalCount,
    boardWipeCount,
    protectionCount,
    finisherCount,
    synergyCount,
    tokenMakerCount,
    tokenPayoffCount,
    tribalPayoffCount,
    sacOutletCount,
    hasteEnablerCount,
    comboPieceCount,
    utilityLandCount,
    totalLandCount,
    averageCmc,
  };
}

function isCardOnPlan(
  card: ReturnType<typeof deckCardIdentity>,
  commanderSignals?: CommanderSignals,
): boolean {
  const supportedRoles = new Set(commanderSignals?.preferredRoles || []);
  const relevantRoles = card.roles.filter((role) => supportedRoles.has(role));

  if (relevantRoles.length > 0) return true;
  if (card.roles.includes('ramp')) return true;
  if (card.roles.includes('draw')) return true;
  if (card.roles.includes('singleRemoval')) return true;
  if (card.roles.includes('boardWipe')) return true;
  if (card.roles.includes('protection')) return true;
  if (card.roles.includes('finisher')) return true;
  if (card.roles.includes('synergy')) return true;

  return false;
}

function deckCardIdentity(
  card: DeckForUpgrade['cards'][number],
  archetypes: Archetype[],
  commanderSignals?: CommanderSignals,
) {
  return {
    card,
    roles: getCardRoles(card, archetypes, commanderSignals),
  };
}

export function extractDeckSignals(
  deck: DeckForUpgrade,
  commanderSignals?: CommanderSignals,
): DeckSignals {
  const archetypes = detectArchetypes(deck, commanderSignals);
  const colors = inferDeckColors(deck, commanderSignals);
  const totalCards = deck.cards.length;
  const totalLandCount = getAllLandCount(deck);
  const nonLandCards = deck.cards.filter((card) => !isLand(card));
  const nonLandCount = nonLandCards.length;
  const averageCmc = getAverageCmc(nonLandCards);

  const creatureCount = nonLandCards.filter(isCreature).length;
  const artifactCount = nonLandCards.filter(isArtifact).length;
  const enchantmentCount = nonLandCards.filter(isEnchantment).length;
  const instantSorceryCount = nonLandCards.filter(isInstantOrSorcery).length;

  const rampCount = nonLandCards.filter(isRamp).length;
  const manaRockCount = nonLandCards.filter(isManaRock).length;
  const landRampCount = nonLandCards.filter(isLandRamp).length;
  const treasureRampCount = nonLandCards.filter(isTreasureRamp).length;
  const drawCount = nonLandCards.filter(isCardDraw).length;
  const singleRemovalCount = nonLandCards.filter(isSingleTargetRemoval).length;
  const boardWipeCount = nonLandCards.filter(isBoardWipe).length;
  const protectionCount = nonLandCards.filter(isProtection).length;
  const finisherCount = nonLandCards.filter(isFinisher).length;
  const synergyCount = nonLandCards.filter((card) => isSynergyCard(card, archetypes, commanderSignals)).length;

  const identified = nonLandCards.map((card) => deckCardIdentity(card, archetypes, commanderSignals));

  const tokenMakerCount = identified.filter(({ roles }) => roles.includes('tokenMaker')).length;
  const tokenPayoffCount = identified.filter(({ roles }) => roles.includes('tokenPayoff')).length;
  const tribalPayoffCount = identified.filter(({ roles }) => roles.includes('tribalPayoff')).length;
  const sacOutletCount = identified.filter(({ roles }) => roles.includes('sacOutlet')).length;
  const deathPayoffCount = identified.filter(({ roles }) => roles.includes('deathPayoff')).length;
  const hasteEnablerCount = identified.filter(({ roles }) => roles.includes('haste')).length;
  const comboPieceCount = identified.filter(({ roles }) => roles.includes('combo')).length;

  const onPlanCount = identified.filter((entry) => isCardOnPlan(entry, commanderSignals)).length;
  const offPlanCount = identified.filter((entry) => !isCardOnPlan(entry, commanderSignals)).length;
  const commanderSupportCount = identified.filter(({ roles }) => {
    const preferredRoles = commanderSignals?.preferredRoles || [];
    return roles.some((role) => preferredRoles.includes(role));
  }).length;

  const rolePressure = getCurrentDeckRolePressure(deck, commanderSignals, archetypes);
  const structuralNeeds = analyzeStructuralNeeds(deck, archetypes, commanderSignals);

  return {
    archetypes,
    colors: uniqueStrings(colors) as DeckColor[],
    totalCards,
    totalLandCount,
    nonLandCount,
    averageCmc,
    creatureCount,
    artifactCount,
    enchantmentCount,
    instantSorceryCount,
    rampCount,
    manaRockCount,
    landRampCount,
    treasureRampCount,
    drawCount,
    singleRemovalCount,
    boardWipeCount,
    protectionCount,
    finisherCount,
    synergyCount,
    tokenMakerCount,
    tokenPayoffCount,
    tribalPayoffCount,
    sacOutletCount,
    deathPayoffCount,
    hasteEnablerCount,
    comboPieceCount,
    onPlanCount,
    offPlanCount,
    commanderSupportCount,
    rolePressure,
    structuralNeeds,
  };
}
