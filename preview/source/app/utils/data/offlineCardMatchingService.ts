import { normalizeCardName } from './scryfallNormalization';

export type OfflineCardMatchSource =
  | 'exact'
  | 'normalized'
  | 'alias'
  | 'search_terms';

export type OfflineCardMatchCard = {
  oracleId: string;
  scryfallId: string | null;
  name: string;
  normalizedName: string;
  manaCost: string | null;
  cmc: number | null;
  typeLine: string | null;
  colorsJson: string | null;
  colorIdentityJson: string | null;
};

export type OfflineCardMatchEvidence = {
  source: OfflineCardMatchSource;
  input: string;
  matchedValue: string;
  score: number;
  detail: string;
};

export type OfflineCardMatchCandidate = {
  card: OfflineCardMatchCard;
  confidence: number;
  source: OfflineCardMatchSource;
  evidence: OfflineCardMatchEvidence[];
};

export type OfflineCardMatchResult = {
  input: string;
  normalizedInput: string;
  bestMatch: OfflineCardMatchCandidate | null;
  candidates: OfflineCardMatchCandidate[];
};

export type OfflineCardIdentity = {
  oracleId?: string;
  scryfallId?: string;
  name?: string;
};

export type OfflineCardIdentityMatchSource =
  | 'oracle_id'
  | 'scryfall_id'
  | 'normalized_name';

export type OfflineCardIdentityLookupResult = {
  key: string;
  identity: OfflineCardIdentity;
  status: 'resolved' | 'not_found';
  matchSource?: OfflineCardIdentityMatchSource;
  card?: OfflineCardMatchCard;
};

type SqliteReadDatabase = {
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
};

type CardRow = {
  oracle_id: string;
  scryfall_id: string | null;
  name: string;
  normalized_name: string;
  mana_cost: string | null;
  cmc: number | null;
  type_line: string | null;
  colors_json: string | null;
  color_identity_json: string | null;
};

type ExactCardRow = CardRow & {
  matched_input: string;
  match_source: 'exact';
};

type NormalizedCardRow = CardRow & {
  matched_input: string;
  match_source: 'normalized';
};

type AliasCardRow = CardRow & {
  matched_input: string;
  matched_alias: string;
  alias_confidence: number;
  match_source: 'alias';
};

type SearchTermCardRow = CardRow & {
  matched_terms: string;
  term_score: number;
  term_count: number;
  match_source: 'search_terms';
};

const MAX_CANDIDATE_TEXTS = 80;
const MAX_SEARCH_TERMS = 120;
const MAX_NORMALIZED_NGRAM_TOKENS = 6;
const IDENTITY_QUERY_CHUNK_SIZE = 300;

const SOURCE_RANK: Record<OfflineCardMatchSource, number> = {
  exact: 4,
  normalized: 3,
  alias: 2,
  search_terms: 1,
};

function normalizeIdentityValue(value?: string): string {
  return (value || '').trim().toLowerCase();
}

export function getOfflineCardIdentityKey(identity: OfflineCardIdentity): string {
  const oracleId = normalizeIdentityValue(identity.oracleId);
  if (oracleId) return `oracle:${oracleId}`;

  const scryfallId = normalizeIdentityValue(identity.scryfallId);
  if (scryfallId) return `scryfall:${scryfallId}`;

  return `name:${normalizeCardName(identity.name || '')}`;
}

export async function lookupOfflineCardsByIdentity(
  db: SqliteReadDatabase,
  identities: OfflineCardIdentity[],
): Promise<OfflineCardIdentityLookupResult[]> {
  const uniqueIdentities = new Map<string, OfflineCardIdentity>();

  identities.forEach((identity) => {
    const key = getOfflineCardIdentityKey(identity);
    if (key !== 'name:' && !uniqueIdentities.has(key)) {
      uniqueIdentities.set(key, identity);
    }
  });

  const results = new Map<string, OfflineCardIdentityLookupResult>();
  const pending = new Set(uniqueIdentities.keys());

  await resolveIdentityStage(
    db,
    uniqueIdentities,
    pending,
    results,
    'oracle_id',
    (identity) => normalizeIdentityValue(identity.oracleId),
  );
  await resolveIdentityStage(
    db,
    uniqueIdentities,
    pending,
    results,
    'scryfall_id',
    (identity) => normalizeIdentityValue(identity.scryfallId),
  );
  await resolveIdentityStage(
    db,
    uniqueIdentities,
    pending,
    results,
    'normalized_name',
    (identity) => normalizeCardName(identity.name || ''),
  );

  pending.forEach((key) => {
    results.set(key, {
      key,
      identity: uniqueIdentities.get(key)!,
      status: 'not_found',
    });
  });

  return Array.from(uniqueIdentities.keys()).map((key) => results.get(key)!);
}

async function resolveIdentityStage(
  db: SqliteReadDatabase,
  identities: Map<string, OfflineCardIdentity>,
  pending: Set<string>,
  results: Map<string, OfflineCardIdentityLookupResult>,
  column: OfflineCardIdentityMatchSource,
  selectValue: (identity: OfflineCardIdentity) => string,
) {
  const requestedByValue = new Map<string, string[]>();

  pending.forEach((key) => {
    const value = selectValue(identities.get(key)!);
    if (!value) return;
    const keys = requestedByValue.get(value) || [];
    keys.push(key);
    requestedByValue.set(value, keys);
  });

  const values = Array.from(requestedByValue.keys());
  for (let index = 0; index < values.length; index += IDENTITY_QUERY_CHUNK_SIZE) {
    const chunk = values.slice(index, index + IDENTITY_QUERY_CHUNK_SIZE);
    const rows = await queryCardsByIdentityColumn(db, column, chunk);

    rows.forEach((row) => {
      const rowValue = normalizeIdentityValue(row.matched_value);
      const keys = requestedByValue.get(rowValue) || [];
      keys.forEach((key) => {
        if (!pending.has(key)) return;
        results.set(key, {
          key,
          identity: identities.get(key)!,
          status: 'resolved',
          matchSource: column,
          card: mapCardRow(row),
        });
        pending.delete(key);
      });
    });
  }
}

async function queryCardsByIdentityColumn(
  db: SqliteReadDatabase,
  column: OfflineCardIdentityMatchSource,
  values: string[],
): Promise<(CardRow & { matched_value: string })[]> {
  if (values.length === 0) return [];
  const placeholders = values.map(() => '?').join(', ');
  return db.getAllAsync<CardRow & { matched_value: string }>(
    `SELECT *, ${column} AS matched_value FROM offline_cards WHERE ${column} IN (${placeholders})`,
    values,
  );
}

export async function matchOfflineCardFromOcrText(
  db: SqliteReadDatabase,
  ocrText: string,
): Promise<OfflineCardMatchResult> {
  const input = normalizeOcrTextForDisplay(ocrText);
  const normalizedInput = normalizeCardName(input);

  if (!input || !normalizedInput) {
    return {
      input,
      normalizedInput,
      bestMatch: null,
      candidates: [],
    };
  }

  const rawCandidates = buildRawOcrCandidates(input);
  const normalizedCandidates = buildNormalizedOcrCandidates(rawCandidates);
  const candidateMap = new Map<string, OfflineCardMatchCandidate>();

  mergeRows(
    candidateMap,
    await findExactMatches(db, rawCandidates),
    (row) => ({
      card: mapCardRow(row),
      confidence: 1,
      source: 'exact',
      evidence: [
        {
          source: 'exact',
          input: row.matched_input,
          matchedValue: row.name,
          score: 1,
          detail: 'OCR candidate exactly matched offline_cards.name.',
        },
      ],
    }),
  );

  mergeRows(
    candidateMap,
    await findNormalizedMatches(db, normalizedCandidates),
    (row) => ({
      card: mapCardRow(row),
      confidence: 0.94,
      source: 'normalized',
      evidence: [
        {
          source: 'normalized',
          input: row.matched_input,
          matchedValue: row.normalized_name,
          score: 0.94,
          detail: 'Normalized OCR candidate matched offline_cards.normalized_name.',
        },
      ],
    }),
  );

  mergeRows(
    candidateMap,
    await findAliasMatches(db, normalizedCandidates),
    (row) => {
      const confidence = clampScore(0.88 * Number(row.alias_confidence || 1));

      return {
        card: mapCardRow(row),
        confidence,
        source: 'alias',
        evidence: [
          {
            source: 'alias',
            input: row.matched_input,
            matchedValue: row.matched_alias,
            score: confidence,
            detail: 'Normalized OCR candidate matched offline_card_aliases.normalized_alias.',
          },
        ],
      };
    },
  );

  mergeRows(
    candidateMap,
    await findSearchTermMatches(db, normalizedCandidates),
    (row) => {
      const confidence = scoreSearchTermMatch(row);

      return {
        card: mapCardRow(row),
        confidence,
        source: 'search_terms',
        evidence: [
          {
            source: 'search_terms',
            input: row.matched_terms,
            matchedValue: row.name,
            score: confidence,
            detail: `${row.term_count} offline_card_search_terms match(es), weighted score ${row.term_score}.`,
          },
        ],
      };
    },
  );

  const candidates = Array.from(candidateMap.values()).sort(compareCandidates);

  console.log('[Offline Card Match] lookup completed', {
    ocrText,
    input,
    normalizedInput,
    rawCandidates: rawCandidates.slice(0, 12),
    normalizedCandidates: normalizedCandidates.slice(0, 20),
    candidateCount: candidates.length,
    candidates: candidates.slice(0, 8).map((candidate) => ({
      name: candidate.card.name,
      oracleId: candidate.card.oracleId,
      scryfallId: candidate.card.scryfallId,
      confidence: candidate.confidence,
      source: candidate.source,
      evidence: candidate.evidence.slice(0, 3).map((evidence) => ({
        source: evidence.source,
        input: evidence.input,
        matchedValue: evidence.matchedValue,
        score: evidence.score,
        detail: evidence.detail,
      })),
    })),
  });

  return {
    input,
    normalizedInput,
    bestMatch: candidates[0] || null,
    candidates,
  };
}

function buildRawOcrCandidates(input: string): string[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => normalizeOcrTextForDisplay(line))
    .filter(Boolean);
  const candidates = new Set<string>();

  addOcrCandidateVariants(candidates, input);
  lines.forEach((line) => {
    addOcrCandidateVariants(candidates, line);
    splitCandidateLine(line).forEach((part) => addOcrCandidateVariants(candidates, part));
  });

  return Array.from(candidates).slice(0, MAX_CANDIDATE_TEXTS);
}

function buildNormalizedOcrCandidates(rawCandidates: string[]): string[] {
  const candidates = new Set<string>();

  rawCandidates.forEach((candidate) => {
    const normalized = normalizeCardName(candidate);
    if (normalized) candidates.add(normalized);
  });

  const normalizedCombinedText = normalizeCardName(rawCandidates.join(' '));
  const normalizedTokens = tokenizeNormalizedText(normalizedCombinedText);

  normalizedTokens.forEach((term) => {
    candidates.add(term);
  });
  buildNormalizedTokenNgrams(normalizedTokens).forEach((term) => {
    candidates.add(term);
  });

  return Array.from(candidates).slice(0, MAX_SEARCH_TERMS);
}

function addOcrCandidateVariants(candidates: Set<string>, candidate: string) {
  const normalizedCandidate = normalizeOcrTextForDisplay(candidate);
  if (!normalizedCandidate) return;

  candidates.add(normalizedCandidate);

  // Scanner OCR can read the left border of the title box as one or two
  // opening parentheses. Treat those as OCR noise without changing card output.
  const strippedLeadingParens = normalizedCandidate.replace(/^\({1,2}\s*/, '');
  if (strippedLeadingParens && strippedLeadingParens !== normalizedCandidate) {
    candidates.add(strippedLeadingParens);
  }
}

function splitCandidateLine(line: string): string[] {
  return line
    .split(/[|•·]/)
    .map((part) => normalizeOcrTextForDisplay(part))
    .filter(Boolean);
}

function normalizeOcrTextForDisplay(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function tokenizeNormalizedText(value: string): string[] {
  return value
    .split(' ')
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function buildNormalizedTokenNgrams(tokens: string[]): string[] {
  const ngrams: string[] = [];

  for (let start = 0; start < tokens.length; start += 1) {
    const maxEnd = Math.min(tokens.length, start + MAX_NORMALIZED_NGRAM_TOKENS);

    for (let end = start + 2; end <= maxEnd; end += 1) {
      ngrams.push(tokens.slice(start, end).join(' '));
    }
  }

  return ngrams;
}

async function findExactMatches(
  db: SqliteReadDatabase,
  candidates: string[],
): Promise<ExactCardRow[]> {
  return queryByValues<ExactCardRow>(
    db,
    candidates,
    `
      SELECT
        c.*,
        v.value AS matched_input,
        'exact' AS match_source
      FROM offline_cards c
      JOIN ({values}) v ON c.name = v.value
    `,
  );
}

async function findNormalizedMatches(
  db: SqliteReadDatabase,
  candidates: string[],
): Promise<NormalizedCardRow[]> {
  return queryByValues<NormalizedCardRow>(
    db,
    candidates,
    `
      SELECT
        c.*,
        v.value AS matched_input,
        'normalized' AS match_source
      FROM offline_cards c
      JOIN ({values}) v ON c.normalized_name = v.value
    `,
  );
}

async function findAliasMatches(
  db: SqliteReadDatabase,
  candidates: string[],
): Promise<AliasCardRow[]> {
  return queryByValues<AliasCardRow>(
    db,
    candidates,
    `
      SELECT
        c.*,
        v.value AS matched_input,
        a.normalized_alias AS matched_alias,
        a.confidence AS alias_confidence,
        'alias' AS match_source
      FROM offline_card_aliases a
      JOIN offline_cards c ON c.oracle_id = a.oracle_id
      JOIN ({values}) v ON a.normalized_alias = v.value
    `,
  );
}

async function findSearchTermMatches(
  db: SqliteReadDatabase,
  candidates: string[],
): Promise<SearchTermCardRow[]> {
  return queryByValues<SearchTermCardRow>(
    db,
    candidates,
    `
      SELECT
        c.*,
        GROUP_CONCAT(DISTINCT st.term) AS matched_terms,
        SUM(st.weight) AS term_score,
        COUNT(*) AS term_count,
        'search_terms' AS match_source
      FROM offline_card_search_terms st
      JOIN offline_cards c ON c.oracle_id = st.oracle_id
      JOIN ({values}) v ON st.term = v.value
      GROUP BY c.oracle_id
      HAVING term_score > 0
      ORDER BY term_score DESC, term_count DESC, c.name ASC
      LIMIT 20
    `,
  );
}

async function queryByValues<T>(
  db: SqliteReadDatabase,
  values: string[],
  sqlTemplate: string,
): Promise<T[]> {
  const uniqueValues = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  if (uniqueValues.length === 0) return [];

  const valuesSql = uniqueValues.map(() => 'SELECT ? AS value').join(' UNION ALL ');
  const sql = sqlTemplate.replace('{values}', valuesSql);

  return db.getAllAsync<T>(sql, uniqueValues);
}

function mergeRows<T extends CardRow>(
  candidateMap: Map<string, OfflineCardMatchCandidate>,
  rows: T[],
  mapper: (row: T) => OfflineCardMatchCandidate,
) {
  rows.forEach((row) => {
    const candidate = mapper(row);
    const existing = candidateMap.get(candidate.card.oracleId);

    if (!existing) {
      candidateMap.set(candidate.card.oracleId, candidate);
      return;
    }

    existing.evidence.push(...candidate.evidence);
    if (compareCandidates(candidate, existing) < 0) {
      candidateMap.set(candidate.card.oracleId, {
        ...candidate,
        evidence: existing.evidence,
      });
    }
  });
}

function compareCandidates(
  left: OfflineCardMatchCandidate,
  right: OfflineCardMatchCandidate,
): number {
  if (left.confidence !== right.confidence) {
    return right.confidence - left.confidence;
  }

  if (SOURCE_RANK[left.source] !== SOURCE_RANK[right.source]) {
    return SOURCE_RANK[right.source] - SOURCE_RANK[left.source];
  }

  return left.card.name.localeCompare(right.card.name);
}

function scoreSearchTermMatch(row: SearchTermCardRow): number {
  const termScore = Number(row.term_score || 0);
  const termCount = Number(row.term_count || 0);
  const weighted = 0.42 + Math.min(0.26, termScore / 40) + Math.min(0.08, termCount / 50);

  return clampScore(weighted);
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function mapCardRow(row: CardRow): OfflineCardMatchCard {
  return {
    oracleId: row.oracle_id,
    scryfallId: row.scryfall_id,
    name: row.name,
    normalizedName: row.normalized_name,
    manaCost: row.mana_cost,
    cmc: row.cmc,
    typeLine: row.type_line,
    colorsJson: row.colors_json,
    colorIdentityJson: row.color_identity_json,
  };
}
