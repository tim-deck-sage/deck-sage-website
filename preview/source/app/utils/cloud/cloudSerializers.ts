import type {
  Card,
  Deck,
  DeckCommander,
  DeckStatus,
} from '../../context/DeckContext';
import type { BulkCard } from '../../types/bulk';
import type { CloudSyncStatus } from '../../types/cloudSync';
import { normalizeCardName } from '../data/scryfallNormalization';

export type CloudSafeDeckPayload = {
  local_id: string;
  cloud_id: string | null;
  name: string;
  commander_name: string;
  status: DeckStatus;
  basic_lands: Record<string, number>;
  sync_status: CloudSyncStatus;
  client_updated_at: string;
  last_synced_at: string | null;
  deleted_at: string | null;
};

export type CloudSafeCommanderPayload = {
  local_id: string;
  deck_local_id: string;
  name: string;
  normalized_name: string;
  oracle_id: string | null;
  scryfall_id: string | null;
  role: string;
  sort_order: number;
  sync_status: CloudSyncStatus;
  client_updated_at: string;
  last_synced_at: string | null;
  deleted_at: string | null;
};

export type CloudSafeDeckCardStackPayload = {
  local_id: string;
  deck_local_id: string;
  card_name: string;
  normalized_name: string;
  oracle_id: string | null;
  scryfall_id: string | null;
  variant: 'Normal' | 'Foil' | 'Full Art';
  quantity: number;
  sync_status: CloudSyncStatus;
  client_updated_at: string;
  last_synced_at: string | null;
  deleted_at: string | null;
};

export type CloudSafeBulkCardStackPayload = {
  local_id: string;
  card_name: string;
  normalized_name: string;
  oracle_id: string | null;
  scryfall_id: string | null;
  variant: 'Normal' | 'Foil' | 'Full Art';
  quantity: number;
  sync_status: CloudSyncStatus;
  client_updated_at: string;
  last_synced_at: string | null;
  deleted_at: string | null;
};

type SyncLike = {
  cloudId?: string | null;
  localId?: string;
  syncStatus?: CloudSyncStatus;
  clientUpdatedAt?: string;
  lastSyncedAt?: string | null;
  deletedAt?: string | null;
};

type StackAccumulator = {
  localId: string;
  cardName: string;
  normalizedName: string;
  oracleId: string | null;
  scryfallId: string | null;
  variant: 'Normal' | 'Foil' | 'Full Art';
  quantity: number;
  syncStatus: CloudSyncStatus;
  clientUpdatedAt: string;
  lastSyncedAt: string | null;
  deletedAt: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function syncStatusOf(record: SyncLike): CloudSyncStatus {
  if (record.syncStatus) return record.syncStatus;
  return record.deletedAt ? 'deleted' : 'dirty';
}

function clientUpdatedAtOf(record: SyncLike): string {
  return record.clientUpdatedAt || nowIso();
}

function deletedAtOf(record: SyncLike): string | null {
  return record.deletedAt || (record.syncStatus === 'deleted' ? clientUpdatedAtOf(record) : null);
}

function localIdOf(record: SyncLike, fallback: string): string {
  return record.localId || fallback;
}

function cloudIdOf(record: SyncLike): string | null {
  return record.cloudId ?? null;
}

function lastSyncedAtOf(record: SyncLike): string | null {
  return record.lastSyncedAt ?? null;
}

function safeVariant(
  variant?: string,
): 'Normal' | 'Foil' | 'Full Art' {
  return variant === 'Foil' || variant === 'Full Art' ? variant : 'Normal';
}

function safeQuantity(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 1;

  return Math.max(1, Math.floor(parsed));
}

function cardIdentityKey(card: Pick<Card | BulkCard, 'name' | 'oracleId' | 'scryfallId' | 'cardVariant'>) {
  const identity =
    card.oracleId ||
    card.scryfallId ||
    normalizeCardName(card.name);

  return `${identity}::${safeVariant(card.cardVariant)}`;
}

function stackLocalId(deckLocalId: string, card: Card): string {
  return `${deckLocalId}:stack:${cardIdentityKey(card)}`;
}

function buildStackAccumulator(
  localId: string,
  card: Card | BulkCard,
  quantity: number,
): StackAccumulator {
  return {
    localId,
    cardName: card.name.trim(),
    normalizedName: normalizeCardName(card.name),
    oracleId: card.oracleId || null,
    scryfallId: card.scryfallId || null,
    variant: safeVariant(card.cardVariant),
    quantity,
    syncStatus: syncStatusOf(card),
    clientUpdatedAt: clientUpdatedAtOf(card),
    lastSyncedAt: lastSyncedAtOf(card),
    deletedAt: deletedAtOf(card),
  };
}

function mergeStackMetadata(
  existing: StackAccumulator,
  incoming: StackAccumulator,
): StackAccumulator {
  const incomingIsNewer =
    Date.parse(incoming.clientUpdatedAt) >= Date.parse(existing.clientUpdatedAt);

  return {
    ...existing,
    cardName: existing.cardName || incoming.cardName,
    normalizedName: existing.normalizedName || incoming.normalizedName,
    oracleId: existing.oracleId || incoming.oracleId,
    scryfallId: existing.scryfallId || incoming.scryfallId,
    quantity: existing.quantity + incoming.quantity,
    syncStatus:
      existing.syncStatus === 'deleted' || incoming.syncStatus === 'deleted'
        ? 'deleted'
        : incoming.syncStatus === 'dirty' || existing.syncStatus === 'dirty'
          ? 'dirty'
          : incoming.syncStatus === 'new' || existing.syncStatus === 'new'
            ? 'new'
            : 'synced',
    clientUpdatedAt: incomingIsNewer ? incoming.clientUpdatedAt : existing.clientUpdatedAt,
    lastSyncedAt: incomingIsNewer ? incoming.lastSyncedAt : existing.lastSyncedAt,
    deletedAt: existing.deletedAt || incoming.deletedAt,
  };
}

export function serializeDeckForCloud(deck: Deck): CloudSafeDeckPayload {
  const localId = localIdOf(deck, deck.id);

  return {
    local_id: localId,
    cloud_id: cloudIdOf(deck),
    name: deck.name,
    commander_name: deck.commander,
    status: deck.status,
    basic_lands: {
      Plains: deck.basicLands.Plains,
      Island: deck.basicLands.Island,
      Swamp: deck.basicLands.Swamp,
      Mountain: deck.basicLands.Mountain,
      Forest: deck.basicLands.Forest,
      Wastes: deck.basicLands.Wastes,
    },
    sync_status: syncStatusOf(deck),
    client_updated_at: clientUpdatedAtOf(deck),
    last_synced_at: lastSyncedAtOf(deck),
    deleted_at: deletedAtOf(deck),
  };
}

export function serializeDeckCommandersForCloud(
  deck: Deck,
): CloudSafeCommanderPayload[] {
  if (deck.status === 'deleted') return [];

  const deckLocalId = localIdOf(deck, deck.id);
  const commanders = deck.commanders?.length
    ? deck.commanders
    : deck.commander.trim()
      ? [
          {
            name: deck.commander,
            role: 'primary' as const,
            oracleId: deck.commanderCard?.oracleId,
            scryfallId: deck.commanderCard?.scryfallId,
            localId: deck.commanderCard?.localId,
            syncStatus: deck.commanderCard?.syncStatus,
            clientUpdatedAt: deck.commanderCard?.clientUpdatedAt,
            lastSyncedAt: deck.commanderCard?.lastSyncedAt,
            deletedAt: deck.commanderCard?.deletedAt,
          },
        ]
      : [];

  return commanders
    .filter((commander): commander is DeckCommander => Boolean(commander?.name?.trim()))
    .map((commander, index) => ({
      local_id: localIdOf(commander, `${deckLocalId}:commander:${index}`),
      deck_local_id: deckLocalId,
      name: commander.name.trim(),
      normalized_name: normalizeCardName(commander.name),
      oracle_id: commander.oracleId || null,
      scryfall_id: commander.scryfallId || null,
      role: commander.role || (index === 0 ? 'primary' : 'other'),
      sort_order: index,
      sync_status: syncStatusOf(commander),
      client_updated_at: clientUpdatedAtOf(commander),
      last_synced_at: lastSyncedAtOf(commander),
      deleted_at: deletedAtOf(commander),
    }));
}

export function serializeDeckCardStacksForCloud(
  deck: Deck,
): CloudSafeDeckCardStackPayload[] {
  if (deck.status === 'deleted') return [];

  const deckLocalId = localIdOf(deck, deck.id);
  const stacks = new Map<string, StackAccumulator>();

  deck.cards.forEach((card) => {
    if (!card?.name?.trim()) return;

    const key = cardIdentityKey(card);
    const incoming = buildStackAccumulator(
      stackLocalId(deckLocalId, card),
      card,
      1,
    );
    const existing = stacks.get(key);

    stacks.set(key, existing ? mergeStackMetadata(existing, incoming) : incoming);
  });

  return Array.from(stacks.values()).map((stack) => ({
    local_id: stack.localId,
    deck_local_id: deckLocalId,
    card_name: stack.cardName,
    normalized_name: stack.normalizedName,
    oracle_id: stack.oracleId,
    scryfall_id: stack.scryfallId,
    variant: stack.variant,
    quantity: stack.quantity,
    sync_status: stack.syncStatus,
    client_updated_at: stack.clientUpdatedAt,
    last_synced_at: stack.lastSyncedAt,
    deleted_at: stack.deletedAt,
  }));
}

export function serializeBulkCardForCloud(
  card: BulkCard,
): CloudSafeBulkCardStackPayload {
  const stack = buildStackAccumulator(
    localIdOf(card, `bulk:${cardIdentityKey(card)}`),
    card,
    safeQuantity(card.quantity),
  );

  return {
    local_id: stack.localId,
    card_name: stack.cardName,
    normalized_name: stack.normalizedName,
    oracle_id: stack.oracleId,
    scryfall_id: stack.scryfallId,
    variant: stack.variant,
    quantity: stack.quantity,
    sync_status: stack.syncStatus,
    client_updated_at: stack.clientUpdatedAt,
    last_synced_at: stack.lastSyncedAt,
    deleted_at: stack.deletedAt,
  };
}

export function serializeBulkCardStacksForCloud(
  bulkCards: BulkCard[],
): CloudSafeBulkCardStackPayload[] {
  const stacks = new Map<string, StackAccumulator>();

  bulkCards.forEach((card) => {
    if (!card?.name?.trim()) return;

    const key = cardIdentityKey(card);
    const incoming = buildStackAccumulator(
      localIdOf(card, `bulk:${key}`),
      card,
      safeQuantity(card.quantity),
    );
    const existing = stacks.get(key);

    stacks.set(key, existing ? mergeStackMetadata(existing, incoming) : incoming);
  });

  return Array.from(stacks.values()).map((stack) => ({
    local_id: stack.localId,
    card_name: stack.cardName,
    normalized_name: stack.normalizedName,
    oracle_id: stack.oracleId,
    scryfall_id: stack.scryfallId,
    variant: stack.variant,
    quantity: stack.quantity,
    sync_status: stack.syncStatus,
    client_updated_at: stack.clientUpdatedAt,
    last_synced_at: stack.lastSyncedAt,
    deleted_at: stack.deletedAt,
  }));
}
