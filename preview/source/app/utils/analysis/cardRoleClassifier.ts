import {
  Archetype,
  CardRole,
  CommanderSignals,
  DeckCard,
} from '../../types/deckUpgrade';
import {
  getCombinedText,
  lower,
  uniqueStrings,
} from './deckUpgradeHelpers';

export function isLand(card: DeckCard): boolean {
  return lower(card.typeLine).includes('land');
}

export function isBasicLandCard(card: DeckCard): boolean {
  const typeLine = lower(card.typeLine);
  return typeLine.includes('land') && typeLine.includes('basic');
}

export function isUtilityLand(card: DeckCard): boolean {
  if (!isLand(card)) return false;
  return lower(card.oracleText).length > 0;
}

export function isCreature(card: DeckCard): boolean {
  return lower(card.typeLine).includes('creature');
}

export function isArtifact(card: DeckCard): boolean {
  return lower(card.typeLine).includes('artifact');
}

export function isEnchantment(card: DeckCard): boolean {
  return lower(card.typeLine).includes('enchantment');
}

export function isInstantOrSorcery(card: DeckCard): boolean {
  const typeLine = lower(card.typeLine);
  return typeLine.includes('instant') || typeLine.includes('sorcery');
}

export function isManaRock(card: DeckCard): boolean {
  if (isLand(card) || !isArtifact(card)) return false;
  const text = lower(card.oracleText);

  return (
    text.includes('{t}: add') ||
    text.includes('add one mana of any color') ||
    text.includes('add two mana') ||
    text.includes('add one mana') ||
    text.includes('mana of any color')
  );
}

export function isLandRamp(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = lower(card.oracleText);

  return (
    text.includes('search your library for a land') ||
    (text.includes('search your library for up to') && text.includes('land')) ||
    text.includes('put a land card from your hand onto the battlefield') ||
    text.includes('you may play an additional land')
  );
}

export function isTreasureRamp(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = lower(card.oracleText);

  return text.includes('treasure token') || text.includes('create a treasure');
}

export function isCostReducer(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = lower(card.oracleText);

  return (
    text.includes('costs {1} less') ||
    text.includes('costs {2} less') ||
    text.includes('spells you cast cost less') ||
    (text.includes('reduce') && text.includes('cost'))
  );
}

export function isRamp(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = getCombinedText(card);

  return (
    isManaRock(card) ||
    isLandRamp(card) ||
    isTreasureRamp(card) ||
    isCostReducer(card) ||
    text.includes('add ') ||
    text.includes('mana of any color')
  );
}

export function isCardDraw(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = lower(card.oracleText);

  return (
    text.includes('draw a card') ||
    text.includes('draw two cards') ||
    text.includes('draw three cards') ||
    text.includes('draw x cards') ||
    (text.includes('whenever') && text.includes('draw')) ||
    (text.includes('at the beginning of') && text.includes('draw')) ||
    (text.includes('exile the top') && text.includes('you may play')) ||
    (text.includes('look at the top') && text.includes('you may play')) ||
    (text.includes('discard') && text.includes('draw'))
  );
}

export function isSingleTargetRemoval(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = lower(card.oracleText);

  return (
    text.includes('destroy target') ||
    text.includes('exile target') ||
    text.includes('damage to target creature') ||
    text.includes('damage to any target') ||
    text.includes('damage divided as you choose') ||
    (text.includes('return target') && text.includes("to its owner's hand")) ||
    text.includes('target player sacrifices') ||
    text.includes('sacrifices a creature') ||
    text.includes('fight target') ||
    text.includes('counter target spell')
  );
}

export function isBoardWipe(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = lower(card.oracleText);

  return (
    text.includes('destroy all creatures') ||
    text.includes('exile all creatures') ||
    (text.includes('each creature') && text.includes('takes')) ||
    (text.includes('deals') && text.includes('to each creature')) ||
    text.includes('all creatures get -') ||
    text.includes('destroy all artifacts') ||
    text.includes('destroy all enchantments') ||
    text.includes('destroy all nonland permanents')
  );
}

export function isRemoval(card: DeckCard): boolean {
  return isSingleTargetRemoval(card) || isBoardWipe(card);
}

export function isProtection(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = lower(card.oracleText);

  return (
    text.includes('hexproof') ||
    text.includes('indestructible') ||
    text.includes('ward') ||
    text.includes('protection from') ||
    text.includes('phase out') ||
    text.includes('prevent all damage') ||
    text.includes('gains shroud') ||
    (
      text.includes('equip') &&
      (
        text.includes('hexproof') ||
        text.includes('shroud') ||
        text.includes('indestructible')
      )
    )
  );
}

export function isTokenMaker(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = lower(card.oracleText);

  return (
    (text.includes('create a') && text.includes('token')) ||
    (text.includes('create two') && text.includes('token')) ||
    (text.includes('create x') && text.includes('token')) ||
    text.includes('populate')
  );
}

export function isTokenPayoff(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = getCombinedText(card);

  return (
    (text.includes('whenever a creature enters') && text.includes('each opponent')) ||
    text.includes('creatures you control get +') ||
    text.includes('attacking creatures you control') ||
    text.includes('double the number') ||
    text.includes('token creatures you control') ||
    text.includes('whenever one or more tokens') ||
    text.includes('whenever another goblin enters') ||
    text.includes('whenever another creature enters') ||
    text.includes('sacrifice a creature')
  );
}

export function isFinisher(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = getCombinedText(card);
  const cmc = card.cmc ?? 0;

  return (
    text.includes('double the number') ||
    text.includes('extra combat') ||
    text.includes('creatures you control get +') ||
    text.includes('each opponent loses') ||
    text.includes('damage to each opponent') ||
    text.includes('win the game') ||
    (text.includes('whenever a creature enters') && text.includes('each opponent')) ||
    text.includes('overrun') ||
    text.includes('hoof') ||
    cmc >= 7
  );
}

export function isSacOutlet(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = lower(card.oracleText);

  return (
    text.includes('sacrifice a creature:') ||
    text.includes('sacrifice another creature:') ||
    text.includes('sacrifice a goblin:') ||
    text.includes('sacrifice another goblin:')
  );
}

export function isDeathPayoff(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = lower(card.oracleText);

  return (
    text.includes('whenever a creature dies') ||
    text.includes('whenever another creature dies') ||
    text.includes('when another creature dies') ||
    text.includes('dies,') ||
    text.includes('dies.') ||
    text.includes('whenever you sacrifice')
  );
}

export function isHasteEnabler(card: DeckCard): boolean {
  if (isLand(card)) return false;
  const text = getCombinedText(card);

  return (
    text.includes('creatures you control have haste') ||
    text.includes('goblins you control have haste') ||
    text.includes('equipped creature has haste') ||
    text.includes('grant haste') ||
    text.includes('gains haste')
  );
}

export function isUntapComboPiece(card: DeckCard): boolean {
  const text = getCombinedText(card);

  return (
    text.includes('untap') ||
    text.includes('thornbite') ||
    text.includes('sword of the paruns')
  );
}

export function isTribalCard(card: DeckCard, tribe?: string): boolean {
  const text = getCombinedText(card);

  if (tribe) {
    return text.includes(lower(tribe));
  }

  return (
    text.includes('goblin') ||
    text.includes('elf') ||
    text.includes('zombie') ||
    text.includes('dragon') ||
    text.includes('vampire') ||
    text.includes('sliver') ||
    text.includes('soldier') ||
    text.includes('warrior')
  );
}

export function getAverageCmc(cards: DeckCard[]): number {
  const nonLandCards = cards.filter((card) => !isLand(card));
  const cardsWithCmc = nonLandCards.filter((card) => typeof card.cmc === 'number');

  if (cardsWithCmc.length === 0) return 0;

  const total = cardsWithCmc.reduce((sum, card) => sum + (card.cmc ?? 0), 0);
  return total / cardsWithCmc.length;
}

export function isSynergyCard(
  card: DeckCard,
  archetypes: Archetype[],
  commanderSignals?: CommanderSignals,
): boolean {
  if (isLand(card)) return false;
  const text = getCombinedText(card);

  if (
    archetypes.includes('tribal') &&
    (
      text.includes('chosen type') ||
      text.includes('creatures of the chosen type') ||
      text.includes('goblin') ||
      text.includes('elf') ||
      text.includes('zombie') ||
      text.includes('dragon')
    )
  ) {
    return true;
  }

  if (archetypes.includes('tokens') && (isTokenMaker(card) || isTokenPayoff(card))) {
    return true;
  }

  if (archetypes.includes('artifacts') && text.includes('artifact')) {
    return true;
  }

  if (
    archetypes.includes('spellslinger') &&
    (text.includes('instant') || text.includes('sorcery') || text.includes('whenever you cast'))
  ) {
    return true;
  }

  if (
    archetypes.includes('aristocrats') &&
    (text.includes('sacrifice') || text.includes('dies') || text.includes('death trigger'))
  ) {
    return true;
  }

  if (
    archetypes.includes('graveyard') &&
    (text.includes('graveyard') || text.includes('return target card from your graveyard'))
  ) {
    return true;
  }

  if (
    archetypes.includes('counters') &&
    (text.includes('+1/+1 counter') || text.includes('proliferate'))
  ) {
    return true;
  }

  if (
    archetypes.includes('blink') &&
    (text.includes('exile another target') || text.includes('return it to the battlefield'))
  ) {
    return true;
  }

  if (
    archetypes.includes('combo') &&
    (text.includes('untap') || text.includes('copy') || text.includes('double'))
  ) {
    return true;
  }

  if (commanderSignals?.preferredCreatureType && isTribalCard(card, commanderSignals.preferredCreatureType)) {
    return true;
  }

  return false;
}

export function getCardRoles(
  card: DeckCard,
  archetypes: Archetype[],
  commanderSignals?: CommanderSignals,
): CardRole[] {
  const roles: CardRole[] = [];

  if (isRamp(card)) roles.push('ramp');
  if (isManaRock(card)) roles.push('manaRock');
  if (isLandRamp(card)) roles.push('landRamp');
  if (isCardDraw(card)) roles.push('draw');
  if (isSingleTargetRemoval(card)) roles.push('singleRemoval');
  if (isBoardWipe(card)) roles.push('boardWipe');
  if (isProtection(card)) roles.push('protection');
  if (isFinisher(card)) roles.push('finisher');
  if (isTokenMaker(card)) roles.push('tokenMaker');
  if (isTokenPayoff(card)) roles.push('tokenPayoff');
  if (isSacOutlet(card)) roles.push('sacOutlet');
  if (isDeathPayoff(card)) roles.push('deathPayoff');
  if (isHasteEnabler(card)) roles.push('haste');
  if (isUntapComboPiece(card)) roles.push('combo');
  if (isSynergyCard(card, archetypes, commanderSignals)) roles.push('synergy');

  if (commanderSignals?.preferredCreatureType && isTribalCard(card, commanderSignals.preferredCreatureType)) {
    roles.push('tribalPayoff');
  }

  if (isCreature(card) && !isLand(card)) roles.push('creature');
  if (isArtifact(card)) roles.push('artifact');
  if (isInstantOrSorcery(card)) roles.push('spell');
  if (isEnchantment(card)) roles.push('enchantment');

  return uniqueStrings(roles) as CardRole[];
}