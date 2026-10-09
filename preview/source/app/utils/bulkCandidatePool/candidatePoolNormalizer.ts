import type { BulkCard } from '../../types/bulk';
import { normalizeCardName } from '../data/scryfallNormalization';
import type {
  CandidatePoolOfflineIdentity,
  CandidatePoolOfflineLookupResult,
  CandidatePrintingSummary,
  NormalizedCandidateCard,
} from './types';

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord | undefined {
  return value && typeof value === 'object' ? value as LooseRecord : undefined;
}

function candidateSources(card: BulkCard): LooseRecord[] {
  const raw = card as unknown as LooseRecord;
  return [raw, raw.card, raw.cardData, raw.scryfall, raw.scryfallCard, raw.metadata]
    .map(asRecord)
    .filter((value): value is LooseRecord => Boolean(value));
}

function candidateFaces(sources: LooseRecord[]): LooseRecord[] {
  for (const source of sources) {
    const value = source.card_faces ?? source.cardFaces;
    if (Array.isArray(value)) {
      return value.map(asRecord).filter((face): face is LooseRecord => Boolean(face));
    }
  }
  return [];
}

function firstString(sources: LooseRecord[], keys: string[]): string | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return undefined;
}

function firstStringArray(sources: LooseRecord[], keys: string[]): string[] | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        const strings = value.filter((item): item is string => typeof item === 'string');
        return Array.from(new Set(strings.map((item) => item.toUpperCase()))).sort();
      }
    }
  }
  return undefined;
}

function safeQuantity(value: unknown): number {
  return Math.max(1, Math.floor(Number(value) || 1));
}

export function canonicalCandidateName(name: string | undefined): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function functionalId(oracleId: string | undefined, name: string): string {
  return oracleId
    ? `oracle:${oracleId.trim().toLowerCase()}`
    : `name:${normalizeCardName(name)}`;
}

function printingSummary(card: BulkCard): CandidatePrintingSummary {
  return {
    scryfallId: card.scryfallId,
    setName: card.setName,
    cardVariant: card.cardVariant,
    imageUrl: card.imageUrl,
    imageUri: card.imageUri,
    quantity: safeQuantity(card.quantity),
  };
}

function normalizedCard(card: BulkCard): NormalizedCandidateCard | null {
  const sources = candidateSources(card);
  const faces = candidateFaces(sources);
  const name = firstString(sources, ['name', 'card_name']);
  if (!name) return null;
  const oracleId = firstString(sources, ['oracleId', 'oracle_id']);
  const scryfallId = firstString(sources, ['scryfallId', 'scryfall_id', 'id']);
  const colorIdentity = firstStringArray(sources, ['colorIdentity', 'color_identity']);
  const colors = firstStringArray(sources, ['colors']);
  const parentTypeLine = firstString(sources, ['typeLine', 'type_line']);
  const parentOracleText = firstString(sources, ['oracleText', 'oracle_text']);
  const faceTypeLines = faces
    .map((face) => firstString([face], ['typeLine', 'type_line']))
    .filter((value): value is string => Boolean(value));
  const faceOracleTexts = faces
    .map((face) => firstString([face], ['oracleText', 'oracle_text']))
    .filter((value): value is string => Boolean(value));
  const typeLine = parentTypeLine || Array.from(new Set(faceTypeLines)).join(' // ') || undefined;
  const oracleText = parentOracleText || faceOracleTexts.join('\n//\n') || undefined;
  const quantity = safeQuantity(card.quantity);

  return {
    functionalId: functionalId(oracleId, name),
    name,
    normalizedName: normalizeCardName(name),
    oracleId,
    scryfallId,
    manaCost: firstString(sources, ['manaCost', 'mana_cost']),
    cmc: Number(firstString(sources, ['cmc'])) || card.cmc,
    typeLine,
    oracleText,
    colors,
    colorIdentity,
    colorIdentityKnown: colorIdentity !== undefined,
    power: firstString(sources, ['power']),
    toughness: firstString(sources, ['toughness']),
    keywords: firstStringArray(sources, ['keywords']),
    imageUrl: firstString(sources, ['imageUrl', 'imageUri', 'image_url']),
    quantity,
    printings: [printingSummary(card)],
    metadataIncomplete: !typeLine || colorIdentity === undefined || !oracleText,
  };
}

function richer(left: string | undefined, right: string | undefined): string | undefined {
  return (right?.length || 0) > (left?.length || 0) ? right : left;
}

function mergeCards(left: NormalizedCandidateCard, right: NormalizedCandidateCard): NormalizedCandidateCard {
  const colorIdentity = left.colorIdentityKnown ? left.colorIdentity : right.colorIdentity;
  return {
    ...left,
    oracleId: left.oracleId || right.oracleId,
    scryfallId: left.scryfallId || right.scryfallId,
    manaCost: left.manaCost || right.manaCost,
    cmc: left.cmc ?? right.cmc,
    typeLine: richer(left.typeLine, right.typeLine),
    oracleText: richer(left.oracleText, right.oracleText),
    colors: left.colors || right.colors,
    colorIdentity,
    colorIdentityKnown: left.colorIdentityKnown || right.colorIdentityKnown,
    power: left.power || right.power,
    toughness: left.toughness || right.toughness,
    keywords: Array.from(new Set([...(left.keywords || []), ...(right.keywords || [])])).sort(),
    imageUrl: left.imageUrl || right.imageUrl,
    quantity: left.quantity + right.quantity,
    printings: [...left.printings, ...right.printings],
    metadataIncomplete: !(richer(left.typeLine, right.typeLine)) ||
      !(left.colorIdentityKnown || right.colorIdentityKnown) ||
      !(richer(left.oracleText, right.oracleText)),
  };
}

export function normalizeAndConsolidateBulk(bulk: readonly BulkCard[]): {
  cards: NormalizedCandidateCard[];
  duplicateIdentitiesConsolidated: number;
} {
  const byIdentity = new Map<string, NormalizedCandidateCard>();
  let acceptedRows = 0;
  bulk.forEach((source) => {
    const card = normalizedCard(source);
    if (!card) return;
    acceptedRows += 1;
    const existing = byIdentity.get(card.functionalId);
    byIdentity.set(card.functionalId, existing ? mergeCards(existing, card) : card);
  });
  return {
    cards: Array.from(byIdentity.values()),
    duplicateIdentitiesConsolidated: acceptedRows - byIdentity.size,
  };
}

export function buildUnresolvedIdentities(cards: NormalizedCandidateCard[]): CandidatePoolOfflineIdentity[] {
  return cards
    .filter((card) => !card.typeLine || !card.colorIdentityKnown)
    .map((card) => ({ oracleId: card.oracleId, scryfallId: card.scryfallId, name: card.name }));
}

export function mergeOfflineMetadata(
  cards: NormalizedCandidateCard[],
  results: CandidatePoolOfflineLookupResult[],
): NormalizedCandidateCard[] {
  const resultByKey = new Map(results.map((result) => [result.key, result]));
  const merged = cards.map((card) => {
    const keys = [
      card.oracleId ? `oracle:${card.oracleId.toLowerCase()}` : '',
      card.scryfallId ? `scryfall:${card.scryfallId.toLowerCase()}` : '',
      `name:${card.normalizedName}`,
    ];
    const result = keys.map((key) => resultByKey.get(key)).find(Boolean);
    if (!result || result.status !== 'resolved' || !result.cardData) return card;
    const data = result.cardData;
    const oracleId = card.oracleId || data.oracle_id;
    const colorIdentityKnown = card.colorIdentityKnown || data.color_identity !== undefined;
    return {
      ...card,
      functionalId: functionalId(oracleId, card.name),
      oracleId,
      scryfallId: card.scryfallId || data.id,
      manaCost: card.manaCost || data.mana_cost,
      cmc: card.cmc ?? data.cmc,
      typeLine: card.typeLine || data.type_line,
      oracleText: card.oracleText || data.oracle_text,
      colors: card.colors || data.colors,
      colorIdentity: card.colorIdentityKnown ? card.colorIdentity : data.color_identity,
      colorIdentityKnown,
      metadataIncomplete: !(card.typeLine || data.type_line) ||
        !colorIdentityKnown || !(card.oracleText || data.oracle_text),
    };
  });

  const byIdentity = new Map<string, NormalizedCandidateCard>();
  merged.forEach((card) => {
    const existing = byIdentity.get(card.functionalId);
    byIdentity.set(card.functionalId, existing ? mergeCards(existing, card) : card);
  });
  return Array.from(byIdentity.values());
}
