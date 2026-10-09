// app/app/utils/bulkOpportunity/bulkCardAdapter.ts

import { BulkCard } from '../../types/bulk';
import { AnalyzedBulkCard } from './types';

type LooseRecord = Record<string, any>;

function normalizeName(name: string): string {
  return (name || '').trim();
}

function normalizeColors(values?: string[]): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    )
    .map((value) => value.trim().toUpperCase());
}

function splitTypeLine(typeLine?: string): {
  types: string[];
  subtypes: string[];
} {
  if (!typeLine || typeof typeLine !== 'string') {
    return { types: [], subtypes: [] };
  }

  const cleaned = typeLine.replace(/\u2014/g, '—');
  const [leftSide, rightSide] = cleaned.split('—').map((part) => part.trim());

  const types = leftSide
    ? leftSide
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  const subtypes = rightSide
    ? rightSide
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  return { types, subtypes };
}

function isObject(value: unknown): value is LooseRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function pickFirstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function pickFirstStringArray(...values: unknown[]): string[] {
  for (const value of values) {
    if (Array.isArray(value)) {
      const normalized = normalizeColors(value);
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }
  return [];
}

function getCandidateSources(card: BulkCard): LooseRecord[] {
  const raw = card as LooseRecord;

  const sources: LooseRecord[] = [raw];

  const possibleNestedSources = [
    raw.card,
    raw.cardData,
    raw.scryfall,
    raw.scryfallCard,
    raw.resolvedCard,
    raw.previewCard,
    raw.matchedCard,
    raw.lookupResult,
    raw.result,
    raw.data,
    raw.details,
    raw.metadata,
  ];

  for (const source of possibleNestedSources) {
    if (isObject(source)) {
      sources.push(source);
    }
  }

  return sources;
}

function extractName(card: BulkCard, sources: LooseRecord[]): string {
  for (const source of sources) {
    const name = pickFirstString(source.name);
    if (name) {
      return normalizeName(name);
    }
  }

  return normalizeName((card as LooseRecord).name || '');
}

function extractQuantity(card: BulkCard, sources: LooseRecord[]): number {
  for (const source of sources) {
    if (Number.isFinite(source.quantity) && source.quantity > 0) {
      return Math.max(0, Math.floor(source.quantity));
    }
  }

  return Math.max(0, Math.floor((card as LooseRecord).quantity || 0));
}

function extractScryfallId(sources: LooseRecord[]): string | undefined {
  for (const source of sources) {
    const id = pickFirstString(
      source.scryfallId,
      source.scryfall_id,
      source.id,
    );
    if (id) {
      return id;
    }
  }

  return undefined;
}

function extractOracleId(sources: LooseRecord[]): string | undefined {
  for (const source of sources) {
    const id = pickFirstString(source.oracleId, source.oracle_id);
    if (id) {
      return id;
    }
  }

  return undefined;
}

function extractImageUrl(sources: LooseRecord[]): string | undefined {
  for (const source of sources) {
    const imageUrl = pickFirstString(
      source.imageUrl,
      source.image_url,
      source.normalImageUrl,
      source.artUrl,
      source.uri,
      source.image_uris?.normal,
      source.image_uris?.large,
      source.image_uris?.small,
      source.imageUris?.normal,
      source.imageUris?.large,
      source.imageUris?.small,
    );

    if (imageUrl) {
      return imageUrl;
    }
  }

  return undefined;
}

function extractTypeLine(sources: LooseRecord[]): string {
  for (const source of sources) {
    const typeLine = pickFirstString(
      source.typeLine,
      source.type_line,
      source.cardType,
      source.type,
    );
    if (typeLine) {
      return typeLine;
    }
  }

  return '';
}

function extractOracleText(sources: LooseRecord[]): string {
  for (const source of sources) {
    const oracleText = pickFirstString(
      source.oracleText,
      source.oracle_text,
      source.text,
      source.rulesText,
      source.rules_text,
      source.oracleTextPreview,
    );
    if (oracleText) {
      return oracleText;
    }

    if (Array.isArray(source.card_faces)) {
      const faceText = source.card_faces
        .map((face: unknown) =>
          isObject(face)
            ? pickFirstString(face.oracleText, face.oracle_text)
            : '',
        )
        .filter(Boolean)
        .join('\n');
      if (faceText) {
        return faceText;
      }
    }
  }

  return '';
}

function extractColors(sources: LooseRecord[]): string[] {
  return pickFirstStringArray(
    ...sources.flatMap((source) => [
      source.colors,
      source.colorSymbols,
      source.color_symbols,
    ]),
  );
}

function extractColorIdentity(sources: LooseRecord[]): string[] {
  return pickFirstStringArray(
    ...sources.flatMap((source) => [
      source.colorIdentity,
      source.color_identity,
      source.commanderColorIdentity,
      source.commander_color_identity,
      source.colors,
    ]),
  );
}

export function adaptBulkCards(bulkCards: BulkCard[]): AnalyzedBulkCard[] {
  return bulkCards
    .filter((card) => {
      const raw = card as LooseRecord;
      return (
        card &&
        typeof raw.name === 'string' &&
        raw.name.trim().length > 0 &&
        Number.isFinite(raw.quantity) &&
        raw.quantity > 0
      );
    })
    .map((card) => {
      const sources = getCandidateSources(card);

      const name = extractName(card, sources);
      const quantity = extractQuantity(card, sources);
      const oracleId = extractOracleId(sources);
      const scryfallId = extractScryfallId(sources);
      const imageUrl = extractImageUrl(sources);
      const typeLine = extractTypeLine(sources);
      const oracleText = extractOracleText(sources);
      const colors = extractColors(sources);
      const colorIdentity = extractColorIdentity(sources);
      const { types, subtypes } = splitTypeLine(typeLine);

      return {
        ...card,
        name,
        quantity,
        oracleId,
        scryfallId,
        imageUrl,
        colors,
        colorIdentity,
        typeLine,
        oracleText,
        types,
        subtypes,
        tags: [],
      };
    });
}
