import type { OfflineResolvedCardLookupResult } from '../data/offlineCardResolver';
import { buildCommanderProfile } from './commanderProfile';
import { classifyCandidateCard } from './cardFeatureClassifier';
import {
  buildUnresolvedIdentities,
  canonicalCandidateName,
  mergeOfflineMetadata,
  normalizeAndConsolidateBulk,
} from './candidatePoolNormalizer';
import { scoreCandidateCard } from './candidatePoolScorer';
import { emptyBucketCounts, selectCandidatePool } from './candidatePoolSelector';
import {
  BULK_CANDIDATE_POOL_DEFAULTS,
  BULK_CANDIDATE_POOL_SELECTION_VERSION,
  type BuildCandidatePoolOptions,
  type CandidatePoolBuildResult,
  type CandidatePoolDiagnostics,
  type CandidatePoolOfflineLookupResult,
  type NormalizedCandidateCard,
} from './types';

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
}

function selectionFingerprint(
  commanderFunctionalId: string,
  cards: { card: NormalizedCandidateCard; assignedBucket: string }[],
): string {
  return hash(JSON.stringify({
    version: BULK_CANDIDATE_POOL_SELECTION_VERSION,
    commander: commanderFunctionalId,
    cards: cards.map(({ card, assignedBucket }) => ({ id: card.functionalId, assignedBucket })),
  }));
}

function diagnostics(
  commanderFunctionalId: string,
  overrides: Partial<CandidatePoolDiagnostics> = {},
): CandidatePoolDiagnostics {
  const bucketCounts = overrides.bucketCounts || emptyBucketCounts();
  const bucketDeficits = emptyBucketCounts();
  (Object.keys(bucketDeficits) as (keyof typeof bucketDeficits)[]).forEach((bucket) => {
    bucketDeficits[bucket] = Math.max(
      0,
      BULK_CANDIDATE_POOL_DEFAULTS.bucketRanges[bucket].min - bucketCounts[bucket],
    );
  });
  return {
    requestedTarget: BULK_CANDIDATE_POOL_DEFAULTS.targetSize,
    actualOutputCount: 0,
    bucketCounts,
    commanderSpecificCount: 0,
    genericOnlyCount: 0,
    utilityLandCount: 0,
    excludedBasics: 0,
    excludedWrongColor: 0,
    excludedUnresolvedColor: 0,
    metadataUnresolvedCandidates: 0,
    duplicateIdentitiesConsolidated: 0,
    cancellationStatus: 'not_cancelled',
    selectionFingerprint: selectionFingerprint(commanderFunctionalId, []),
    selectionVersion: BULK_CANDIDATE_POOL_SELECTION_VERSION,
    timingsMs: {
      normalization: 0,
      offlineLookup: 0,
      offlineMerge: 0,
      classificationAndScoring: 0,
      selection: 0,
      total: 0,
    },
    ...overrides,
    bucketDeficits,
  };
}

function cancelled(options: BuildCandidatePoolOptions): boolean {
  return options.isCancelled?.() === true;
}

async function defaultOfflineResolver(identities: Parameters<NonNullable<BuildCandidatePoolOptions['resolveOffline']>>[0]) {
  const { resolveOfflineCardsByIdentity } = await import('../data/offlineCardResolver');
  return resolveOfflineCardsByIdentity(identities) as Promise<OfflineResolvedCardLookupResult[]>;
}

function isColorLegal(candidate: string[], commander: string[]): boolean {
  return candidate.every((color) => commander.includes(color));
}

export async function buildBulkCandidatePool(
  options: BuildCandidatePoolOptions,
): Promise<CandidatePoolBuildResult> {
  const totalStarted = Date.now();
  const { commander } = options;
  const profile = buildCommanderProfile(commander);
  if (commander.metadataIssues.includes('missing_color_identity')) {
    return {
      status: 'metadata_incomplete', commander, reason: 'missing_commander_color_identity', cards: [], diagnostics: diagnostics(profile.functionalId),
    };
  }
  if (cancelled(options)) {
    return { status: 'cancelled', commander, cards: [], diagnostics: diagnostics(profile.functionalId, { cancellationStatus: 'cancelled' }) };
  }

  const normalizationStarted = Date.now();
  const initial = normalizeAndConsolidateBulk(options.bulk);
  const normalizationMs = Date.now() - normalizationStarted;
  let cards = initial.cards;
  const unresolvedIdentities = buildUnresolvedIdentities(cards);
  let offlineLookupMs = 0;
  let offlineMergeMs = 0;
  if (unresolvedIdentities.length > 0) {
    const resolver = options.resolveOffline || defaultOfflineResolver;
    const lookupStarted = Date.now();
    const resolved = await resolver(unresolvedIdentities) as CandidatePoolOfflineLookupResult[];
    offlineLookupMs = Date.now() - lookupStarted;
    if (cancelled(options)) {
      return { status: 'cancelled', commander, cards: [], diagnostics: diagnostics(profile.functionalId, { cancellationStatus: 'cancelled' }) };
    }
    const mergeStarted = Date.now();
    cards = mergeOfflineMetadata(cards, resolved);
    offlineMergeMs = Date.now() - mergeStarted;
  }

  const classificationStarted = Date.now();
  const eligible = [];
  let excludedBasics = 0;
  let excludedWrongColor = 0;
  let excludedUnresolvedColor = 0;
  let metadataUnresolvedCandidates = 0;
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    const sameOracleIdentity = Boolean(
      commander.oracleId && card.oracleId && commander.oracleId.toLowerCase() === card.oracleId.toLowerCase(),
    );
    const sameCanonicalName = canonicalCandidateName(card.name) === canonicalCandidateName(commander.name);
    if (sameOracleIdentity || sameCanonicalName) continue;
    const features = classifyCandidateCard(card);
    if (features.basicLand) { excludedBasics += 1; continue; }
    if (!card.colorIdentityKnown) { excludedUnresolvedColor += 1; metadataUnresolvedCandidates += 1; continue; }
    if (!isColorLegal(card.colorIdentity || [], profile.colorIdentity)) { excludedWrongColor += 1; continue; }
    if (card.metadataIncomplete) metadataUnresolvedCandidates += 1;
    const scored = scoreCandidateCard(card, features, profile);
    if (scored.eligibleBuckets.length > 0) eligible.push(scored);
    if ((index + 1) % BULK_CANDIDATE_POOL_DEFAULTS.processingChunkSize === 0) {
      if (cancelled(options)) {
        return { status: 'cancelled', commander, cards: [], diagnostics: diagnostics(profile.functionalId, { cancellationStatus: 'cancelled' }) };
      }
      await options.yieldControl?.();
    }
  }

  const classificationAndScoringMs = Date.now() - classificationStarted;
  const selectionStarted = Date.now();
  const selected = selectCandidatePool(eligible);
  const selectionMs = Date.now() - selectionStarted;
  const outputDiagnostics = diagnostics(profile.functionalId, {
    actualOutputCount: selected.cards.length,
    bucketCounts: selected.bucketCounts,
    commanderSpecificCount: selected.cards.filter((card) => card.commanderSpecific).length,
    genericOnlyCount: selected.cards.filter((card) => card.genericOnly).length,
    utilityLandCount: selected.cards.filter((card) => card.features.utilityLand).length,
    excludedBasics,
    excludedWrongColor,
    excludedUnresolvedColor,
    metadataUnresolvedCandidates,
    duplicateIdentitiesConsolidated:
      initial.duplicateIdentitiesConsolidated + (initial.cards.length - cards.length),
    selectionFingerprint: selectionFingerprint(profile.functionalId, selected.cards),
    timingsMs: {
      normalization: normalizationMs,
      offlineLookup: offlineLookupMs,
      offlineMerge: offlineMergeMs,
      classificationAndScoring: classificationAndScoringMs,
      selection: selectionMs,
      total: Date.now() - totalStarted,
    },
  });
  return { status: 'complete', commander, cards: selected.cards, diagnostics: outputDiagnostics };
}
