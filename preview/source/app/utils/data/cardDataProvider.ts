import type {
  RecommendationPoolCard,
  DeckColor,
  RecommendationRole,
  RecommendationTag,
  RecommendationCategory,
} from '../../types/deckUpgrade';
import type { ScryfallCardRecord } from './scryfallCardIndex';
import { normalizeCardName } from './scryfallNormalization';

export type CardDataSourceKind =
  | 'mock-index'
  | 'local-dataset'
  | 'bundled-json'
  | 'backend-api'
  | 'remote-scryfall';

export interface CardSearchFilters {
  commanderColors?: DeckColor[];
  excludeCardNames?: string[];
  requiredTags?: string[];
  requiredRoles?: string[];
  categories?: RecommendationCategory[];
  legalInCommander?: boolean;
  maxCmc?: number;
  minCmc?: number;
  typeIncludes?: string[];
  textIncludes?: string[];
  limit?: number;
}

export interface CardSearchQuery {
  text?: string;
  exactName?: string;
  normalizedName?: string;
  filters?: CardSearchFilters;
}

export interface CardSearchResult {
  cards: ScryfallCardRecord[];
  total: number;
  source: CardDataSourceKind;
}

export interface CardLookupResult {
  card: ScryfallCardRecord | null;
  source: CardDataSourceKind;
}

export interface CandidateGenerationInput {
  commanderColors: DeckColor[];
  deckCardNames: string[];
  preferredTags?: string[];
  preferredRoles?: string[];
  categories?: RecommendationCategory[];
  limit?: number;
}

export interface CandidateGenerationResult {
  candidates: RecommendationPoolCard[];
  source: CardDataSourceKind;
  totalConsidered: number;
  totalReturned: number;
}

export interface CardDataProvider {
  readonly source: CardDataSourceKind;

  searchCards(query: CardSearchQuery): Promise<CardSearchResult>;

  getCardByExactName(name: string): Promise<CardLookupResult>;

  getCommanderLegalCardsForColors(
    commanderColors: DeckColor[],
  ): Promise<CardSearchResult>;

  getRecommendationCandidates(
    input: CandidateGenerationInput,
  ): Promise<CandidateGenerationResult>;
}

export function normalizeDeckColorArray(colors: DeckColor[] | undefined): DeckColor[] {
  if (!Array.isArray(colors)) return [];

  return Array.from(
    new Set(
      colors
        .filter((color): color is DeckColor => typeof color === 'string' && color.trim().length > 0)
        .map((color) => color.trim() as DeckColor),
    ),
  );
}

export function normalizeStringArray(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeSearchQuery(query: CardSearchQuery): CardSearchQuery {
  return {
    text: query.text?.trim() || undefined,
    exactName: query.exactName?.trim() || undefined,
    normalizedName:
      query.normalizedName?.trim() ||
      normalizeCardName(query.exactName || query.text || ''),
    filters: query.filters
      ? {
          ...query.filters,
          commanderColors: normalizeDeckColorArray(query.filters.commanderColors),
          excludeCardNames: normalizeStringArray(query.filters.excludeCardNames),
          requiredTags: normalizeStringArray(query.filters.requiredTags),
          requiredRoles: normalizeStringArray(query.filters.requiredRoles),
          categories: Array.isArray(query.filters.categories)
            ? query.filters.categories
            : undefined,
          typeIncludes: normalizeStringArray(query.filters.typeIncludes),
          textIncludes: normalizeStringArray(query.filters.textIncludes),
          legalInCommander:
            typeof query.filters.legalInCommander === 'boolean'
              ? query.filters.legalInCommander
              : undefined,
          maxCmc:
            typeof query.filters.maxCmc === 'number' ? query.filters.maxCmc : undefined,
          minCmc:
            typeof query.filters.minCmc === 'number' ? query.filters.minCmc : undefined,
          limit:
            typeof query.filters.limit === 'number' && query.filters.limit > 0
              ? Math.floor(query.filters.limit)
              : undefined,
        }
      : undefined,
  };
}

export function normalizeCandidateGenerationInput(
  input: CandidateGenerationInput,
): CandidateGenerationInput {
  return {
    commanderColors: normalizeDeckColorArray(input.commanderColors),
    deckCardNames: normalizeStringArray(input.deckCardNames),
    preferredTags: normalizeStringArray(input.preferredTags),
    preferredRoles: normalizeStringArray(input.preferredRoles),
    categories: Array.isArray(input.categories) ? input.categories : undefined,
    limit:
      typeof input.limit === 'number' && input.limit > 0
        ? Math.floor(input.limit)
        : undefined,
  };
}

export function createEmptyCardSearchResult(
  source: CardDataSourceKind,
): CardSearchResult {
  return {
    cards: [],
    total: 0,
    source,
  };
}

export function createEmptyCandidateGenerationResult(
  source: CardDataSourceKind,
): CandidateGenerationResult {
  return {
    candidates: [],
    source,
    totalConsidered: 0,
    totalReturned: 0,
  };
}

export function recommendationCardToName(card: RecommendationPoolCard): string {
  return card.cardName;
}

export function hasRole(card: RecommendationPoolCard, role: string): boolean {
  return card.roles.includes(role as RecommendationRole);
}

export function hasTag(card: RecommendationPoolCard, tag: string): boolean {
  return card.tags.includes(tag as RecommendationTag);
}

export function isCategoryMatch(
  card: RecommendationPoolCard,
  categories: RecommendationCategory[] | undefined,
): boolean {
  if (!categories || categories.length === 0) return true;
  return categories.includes(card.category);
}