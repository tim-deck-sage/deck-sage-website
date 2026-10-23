import {planFacts,tokenLoopEvidence} from '../../../../public/canonical-evidence';
import { Deck, Card } from '../../context/DeckContext';
import { fetchCardByName, ScryfallCardData } from '../mtgCardApi';
import { generateDeckStrategy, DeckStrategy } from './deckStrategyEngine';

export type CardDeckFitVerdict =
  | 'Excellent upgrade candidate'
  | 'Strong fit'
  | 'Possible fit'
  | 'Legal but low impact'
  | 'Poor fit'
  | 'Already in deck'
  | 'Not legal for commander colors';

export type CardDeckFitResult = {
  deckId: string;
  deckName: string;
  commanderName: string;
  score: number;
  verdict: CardDeckFitVerdict;
  summary: string;
  whyItFits: string[];
  concerns: string[];
  deckStrengths: string[];
  deckWeaknesses: string[];
  candidateCard: ScryfallCardData;
};

export type CompareCardToDecksResult = {
  searchedName: string;
  resolvedCard: ScryfallCardData | null;
  results: CardDeckFitResult[];
  error?: string;
};

type EnrichedDeckSnapshot = {
  facts: ReturnType<typeof planFacts>;
  strategy: DeckStrategy;
  commanderColorIdentity: string[];
  cardNames: string[];
  cardTexts: string[];
  cardTypes: string[];
};

type CandidateSignals = {
  isCreature: boolean;
  isArtifact: boolean;
  isRemoval: boolean;
  isDraw: boolean;
  isRamp: boolean;
  isProtection: boolean;
  isTokenMaker: boolean;
  isSacOutlet: boolean;
  isDeathPayoff: boolean;
  isDamagePayoff: boolean;
  isAnthem: boolean;
  isComboLike: boolean;
  tribalWords: string[];
};

export async function compareCardToDecks(
  cardName: string,
  decks: Deck[]
): Promise<CompareCardToDecksResult> {
  const cleanedName = cardName.trim();

  if (!cleanedName) {
    return {
      searchedName: cardName,
      resolvedCard: null,
      results: [],
      error: 'Enter a card name first.',
    };
  }

  const candidateCard = await fetchCardByName(cleanedName);

  if (!candidateCard) {
    return {
      searchedName: cleanedName,
      resolvedCard: null,
      results: [],
      error: 'Deck Sage could not find that card through Scryfall.',
    };
  }

  const results: CardDeckFitResult[] = [];

  for (const deck of decks) {
    const result = await compareCardToSingleDeck(candidateCard, deck);
    results.push(result);
  }

  return {
    searchedName: cleanedName,
    resolvedCard: candidateCard,
    results: results.sort((a, b) => b.score - a.score),
  };
}

export async function compareCardToSingleDeck(
  candidateCard: ScryfallCardData,
  deck: Deck
): Promise<CardDeckFitResult> {
  const strategy = await generateDeckStrategy(deck);
  const commanders = deck.commanders?.length ? deck.commanders : deck.commanderCard ? [deck.commanderCard] : [];
  strategy.combos = tokenLoopEvidence([...commanders, ...deck.cards]).map(line=>({pieces:line.pieces,description:line.description,kind:'engine',priority:'medium'}));
  const snapshot = buildDeckSnapshot(deck, strategy);

  const alreadyInDeck = snapshot.cardNames.some(
    (name) => normalizeName(name) === normalizeName(candidateCard.name)
  );

  if (alreadyInDeck) {
    return {
      deckId: deck.id,
      deckName: deck.name,
      commanderName: deck.commander,
      score: -50,
      verdict: 'Already in deck',
      summary: `${candidateCard.name} is already in ${deck.name}.`,
      whyItFits: [],
      concerns: [],
      deckStrengths: [],
      deckWeaknesses: [],
      candidateCard,
    };
  }

  const colorLegal = isCardLegalForCommanderColors(
    candidateCard.color_identity ?? [],
    snapshot.commanderColorIdentity
  );

  if (!colorLegal) {
    return {
      deckId: deck.id,
      deckName: deck.name,
      commanderName: deck.commander,
      score: -100,
      verdict: 'Not legal for commander colors',
      summary: `${candidateCard.name} is the wrong mana type for ${deck.commander}.`,
      whyItFits: [],
      concerns: [],
      deckStrengths: [],
      deckWeaknesses: [],
      candidateCard,
    };
  }

  const candidateSignals = analyzeCandidateCard(candidateCard);
  const deckStrengths = detectDeckStrengths(snapshot);
  const deckWeaknesses = detectDeckWeaknesses(snapshot);

  const whyItFits: string[] = [];
  const concerns: string[] = [];

  let score = 20;

  const facts = snapshot.facts;
  const commanderName = normalize(deck.commander);
  const candidateText = normalize(candidateCard.oracle_text);
  const candidateName = normalize(candidateCard.name);

  if (candidateName.includes(commanderName) || candidateText.includes(commanderName)) {
    score += 12;
    whyItFits.push(`It directly references or supports ${deck.commander}.`);
  }

  if (facts.tokens && candidateSignals.isTokenMaker) {
    score += 18;
    whyItFits.push('It supports the deck’s token plan.');
  }

  if (facts.goWide && (candidateSignals.isTokenMaker || candidateSignals.isAnthem)) {
    score += 16;
    whyItFits.push('It helps a go-wide deck create or reward a larger board.');
  }

  if (facts.sacrifice && candidateSignals.isSacOutlet) {
    score += 18;
    whyItFits.push('It adds another sacrifice outlet, which fits the deck’s resource engine.');
  }

  if (facts.sacrifice && candidateSignals.isDeathPayoff) {
    score += 15;
    whyItFits.push('It rewards creatures dying, which fits a sacrifice-value strategy.');
  }

  if (
    (facts.damage || facts.combat) &&
    candidateSignals.isDamagePayoff
  ) {
    score += 16;
    whyItFits.push('It gives the deck another way to convert board presence into damage.');
  }

  if (candidateSignals.isProtection && facts.commander) {
    score += 16;
    whyItFits.push('It can help protect the commander or another high-impact engine piece.');
  }

  if (candidateSignals.isDraw) {
    if (deckWeaknesses.some((weakness) => weakness.toLowerCase().includes('card draw'))) {
      score += 22;
      whyItFits.push('It helps fix one of this deck’s likely weaknesses: card draw.');
    } else {
      score += 8;
      whyItFits.push('Extra card draw is useful, though this may not be the deck’s biggest need.');
    }
  }

  if (candidateSignals.isRamp) {
    if (deckWeaknesses.some((weakness) => weakness.toLowerCase().includes('mana'))) {
      score += 20;
      whyItFits.push('It helps the deck with mana development.');
    } else {
      score += 7;
      whyItFits.push('Mana acceleration is useful, but this deck may already have ramp support.');
    }
  }

  if (candidateSignals.isRemoval) {
    if (deckWeaknesses.some((weakness) => weakness.toLowerCase().includes('interaction'))) {
      score += 20;
      whyItFits.push('It improves interaction, which appears to be a weak point.');
    } else {
      score += 8;
      whyItFits.push('It gives the deck another answer to opposing threats.');
    }
  }

  const tribalHits = candidateSignals.tribalWords.filter((word) =>
    snapshot.cardTexts.some((text) => text.includes(word)) ||
    snapshot.cardTypes.some((type) => type.includes(word))
  );

  if (tribalHits.length > 0) {
    score += 12 + tribalHits.length * 3;
    whyItFits.push(`It connects with the deck’s ${tribalHits.join('/')} theme.`);
  }

  if ((candidateCard.cmc ?? 0) >= 6) {
    score -= 4;
    concerns.push('This card is expensive, so it needs to create a strong impact when cast.');
  }

  if (
    candidateSignals.isCreature &&
    deckWeaknesses.some((weakness) => weakness.toLowerCase().includes('overextend'))
  ) {
    concerns.push('Adding another creature may increase the deck’s weakness to board wipes unless it protects, replaces itself, or creates immediate value.');
  }

  if (
    candidateSignals.isArtifact &&
    !facts.artifacts &&
    !candidateSignals.isRamp &&
    !candidateSignals.isProtection &&
    !candidateSignals.isComboLike
  ) {
    score -= 8;
    concerns.push('This artifact does not clearly connect to the deck’s main plan from the current list.');
  }

  if (whyItFits.length === 0) {
    score += 2;
    concerns.push('The card is legal, but Deck Sage does not see a strong strategy connection from the current deck data.');
  }

  const verdict = buildVerdict(score);
  const summary = buildSummary(candidateCard.name, deck.name, verdict, whyItFits, concerns);

  return {
    deckId: deck.id,
    deckName: deck.name,
    commanderName: deck.commander,
    score,
    verdict,
    summary,
    whyItFits,
    concerns,
    deckStrengths,
    deckWeaknesses,
    candidateCard,
  };
}

function buildDeckSnapshot(deck: Deck, strategy: DeckStrategy): EnrichedDeckSnapshot {
  const cards: Card[] = [
    ...(deck.commanderCard ? [deck.commanderCard] : []),
    ...(deck.cards || []),
  ];

  const commanderColorIdentity =
    deck.commanderCard?.colorIdentity ??
    deck.cards.find((card) => normalizeName(card.name) === normalizeName(deck.commander))
      ?.colorIdentity ??
    [];

  return {
    strategy,
    facts: planFacts(deck),
    commanderColorIdentity,
    cardNames: cards.map((card) => card.name),
    cardTexts: cards.map((card) => normalize(card.oracleText)),
    cardTypes: cards.map((card) => normalize(card.typeLine)),
  };
}

function analyzeCandidateCard(card: ScryfallCardData): CandidateSignals {
  const text = normalize(card.oracle_text);
  const type = normalize(card.type_line);
  const name = normalize(card.name);

  const tribalWords = ['goblin', 'elf', 'zombie', 'soldier', 'vampire', 'dragon', 'angel']
    .filter((word) => type.includes(word) || text.includes(word) || name.includes(word));

  return {
    isCreature: type.includes('creature'),
    isArtifact: type.includes('artifact'),
    isRemoval:
      text.includes('destroy target') ||
      text.includes('exile target') ||
      text.includes('counter target') ||
      text.includes('deals damage to target creature') ||
      text.includes('return target creature'),
    isDraw:
      text.includes('draw a card') ||
      text.includes('draw two cards') ||
      text.includes('draw cards'),
    isRamp:
      text.includes('add {') ||
      text.includes('treasure token') ||
      text.includes('search your library for a basic land') ||
      text.includes('search your library for up to'),
    isProtection:
      text.includes('hexproof') ||
      text.includes('indestructible') ||
      text.includes('protection from') ||
      text.includes('ward') ||
      text.includes("can't be the target") ||
      text.includes('regenerate'),
    isTokenMaker: text.includes('create') && text.includes('token'),
    isSacOutlet:
      text.includes('sacrifice a ') ||
      text.includes('sacrifice another') ||
      text.includes('sacrifice:') ||
      text.includes('sacrifice one'),
    isDeathPayoff:
      text.includes('whenever') &&
      (text.includes('dies') ||
        text.includes('is put into a graveyard') ||
        text.includes('leaves the battlefield')),
    isDamagePayoff:
      text.includes('deals damage') ||
      text.includes('each opponent loses') ||
      text.includes('each opponent'),
    isAnthem:
      text.includes('creatures you control get') ||
      text.includes('other creatures you control get') ||
      text.includes('get +1/+1') ||
      text.includes('get +2/+'),
    isComboLike:
      text.includes('untap') ||
      text.includes('whenever') ||
      text.includes('copy') ||
      text.includes('double') ||
      text.includes('additional combat') ||
      text.includes('you may cast') ||
      text.includes('without paying its mana cost'),
    tribalWords,
  };
}

function detectDeckStrengths(snapshot: EnrichedDeckSnapshot): string[] {
  const text = snapshot.cardTexts.join(' ');
  const type = snapshot.cardTypes.join(' ');
  const strengths: string[] = [];

  if (countIncludes(snapshot.cardTexts, 'create') >= 5 && text.includes('token')) {
    strengths.push('Strong token production');
  }

  if (countIncludes(snapshot.cardTexts, 'draw a card') >= 4) {
    strengths.push('Reliable card draw');
  }

  if (countIncludes(snapshot.cardTexts, 'add {') >= 4 || countIncludes(snapshot.cardTexts, 'treasure token') >= 3) {
    strengths.push('Good mana development');
  }

  if (
    countIncludes(snapshot.cardTexts, 'destroy target') >= 3 ||
    countIncludes(snapshot.cardTexts, 'exile target') >= 3 ||
    countIncludes(snapshot.cardTexts, 'counter target') >= 3
  ) {
    strengths.push('Healthy interaction package');
  }

  if (
    text.includes('hexproof') ||
    text.includes('indestructible') ||
    text.includes('ward') ||
    text.includes("can't be the target")
  ) {
    strengths.push('Some protection for key pieces');
  }

  if (
    type.includes('goblin') ||
    type.includes('elf') ||
    type.includes('zombie') ||
    type.includes('vampire') ||
    type.includes('dragon') ||
    type.includes('angel')
  ) {
    strengths.push('Clear creature type synergy');
  }

  if (snapshot.strategy.combos.length > 0) {
    strengths.push('A conditional package with explicit starting prerequisites');
  }

  return uniqueOrFallback(strengths, ['Synergy-driven game plan']);
}

function detectDeckWeaknesses(snapshot: EnrichedDeckSnapshot): string[] {
  const weaknesses: string[] = [];
  const text = snapshot.cardTexts.join(' ');

  if (countIncludes(snapshot.cardTexts, 'draw a card') <= 2 && countIncludes(snapshot.cardTexts, 'draw cards') <= 1) {
    weaknesses.push('Limited card draw');
  }

  if (countIncludes(snapshot.cardTexts, 'add {') <= 2 && countIncludes(snapshot.cardTexts, 'treasure token') <= 1) {
    weaknesses.push('May need more mana acceleration');
  }

  if (
    countIncludes(snapshot.cardTexts, 'destroy target') <= 2 &&
    countIncludes(snapshot.cardTexts, 'exile target') <= 1 &&
    countIncludes(snapshot.cardTexts, 'counter target') <= 1
  ) {
    weaknesses.push('Limited interaction');
  }

  if (
    !text.includes('hexproof') &&
    !text.includes('indestructible') &&
    !text.includes('ward') &&
    !text.includes("can't be the target")
  ) {
    weaknesses.push('Limited protection for key pieces');
  }

  if (snapshot.facts.goWide) {
    weaknesses.push('Can overextend into board wipes');
  }

  return uniqueOrFallback(weaknesses, ['No major weakness detected from current card data']);
}

function isCardLegalForCommanderColors(
  cardColorIdentity: string[],
  commanderColorIdentity: string[]
): boolean {
  return cardColorIdentity.every((color) => commanderColorIdentity.includes(color));
}

function buildVerdict(score: number): CardDeckFitVerdict {
  if (score >= 70) return 'Excellent upgrade candidate';
  if (score >= 50) return 'Strong fit';
  if (score >= 30) return 'Possible fit';
  if (score >= 10) return 'Legal but low impact';
  return 'Poor fit';
}

function buildSummary(
  cardName: string,
  deckName: string,
  verdict: CardDeckFitVerdict,
  whyItFits: string[],
  concerns: string[]
): string {
  if (verdict === 'Excellent upgrade candidate' || verdict === 'Strong fit') {
    return `${cardName} looks like a real upgrade candidate for ${deckName}.`;
  }

  if (verdict === 'Possible fit') {
    return `${cardName} has some useful overlap with ${deckName}, but it is not an automatic upgrade.`;
  }

  if (verdict === 'Legal but low impact') {
    return `${cardName} is legal for ${deckName}, but Deck Sage does not see it solving a major need.`;
  }

  if (whyItFits.length === 0 && concerns.length > 0) {
    return `${cardName} does not look like a strong upgrade for ${deckName}.`;
  }

  return `${cardName} is probably not a strong fit for ${deckName}.`;
}

function countIncludes(items: string[], needle: string): number {
  return items.filter((item) => item.includes(needle)).length;
}

function normalize(value?: string): string {
  return (value || '').toLowerCase();
}

function normalizeName(value?: string): string {
  return normalize(value)
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueOrFallback(items: string[], fallback: string[]): string[] {
  const uniqueItems = Array.from(new Set(items));
  return uniqueItems.length > 0 ? uniqueItems : fallback;
}