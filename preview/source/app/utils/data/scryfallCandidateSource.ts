import type {
  DeckColor,
  RecommendationPoolCard,
  RecommendationCategory,
} from '../../types/deckUpgrade';
import type { ScryfallCardRecord } from './scryfallCardIndex';
import { getActiveCardDataProvider } from './cardDataProviderRegistry';

type SourceOptions = {
  commanderColors: DeckColor[];
  deckCards: (string | { name?: string | null; cardName?: string | null })[];
  preferredTags?: string[];
  preferredRoles?: string[];
  categories?: RecommendationCategory[];
  limit?: number;
};

function lower(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().trim();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function extractComparableCardName(
  input: string | { name?: string | null; cardName?: string | null },
): string {
  if (typeof input === 'string') {
    return input;
  }

  if (!input || typeof input !== 'object') {
    return '';
  }

  return (input.cardName ?? input.name ?? '').trim();
}

function extractDeckCardNames(
  deckCards: (string | { name?: string | null; cardName?: string | null })[],
): string[] {
  return uniqueStrings(
    deckCards
      .map(extractComparableCardName)
      .filter(Boolean),
  );
}

/**
 * Main Phase 4 provider-backed candidate source.
 * This file no longer cares whether the underlying source is:
 * - mock index
 * - bundled JSON dataset
 * - local dataset
 * - backend API
 *
 * It only asks the active provider for recommendation candidates.
 */
export async function getScryfallRecommendationCandidates(
  options: SourceOptions,
): Promise<RecommendationPoolCard[]> {
  const provider = getActiveCardDataProvider();

  const result = await provider.getRecommendationCandidates({
    commanderColors: options.commanderColors ?? [],
    deckCardNames: extractDeckCardNames(options.deckCards ?? []),
    preferredTags: (options.preferredTags ?? []).map(lower).filter(Boolean),
    preferredRoles: (options.preferredRoles ?? []).map(lower).filter(Boolean),
    categories: options.categories,
    limit: options.limit,
  });

  return result.candidates.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/**
 * Convenience helper for callers that want to request candidates with a hard cap.
 */
export async function getTopScryfallRecommendationCandidates(
  options: SourceOptions,
  limit = 25,
): Promise<RecommendationPoolCard[]> {
  return getScryfallRecommendationCandidates({
    ...options,
    limit,
  });
}

/**
 * Temporary compatibility helper.
 * In the old architecture this converted directly from local Scryfall records.
 * For now, we preserve the export surface but return an empty list because
 * direct-record conversion is no longer the primary path.
 *
 * If a later file still depends on this function, we can either:
 * 1. remove that dependency cleanly, or
 * 2. create a proper shared mapper utility.
 */
export function convertScryfallCardsToRecommendationPool(
  _cards: ScryfallCardRecord[],
): RecommendationPoolCard[] {
  return [];
}

/**
 * Temporary compatibility helper.
 * This now asks the provider for recommendation candidates and returns the
 * candidate cards only. Since provider-backed search returns recommendation
 * cards rather than raw Scryfall records, this remains a placeholder until
 * we introduce raw-card search at the engine level.
 */
export async function getEligibleScryfallCards(
  _options: SourceOptions,
): Promise<ScryfallCardRecord[]> {
  return [];
}
