import type { ScryfallCardRecord } from './scryfallCardIndex';

/**
 * Normalized representation used for:
 * - duplicate-safe card comparisons
 * - "already in deck" exclusion checks
 * - future multiple-printing handling
 *
 * This file is intentionally utility-only.
 * No scoring, no engine logic, no UI behavior.
 */

export type CardNameLike =
  | string
  | null
  | undefined
  | {
      name?: string | null;
      cardName?: string | null;
    };

export interface ScryfallNormalizedCardIdentity {
  rawName: string;
  normalizedName: string;
  oracleKey: string;
  exclusionKeys: string[];
}

function coerceToString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Lightweight canonical string normalization for card comparison.
 * Keeps slash-separated names intact for split/adventure/DFC handling.
 */
export function normalizeCardName(name: string | null | undefined): string {
  const safe = collapseWhitespace(coerceToString(name));

  if (!safe) return '';

  return stripDiacritics(safe)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/,/g, '')
    .replace(/\s*\/\/\s*/g, ' // ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns the individual normalized face names for multi-face cards.
 * Example:
 * "Wear // Tear" => ["wear", "tear"]
 */
export function getNormalizedFaceNames(name: string | null | undefined): string[] {
  const normalized = normalizeCardName(name);
  if (!normalized) return [];

  return normalized
    .split('//')
    .map((part) => collapseWhitespace(part))
    .filter(Boolean);
}

/**
 * Builds a stable oracle-like identity key.
 * Prefer oracle_id if present because it is the best cross-print identity.
 * Fallback to normalized name when oracle_id is unavailable.
 */
export function buildOracleKey(card: Partial<ScryfallCardRecord> | null | undefined): string {
  if (!card) return '';

  const oracleId = coerceToString((card as { oracle_id?: unknown }).oracle_id).trim();
  if (oracleId) return `oracle:${oracleId}`;

  const normalizedName = normalizeCardName(card.name);
  if (!normalizedName) return '';

  return `name:${normalizedName}`;
}

/**
 * Builds exclusion keys for a Scryfall card.
 * This is intentionally broader than oracle identity so we can safely
 * exclude already-owned cards even if printings vary.
 */
export function buildScryfallExclusionKeys(
  card: Partial<ScryfallCardRecord> | null | undefined
): string[] {
  if (!card) return [];

  const keys = new Set<string>();

  const normalizedName = normalizeCardName(card.name);
  if (normalizedName) {
    keys.add(`name:${normalizedName}`);

    const faceNames = getNormalizedFaceNames(card.name);
    faceNames.forEach((face) => {
      if (face) keys.add(`face:${face}`);
    });
  }

  const oracleKey = buildOracleKey(card);
  if (oracleKey) keys.add(oracleKey);

  const scryfallId = coerceToString((card as { id?: unknown }).id).trim();
  if (scryfallId) keys.add(`print:${scryfallId}`);

  return Array.from(keys);
}

/**
 * Creates a normalized identity object for a Scryfall card record.
 */
export function getScryfallNormalizedIdentity(
  card: Partial<ScryfallCardRecord> | null | undefined
): ScryfallNormalizedCardIdentity {
  const rawName = collapseWhitespace(coerceToString(card?.name));
  const normalizedName = normalizeCardName(rawName);
  const oracleKey = buildOracleKey(card);
  const exclusionKeys = buildScryfallExclusionKeys(card);

  return {
    rawName,
    normalizedName,
    oracleKey,
    exclusionKeys,
  };
}

/**
 * Pull a comparable card name from deck objects without tightly coupling
 * this file to deck UI types.
 */
export function extractComparableCardName(input: CardNameLike): string {
  if (typeof input === 'string') {
    return input;
  }

  if (!input || typeof input !== 'object') {
    return '';
  }

  return coerceToString(input.cardName ?? input.name);
}

/**
 * Normalize a raw deck card name into the same exclusion-key format
 * used by Scryfall cards.
 */
export function buildDeckNameExclusionKeys(input: CardNameLike): string[] {
  const name = extractComparableCardName(input);
  const normalizedName = normalizeCardName(name);

  if (!normalizedName) return [];

  const keys = new Set<string>();
  keys.add(`name:${normalizedName}`);

  const faceNames = getNormalizedFaceNames(name);
  faceNames.forEach((face) => {
    if (face) keys.add(`face:${face}`);
  });

  return Array.from(keys);
}

/**
 * Build a fast lookup set from the currently loaded deck.
 * This will be used by the future candidate source to avoid recommending
 * cards already present in the deck, regardless of printing/version.
 */
export function buildDeckExclusionSet(deckCards: CardNameLike[]): Set<string> {
  const exclusionSet = new Set<string>();

  deckCards.forEach((card) => {
    const keys = buildDeckNameExclusionKeys(card);
    keys.forEach((key) => exclusionSet.add(key));
  });

  return exclusionSet;
}

/**
 * Check whether a Scryfall card should be excluded because the deck
 * already appears to contain that card.
 */
export function isCardExcludedByDeck(
  card: Partial<ScryfallCardRecord> | null | undefined,
  deckExclusionSet: Set<string>
): boolean {
  if (!card || deckExclusionSet.size === 0) return false;

  const cardKeys = buildScryfallExclusionKeys(card);
  return cardKeys.some((key) => deckExclusionSet.has(key));
}

/**
 * Deduplicate multiple printings / variants of the same functional card.
 * Prefers the first occurrence for now, which keeps this layer predictable.
 * Later we can add "best printing preference" rules here without touching
 * the scoring engine.
 */
export function dedupeScryfallCardsByOracleIdentity<T extends Partial<ScryfallCardRecord>>(
  cards: T[]
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  cards.forEach((card) => {
    const key = buildOracleKey(card);
    const fallback = key || `print:${coerceToString((card as { id?: unknown }).id)}`;

    if (!fallback || seen.has(fallback)) return;

    seen.add(fallback);
    result.push(card);
  });

  return result;
}

/**
 * Optional helper for name-only deduping where oracle_id may not exist.
 * Useful for early mock datasets.
 */
export function dedupeStringsByNormalizedCardName(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  names.forEach((name) => {
    const normalized = normalizeCardName(name);
    if (!normalized || seen.has(normalized)) return;

    seen.add(normalized);
    result.push(name);
  });

  return result;
}