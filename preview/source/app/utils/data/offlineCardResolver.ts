import { initializeDeckSageMtgDatabase } from './deckSageMtgDatabase';
import {
  getOfflineCardIdentityKey,
  lookupOfflineCardsByIdentity,
  matchOfflineCardFromOcrText,
  type OfflineCardIdentity,
  type OfflineCardIdentityMatchSource,
  type OfflineCardMatchCard,
  type OfflineCardMatchCandidate,
} from './offlineCardMatchingService';

export const OFFLINE_REVIEW_MATCH_CONFIDENCE = 0.75;

export type OfflineResolvedCardData = {
  id?: string;
  oracle_id?: string;
  name: string;
  image_url?: string;
  art_crop_url?: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity?: string[];
  power?: string;
  toughness?: string;
  keywords?: string[];
  set_name?: string;
  rarity?: string;
};

export type OfflineResolvedCardLookupResult = {
  key: string;
  identity: OfflineCardIdentity;
  status: 'resolved' | 'not_found' | 'database_unavailable';
  matchSource?: OfflineCardIdentityMatchSource;
  cardData?: OfflineResolvedCardData;
};

function parseJsonStringArray(value?: string | null): string[] | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : undefined;
  } catch {
    return undefined;
  }
}

export function mapOfflineMatchToScryfallCardData(
  match: OfflineCardMatchCandidate,
): OfflineResolvedCardData {
  return mapOfflineCardToScryfallCardData(match.card);
}

function mapOfflineCardToScryfallCardData(
  card: OfflineCardMatchCard,
): OfflineResolvedCardData {
  return {
    id: card.scryfallId || card.oracleId,
    oracle_id: card.oracleId,
    name: card.name,
    mana_cost: card.manaCost ?? undefined,
    cmc: card.cmc ?? undefined,
    type_line: card.typeLine ?? undefined,
    colors: parseJsonStringArray(card.colorsJson),
    color_identity: parseJsonStringArray(card.colorIdentityJson),
  };
}

export async function resolveOfflineCardsByIdentity(
  identities: OfflineCardIdentity[],
): Promise<OfflineResolvedCardLookupResult[]> {
  const uniqueIdentities = new Map(
    identities
      .map((identity) => [getOfflineCardIdentityKey(identity), identity] as const)
      .filter(([key]) => key !== 'name:'),
  );
  if (uniqueIdentities.size === 0) return [];

  let db: Awaited<ReturnType<typeof initializeDeckSageMtgDatabase>> | null = null;

  try {
    db = await initializeDeckSageMtgDatabase();
    const lookupDb = {
      getAllAsync<T>(sql: string, params: unknown[] = []) {
        return db!.getAllAsync<T>(sql, params as never);
      },
    };
    const results = await lookupOfflineCardsByIdentity(
      lookupDb,
      Array.from(uniqueIdentities.values()),
    );

    return results.map((result) => ({
      key: result.key,
      identity: result.identity,
      status: result.status,
      matchSource: result.matchSource,
      cardData: result.card
        ? mapOfflineCardToScryfallCardData(result.card)
        : undefined,
    }));
  } catch {
    return Array.from(uniqueIdentities.entries()).map(([key, identity]) => ({
      key,
      identity,
      status: 'database_unavailable' as const,
    }));
  } finally {
    await db?.closeAsync();
  }
}

export async function resolveOfflineCardByName(
  cardName: string,
  minimumConfidence = OFFLINE_REVIEW_MATCH_CONFIDENCE,
): Promise<OfflineResolvedCardData | null> {
  if (!cardName.trim()) return null;

  let db: Awaited<ReturnType<typeof initializeDeckSageMtgDatabase>> | null = null;

  try {
    db = await initializeDeckSageMtgDatabase();

    const matchDb = {
      getAllAsync<T>(sql: string, params: unknown[] = []) {
        return db!.getAllAsync<T>(sql, params as never);
      },
    };

    const result = await matchOfflineCardFromOcrText(matchDb, cardName);
    const bestMatch = result.bestMatch;

    if (!bestMatch || bestMatch.confidence < minimumConfidence) {
      console.log('[Offline Card Resolver] no accepted local match', {
        input: result.input,
        normalizedInput: result.normalizedInput,
        minimumConfidence,
        bestCandidate: bestMatch
          ? {
              name: bestMatch.card.name,
              confidence: bestMatch.confidence,
              source: bestMatch.source,
            }
          : null,
      });
      return null;
    }

    return mapOfflineMatchToScryfallCardData(bestMatch);
  } catch (error) {
    console.log('[Offline Card Resolver] lookup failed', error);
    return null;
  } finally {
    await db?.closeAsync();
  }
}
