import {
  BasicLandCounts,
  DeckCard,
  DeckForUpgrade,
  DeckStatus,
} from '../../types/deckUpgrade';

export function lower(text?: string): string {
  return (text || '').toLowerCase();
}

export function normalizeName(name?: string): string {
  return lower(name).replace(/\s+/g, ' ').trim();
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function getCombinedText(card: DeckCard): string {
  return `${lower(card.name)} ${lower(card.typeLine)} ${lower(card.oracleText)}`.trim();
}

export function getTotalBasicLands(basicLands: BasicLandCounts): number {
  return Object.values(basicLands).reduce((sum, count) => sum + count, 0);
}

export function isLandTypeLine(typeLine?: string): boolean {
  return lower(typeLine).includes('land');
}

export function isBasicLandTypeLine(typeLine?: string): boolean {
  const line = lower(typeLine);
  return line.includes('land') && line.includes('basic');
}

export function getNonBasicLandCards(deck: DeckForUpgrade): DeckCard[] {
  return deck.cards.filter((card) => {
    return isLandTypeLine(card.typeLine) && !isBasicLandTypeLine(card.typeLine);
  });
}

export function getAllLandCount(deck: DeckForUpgrade): number {
  return getTotalBasicLands(deck.basicLands) + getNonBasicLandCards(deck).length;
}

export function getCommanderIncluded(deck: DeckForUpgrade): boolean {
  return !!normalizeName(deck.commander);
}

export function getMainDeckCount(deck: DeckForUpgrade): number {
  return deck.cards.length + getTotalBasicLands(deck.basicLands);
}

export function getTotalDeckCount(deck: DeckForUpgrade): number {
  return getMainDeckCount(deck) + (getCommanderIncluded(deck) ? 1 : 0);
}

export function getDeckStatus(totalDeckCount: number): DeckStatus {
  if (totalDeckCount < 100) return 'under';
  if (totalDeckCount > 100) return 'over';
  return 'exact';
}

export function buildDeckNameSet(deck: DeckForUpgrade): Set<string> {
  const names = new Set<string>();

  for (const card of deck.cards) {
    names.add(normalizeName(card.name));
  }

  for (const landName of Object.keys(deck.basicLands)) {
    const typedLandName = landName as keyof BasicLandCounts;
    if ((deck.basicLands[typedLandName] || 0) > 0) {
      names.add(normalizeName(landName));
    }
  }

  if (deck.commander) {
    names.add(normalizeName(deck.commander));
  }

  return names;
}

export function buildExactDeckCardBuckets(deck: DeckForUpgrade): Map<string, DeckCard[]> {
  const buckets = new Map<string, DeckCard[]>();

  for (const card of deck.cards) {
    const key = normalizeName(card.name);
    const existing = buckets.get(key) ?? [];
    existing.push(card);
    buckets.set(key, existing);
  }

  return buckets;
}

export function cardMatchesExactLoadedCard(candidate: DeckCard, loaded: DeckCard): boolean {
  if (normalizeName(candidate.name) !== normalizeName(loaded.name)) {
    return false;
  }

  if (candidate.oracleId && loaded.oracleId) {
    return candidate.oracleId === loaded.oracleId;
  }

  if (candidate.scryfallId && loaded.scryfallId) {
    return candidate.scryfallId === loaded.scryfallId;
  }

  if ((candidate.typeLine || '') && (loaded.typeLine || '')) {
    if (candidate.typeLine !== loaded.typeLine) return false;
  }

  if ((candidate.oracleText || '') && (loaded.oracleText || '')) {
    if (candidate.oracleText !== loaded.oracleText) return false;
  }

  return true;
}

export function resolveExactLoadedDeckCard(
  deck: DeckForUpgrade,
  candidate?: DeckCard,
): DeckCard | undefined {
  if (!candidate) return undefined;

  const buckets = buildExactDeckCardBuckets(deck);
  const bucket = buckets.get(normalizeName(candidate.name)) ?? [];

  for (const loaded of bucket) {
    if (cardMatchesExactLoadedCard(candidate, loaded)) {
      return loaded;
    }
  }

  return bucket[0];
}

export function hasCard(deck: DeckForUpgrade, cardName: string): boolean {
  return buildDeckNameSet(deck).has(normalizeName(cardName));
}