import type { BulkCard } from '../../types/bulk';
import {
  resolveOfflineCardsByIdentity,
  type OfflineResolvedCardLookupResult,
} from '../data/offlineCardResolver';
import { getOfflineCardIdentityKey } from '../data/offlineCardMatchingService';
import { discoverOwnedStandaloneCommanders } from './commanderDiscovery';
import type { CommanderDiscoveryResult } from './types';

type OfflineResolvedCardData = NonNullable<
  OfflineResolvedCardLookupResult['cardData']
>;

export type CommanderOfflineLookup = (
  identities: { oracleId?: string; scryfallId?: string; name?: string }[],
) => Promise<OfflineResolvedCardLookupResult[]>;

export function mergeCommanderMetadata(
  cards: BulkCard[],
  resolvedByKey: ReadonlyMap<string, OfflineResolvedCardData>,
): BulkCard[] {
  return cards.map((card) => {
    const key = getOfflineCardIdentityKey(card);
    const resolved = resolvedByKey.get(key);
    if (!resolved) return card;

    return {
      ...card,
      oracleId: card.oracleId || resolved.oracle_id,
      scryfallId: card.scryfallId || resolved.id,
      typeLine: card.typeLine || resolved.type_line,
      colors: card.colors?.length ? card.colors : resolved.colors,
      colorIdentity: card.colorIdentity?.length
        ? card.colorIdentity
        : resolved.color_identity,
    };
  });
}

export async function discoverOwnedStandaloneCommandersWithOfflineMetadata(
  bulkCards: BulkCard[],
  lookup: CommanderOfflineLookup = resolveOfflineCardsByIdentity,
): Promise<CommanderDiscoveryResult> {
  const localResult = discoverOwnedStandaloneCommanders(bulkCards);
  const identities = [
    ...localResult.commanders
      .filter((commander) =>
        commander.metadataIssues.includes('missing_type_line') ||
        commander.metadataIssues.includes('missing_color_identity'),
      )
      .map((commander) => ({
        oracleId: commander.oracleId,
        scryfallId: commander.scryfallId,
        name: commander.name,
      })),
    ...localResult.diagnostics
      .filter((diagnostic) => diagnostic.status === 'insufficient_metadata')
      .map((diagnostic) => ({
        oracleId: diagnostic.oracleId,
        scryfallId: diagnostic.scryfallId,
        name: diagnostic.name,
      })),
  ];
  const uniqueIdentities = new Map(
    identities.map((identity) => [getOfflineCardIdentityKey(identity), identity]),
  );
  uniqueIdentities.delete('name:');
  if (uniqueIdentities.size === 0) return localResult;

  const lookupResults = await lookup(Array.from(uniqueIdentities.values()));
  const resolvedByKey = new Map<string, OfflineResolvedCardData>();
  lookupResults.forEach((result) => {
    if (result.status === 'resolved' && result.cardData) {
      resolvedByKey.set(result.key, result.cardData);
    }
  });

  if (resolvedByKey.size === 0) return localResult;

  return discoverOwnedStandaloneCommanders(
    mergeCommanderMetadata(bulkCards, resolvedByKey),
  );
}
