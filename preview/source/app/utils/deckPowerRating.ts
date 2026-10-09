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

type DeckForRating = {
  name: string;
  commander?: string;
  cards: DeckCard[];
  basicLands: BasicLandCounts;
};

export type DeckPowerBreakdown = {
  score: number;
  label: string;
  summary: string;
  speed: number;
  consistency: number;
  synergy: number;
  resilience: number;
  finishPotential: number;
  strengths: string[];
  concerns: string[];
};

function getTotalLands(basicLands: BasicLandCounts): number {
  return Object.values(basicLands).reduce((sum, count) => sum + count, 0);
}

function lower(text?: string): string {
  return (text || '').toLowerCase();
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
    text.includes('whenever') && text.includes('draw')
  );
}

function isRemoval(card: DeckCard): boolean {
  const text = lower(card.oracleText);
  return (
    text.includes('destroy target') ||
    text.includes('exile target') ||
    text.includes('deals') && text.includes('damage to target creature') ||
    text.includes('return target') && text.includes('to its owner\'s hand') ||
    text.includes('sacrifices a creature')
  );
}

function isBoardWipe(card: DeckCard): boolean {
  const text = lower(card.oracleText);
  return (
    text.includes('destroy all creatures') ||
    text.includes('exile all creatures') ||
    text.includes('each creature') && text.includes('takes') ||
    text.includes('deals') && text.includes('damage to each creature')
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

function isTutor(card: DeckCard): boolean {
  const text = lower(card.oracleText);
  return (
    text.includes('search your library for a card') ||
    text.includes('search your library for an artifact') ||
    text.includes('search your library for a creature') ||
    text.includes('search your library for an enchantment')
  );
}

function isFinisher(card: DeckCard): boolean {
  const text = `${lower(card.name)} ${lower(card.oracleText)}`;
  const cmc = card.cmc ?? 0;

  return (
    text.includes('double the number') ||
    text.includes('extra combat') ||
    text.includes('creatures you control get') ||
    text.includes('whenever a creature enters') ||
    text.includes('lose life') ||
    text.includes('damage to each opponent') ||
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

function clampScore(value: number): number {
  if (value < 1) return 1;
  if (value > 5) return 5;
  return Math.round(value * 10) / 10;
}

function getLabel(score: number): string {
  if (score < 1.5) return 'Very Casual';
  if (score < 2.5) return 'Casual';
  if (score < 3.5) return 'Focused Casual';
  if (score < 4.5) return 'Optimized / Strong';
  return 'High-Power / Near-cEDH';
}

export function rateDeckPower(deck: DeckForRating): DeckPowerBreakdown {
  const lands = getTotalLands(deck.basicLands);
  const cards = deck.cards;
  const totalCards = cards.length + lands;

  const creatures = cards.filter(isCreature).length;
  const ramp = cards.filter(isRamp).length;
  const draw = cards.filter(isCardDraw).length;
  const removal = cards.filter(isRemoval).length;
  const wipes = cards.filter(isBoardWipe).length;
  const protection = cards.filter(isProtection).length;
  const tutors = cards.filter(isTutor).length;
  const finishers = cards.filter(isFinisher).length;

  const averageCmc = getAverageCmc(cards);

  let speed = 1;
  let consistency = 1;
  let synergy = 1;
  let resilience = 1;
  let finishPotential = 1;

  if (averageCmc > 0 && averageCmc <= 2.5) speed += 2;
  else if (averageCmc <= 3.2) speed += 1.5;
  else if (averageCmc <= 4) speed += 1;
  else speed += 0.4;

  if (ramp >= 10) speed += 1;
  else if (ramp >= 6) speed += 0.5;

  if (draw >= 10) consistency += 1.5;
  else if (draw >= 6) consistency += 1;

  if (tutors >= 3) consistency += 1.2;
  else if (tutors >= 1) consistency += 0.6;

  if (lands >= 34 && lands <= 39) consistency += 1;
  else if (lands >= 32 && lands <= 41) consistency += 0.5;

  if (creatures >= 22) synergy += 0.8;
  if (finishers >= 4) synergy += 1;
  if (ramp >= 8 && draw >= 8 && removal >= 6) synergy += 1.2;
  else if (ramp >= 5 && draw >= 5 && removal >= 4) synergy += 0.7;

  if (protection >= 4) resilience += 1.5;
  else if (protection >= 2) resilience += 0.8;

  if (wipes >= 2) resilience += 0.7;
  if (removal >= 6) resilience += 0.7;

  if (finishers >= 6) finishPotential += 2;
  else if (finishers >= 3) finishPotential += 1.2;

  if (tutors >= 2) finishPotential += 0.5;
  if (averageCmc > 0 && averageCmc <= 3.2) finishPotential += 0.5;

  speed = clampScore(speed);
  consistency = clampScore(consistency);
  synergy = clampScore(synergy);
  resilience = clampScore(resilience);
  finishPotential = clampScore(finishPotential);

  const overall =
    speed * 0.22 +
    consistency * 0.22 +
    synergy * 0.22 +
    resilience * 0.16 +
    finishPotential * 0.18;

  const score = clampScore(overall);
  const label = getLabel(score);

  const strengths: string[] = [];
  const concerns: string[] = [];

  if (ramp >= 8) strengths.push(`Ramp package looks solid at ${ramp} cards.`);
  if (draw >= 8) strengths.push(`Card draw support is healthy at ${draw} cards.`);
  if (removal >= 6) strengths.push(`Interaction package is respectable at ${removal} removal pieces.`);
  if (protection >= 3) strengths.push(`The deck has some resilience with ${protection} protection cards.`);
  if (finishers >= 4) strengths.push(`The deck has multiple ways to close games with ${finishers} finisher-level cards.`);

  if (lands < 34) concerns.push(`Land count looks low at ${lands}. The deck may stumble early.`);
  if (lands > 40) concerns.push(`Land count looks high at ${lands}. The deck may flood.`);
  if (draw < 6) concerns.push(`Card draw appears light at ${draw}. The deck may run out of gas.`);
  if (ramp < 6) concerns.push(`Ramp support looks low at ${ramp}. The deck may be slow out of the gate.`);
  if (removal < 5) concerns.push(`Interaction looks thin at ${removal}. Problem permanents may stick.`);
  if (protection < 2) concerns.push(`Protection is limited at ${protection}. Your game plan may fold to disruption.`);
  if (averageCmc > 4) concerns.push(`Average mana value is high at ${averageCmc.toFixed(1)}. The deck may be clunky.`);
  if (totalCards < 60) concerns.push('This deck appears incomplete, so the rating is only a rough estimate.');

  let summary = `${deck.name} rates as ${label} (${score}/5). `;
  summary += `It shows `;
  summary += score >= 4
    ? 'strong synergy and a more competitive structure.'
    : score >= 3
    ? 'a focused casual shell with room to optimize.'
    : 'a casual foundation that still needs tuning for stronger performance.';

  return {
    score,
    label,
    summary,
    speed,
    consistency,
    synergy,
    resilience,
    finishPotential,
    strengths,
    concerns,
  };
}