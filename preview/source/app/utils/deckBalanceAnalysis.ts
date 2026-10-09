type DeckCard = {
  name: string;
  manaCost?: string;
  cmc?: number;
  typeLine?: string;
  oracleText?: string;
  power?: string;
  toughness?: string;
};

type BasicLandCounts = {
  Plains: number;
  Island: number;
  Swamp: number;
  Mountain: number;
  Forest: number;
  Wastes: number;
};

type DeckForBalance = {
  name: string;
  commander?: string;
  cards: DeckCard[];
  basicLands: BasicLandCounts;
};

export type DeckBalanceBreakdown = {
  status: 'Balanced' | 'Needs Work' | 'Unbalanced';
  summary: string;
  landCount: number;
  averageCmc: number;
  creatureCount: number;
  nonCreatureCount: number;
  rampCount: number;
  drawCount: number;
  removalCount: number;
  boardWipeCount: number;
  protectionCount: number;
  finisherCount: number;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
};

function lower(text?: string): string {
  return (text || '').toLowerCase();
}

function getTotalLands(basicLands: BasicLandCounts): number {
  return Object.values(basicLands).reduce((sum, count) => sum + count, 0);
}

function isCreature(card: DeckCard): boolean {
  return lower(card.typeLine).includes('creature');
}

function isRamp(card: DeckCard): boolean {
  const text = `${lower(card.typeLine)} ${lower(card.oracleText)}`;
  return (
    text.includes('add ') ||
    text.includes('search your library for a land') ||
    text.includes('treasure token') ||
    text.includes('mana of any color') ||
    lower(card.typeLine).includes('artifact')
  );
}

function isCardDraw(card: DeckCard): boolean {
  const text = lower(card.oracleText);
  return (
    text.includes('draw a card') ||
    text.includes('draw two cards') ||
    text.includes('draw three cards') ||
    text.includes('draw x cards') ||
    (text.includes('whenever') && text.includes('draw'))
  );
}

function isRemoval(card: DeckCard): boolean {
  const text = lower(card.oracleText);
  return (
    text.includes('destroy target') ||
    text.includes('exile target') ||
    (text.includes('deals') && text.includes('damage to target creature')) ||
    (text.includes('return target') && text.includes("to its owner's hand")) ||
    text.includes('sacrifices a creature')
  );
}

function isBoardWipe(card: DeckCard): boolean {
  const text = lower(card.oracleText);
  return (
    text.includes('destroy all creatures') ||
    text.includes('exile all creatures') ||
    (text.includes('deals') && text.includes('damage to each creature')) ||
    (text.includes('each creature') && text.includes('gets -'))
  );
}

function isProtection(card: DeckCard): boolean {
  const text = lower(card.oracleText);
  return (
    text.includes('hexproof') ||
    text.includes('indestructible') ||
    text.includes('protection from') ||
    text.includes('phase out') ||
    text.includes('prevent all damage')
  );
}

function isFinisher(card: DeckCard): boolean {
  const text = `${lower(card.name)} ${lower(card.oracleText)}`;
  const cmc = card.cmc ?? 0;

  return (
    text.includes('double the number') ||
    text.includes('extra combat') ||
    text.includes('creatures you control get') ||
    text.includes('damage to each opponent') ||
    text.includes('lose life') ||
    text.includes('win the game') ||
    cmc >= 6
  );
}

function getAverageCmc(cards: DeckCard[]): number {
  const cardsWithCmc = cards.filter((card) => typeof card.cmc === 'number');
  if (cardsWithCmc.length === 0) return 0;

  const total = cardsWithCmc.reduce((sum, card) => sum + (card.cmc ?? 0), 0);
  return total / cardsWithCmc.length;
}

function getStatus(concernCount: number): 'Balanced' | 'Needs Work' | 'Unbalanced' {
  if (concernCount <= 2) return 'Balanced';
  if (concernCount <= 5) return 'Needs Work';
  return 'Unbalanced';
}

export function analyzeDeckBalance(deck: DeckForBalance): DeckBalanceBreakdown {
  const landCount = getTotalLands(deck.basicLands);
  const cards = deck.cards;

  const creatureCount = cards.filter(isCreature).length;
  const nonCreatureCount = cards.length - creatureCount;
  const rampCount = cards.filter(isRamp).length;
  const drawCount = cards.filter(isCardDraw).length;
  const removalCount = cards.filter(isRemoval).length;
  const boardWipeCount = cards.filter(isBoardWipe).length;
  const protectionCount = cards.filter(isProtection).length;
  const finisherCount = cards.filter(isFinisher).length;
  const averageCmc = getAverageCmc(cards);

  const strengths: string[] = [];
  const concerns: string[] = [];
  const recommendations: string[] = [];

  if (landCount >= 34 && landCount <= 39) {
    strengths.push(`Land count looks healthy at ${landCount}.`);
  } else if (landCount < 34) {
    concerns.push(`Land count is low at ${landCount}.`);
    recommendations.push(`Add ${34 - landCount} more land cards.`);
  } else if (landCount > 39) {
    concerns.push(`Land count is high at ${landCount}.`);
    recommendations.push(`Consider cutting ${landCount - 39} lands for more action spells.`);
  }

  if (averageCmc > 0 && averageCmc <= 3.5) {
    strengths.push(`Average mana value looks reasonable at ${averageCmc.toFixed(1)}.`);
  } else if (averageCmc > 3.5 && averageCmc <= 4.2) {
    concerns.push(`Average mana value is a little heavy at ${averageCmc.toFixed(1)}.`);
    recommendations.push('Consider trimming a few higher-cost spells to smooth early turns.');
  } else if (averageCmc > 4.2) {
    concerns.push(`Average mana value is very high at ${averageCmc.toFixed(1)}.`);
    recommendations.push('Cut several expensive spells and add cheaper setup cards.');
  }

  if (rampCount >= 8) {
    strengths.push(`Ramp support looks strong at ${rampCount} cards.`);
  } else if (rampCount >= 5) {
    concerns.push(`Ramp support is only moderate at ${rampCount} cards.`);
    recommendations.push(`Add ${8 - rampCount} more ramp pieces.`);
  } else {
    concerns.push(`Ramp support is low at ${rampCount} cards.`);
    recommendations.push(`Add ${8 - rampCount} more ramp pieces so the deck can develop faster.`);
  }

  if (drawCount >= 8) {
    strengths.push(`Card draw looks solid at ${drawCount} cards.`);
  } else if (drawCount >= 5) {
    concerns.push(`Card draw is a little light at ${drawCount} cards.`);
    recommendations.push(`Add ${8 - drawCount} more draw effects.`);
  } else {
    concerns.push(`Card draw is very light at ${drawCount} cards.`);
    recommendations.push(`Add ${8 - drawCount} more draw effects so the deck does not run out of gas.`);
  }

  if (removalCount >= 6) {
    strengths.push(`Single-target interaction looks solid at ${removalCount} cards.`);
  } else if (removalCount >= 4) {
    concerns.push(`Removal is slightly light at ${removalCount} cards.`);
    recommendations.push(`Add ${6 - removalCount} more spot removal spells.`);
  } else {
    concerns.push(`Removal is low at ${removalCount} cards.`);
    recommendations.push(`Add ${6 - removalCount} more spot removal spells to handle threats.`);
  }

  if (boardWipeCount >= 2) {
    strengths.push(`Board wipe coverage looks healthy at ${boardWipeCount} cards.`);
  } else if (boardWipeCount === 1) {
    concerns.push('Only 1 board wipe was detected.');
    recommendations.push('Add 1 more board wipe for better recovery tools.');
  } else {
    concerns.push('No board wipes were detected.');
    recommendations.push('Add 2 board wipes to avoid getting overwhelmed.');
  }

  if (protectionCount >= 3) {
    strengths.push(`Protection support looks good at ${protectionCount} cards.`);
  } else if (protectionCount >= 1) {
    concerns.push(`Protection is light at ${protectionCount} cards.`);
    recommendations.push(`Add ${3 - protectionCount} more protection pieces for your main plan.`);
  } else {
    concerns.push('No protection pieces were detected.');
    recommendations.push('Add 2 to 3 protection cards so your game plan survives disruption.');
  }

  if (finisherCount >= 4) {
    strengths.push(`The deck has multiple finishers at ${finisherCount} cards.`);
  } else if (finisherCount >= 2) {
    concerns.push(`Finisher count is only moderate at ${finisherCount} cards.`);
    recommendations.push(`Add ${4 - finisherCount} stronger game-ending cards.`);
  } else {
    concerns.push(`Finisher count is low at ${finisherCount} cards.`);
    recommendations.push('Add 2 to 4 clearer win-condition cards.');
  }

  if (creatureCount >= 20) {
    strengths.push(`Creature count is healthy at ${creatureCount}.`);
  } else if (creatureCount < 10) {
    concerns.push(`Creature count is very low at ${creatureCount}.`);
    recommendations.push('Make sure this spell-heavy build has enough payoff or board presence.');
  }

  if (cards.length < 50) {
    concerns.push('This deck looks incomplete, so balance analysis is only a rough estimate.');
    recommendations.push('Finish building out the list before treating this analysis as final.');
  }

  const status = getStatus(concerns.length);

  let summary = `${deck.name} is currently rated as ${status}. `;
  if (status === 'Balanced') {
    summary += 'The deck structure looks healthy overall, with only a few areas to refine.';
  } else if (status === 'Needs Work') {
    summary += 'The deck has a workable shell, but several categories need improvement.';
  } else {
    summary += 'The deck has multiple structural gaps that should be corrected before it will run smoothly.';
  }

  return {
    status,
    summary,
    landCount,
    averageCmc,
    creatureCount,
    nonCreatureCount,
    rampCount,
    drawCount,
    removalCount,
    boardWipeCount,
    protectionCount,
    finisherCount,
    strengths,
    concerns,
    recommendations,
  };
}