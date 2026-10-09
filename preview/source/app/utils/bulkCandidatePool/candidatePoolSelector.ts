import {
  BULK_CANDIDATE_POOL_DEFAULTS,
  type CandidatePoolBucket,
  type ScoredCandidateCard,
  type SelectedCandidateCard,
} from './types';

const PROTECTED_ORDER: CandidatePoolBucket[] = ['direct_synergy', 'indirect_engine'];
const ESSENTIAL_ORDER: CandidatePoolBucket[] = [
  'ramp_fixing', 'draw', 'interaction', 'protection', 'payoff_finisher', 'utility_land', 'uncertain',
];
const STRUCTURAL_BUCKETS = new Set<CandidatePoolBucket>([
  'ramp_fixing', 'draw', 'interaction', 'protection', 'payoff_finisher', 'utility_land',
]);

export function emptyBucketCounts(): Record<CandidatePoolBucket, number> {
  return {
    direct_synergy: 0,
    indirect_engine: 0,
    ramp_fixing: 0,
    draw: 0,
    interaction: 0,
    protection: 0,
    payoff_finisher: 0,
    utility_land: 0,
    uncertain: 0,
  };
}

function compareCandidates(left: ScoredCandidateCard, right: ScoredCandidateCard): number {
  return right.totalScore - left.totalScore ||
    right.directScore - left.directScore ||
    right.indirectScore - left.indirectScore ||
    left.card.functionalId.localeCompare(right.card.functionalId) ||
    left.card.name.localeCompare(right.card.name);
}

export function selectCandidatePool(scored: ScoredCandidateCard[]): {
  cards: SelectedCandidateCard[];
  bucketCounts: Record<CandidatePoolBucket, number>;
} {
  const sorted = [...scored].sort(compareCandidates);
  const selected: SelectedCandidateCard[] = [];
  const selectedIds = new Set<string>();
  const assignedCounts = emptyBucketCounts();
  const structuralCoverage = emptyBucketCounts();
  let genericOnlyCount = 0;
  let utilityLandCount = 0;

  const canSelect = (card: ScoredCandidateCard, bucket: CandidatePoolBucket) => {
    if (selectedIds.has(card.card.functionalId)) return false;
    if (!card.eligibleBuckets.includes(bucket)) return false;
    if (card.genericOnly && genericOnlyCount >= BULK_CANDIDATE_POOL_DEFAULTS.genericOnlyCap) return false;
    if (card.features.utilityLand && utilityLandCount >= BULK_CANDIDATE_POOL_DEFAULTS.utilityLandCap) return false;
    return true;
  };
  const add = (card: ScoredCandidateCard, bucket: CandidatePoolBucket) => {
    selected.push({ ...card, assignedBucket: bucket });
    selectedIds.add(card.card.functionalId);
    assignedCounts[bucket] += 1;
    card.features.structuralRoles.forEach((role) => {
      structuralCoverage[role] += 1;
    });
    if (card.genericOnly) genericOnlyCount += 1;
    if (card.features.utilityLand) utilityLandCount += 1;
  };
  const coverageFor = (bucket: CandidatePoolBucket) =>
    STRUCTURAL_BUCKETS.has(bucket) ? structuralCoverage[bucket] : assignedCounts[bucket];
  const fillBalanced = (
    buckets: CandidatePoolBucket[],
    targetFor: (bucket: CandidatePoolBucket) => number,
  ) => {
    while (selected.length < BULK_CANDIDATE_POOL_DEFAULTS.targetSize) {
      const openBuckets = buckets.filter((bucket) => coverageFor(bucket) < targetFor(bucket));
      if (openBuckets.length === 0) break;
      const rankedPairs = openBuckets.flatMap((bucket) => {
        const target = Math.max(1, targetFor(bucket));
        const unmetValue = (target - coverageFor(bucket)) / target;
        return sorted
          .filter((card) => canSelect(card, bucket))
          .map((card) => ({ bucket, card, unmetValue }));
      }).sort((left, right) =>
        right.unmetValue - left.unmetValue ||
        compareCandidates(left.card, right.card) ||
        left.bucket.localeCompare(right.bucket),
      );
      const best = rankedPairs[0];
      if (!best) break;
      add(best.card, best.bucket);
    }
  };

  fillBalanced(PROTECTED_ORDER, (bucket) => BULK_CANDIDATE_POOL_DEFAULTS.bucketRanges[bucket].target);

  while (
    selected.filter((card) => card.commanderSpecific).length <
      BULK_CANDIDATE_POOL_DEFAULTS.commanderSpecificTarget &&
    selected.length < BULK_CANDIDATE_POOL_DEFAULTS.targetSize
  ) {
    const card = sorted.find((candidate) =>
      candidate.commanderSpecific &&
      !selectedIds.has(candidate.card.functionalId) &&
      candidate.eligibleBuckets.some((bucket) =>
        ['direct_synergy', 'indirect_engine', 'uncertain'].includes(bucket) && canSelect(candidate, bucket),
      ),
    );
    if (!card) break;
    const bucket = card.eligibleBuckets.find((candidateBucket) =>
      ['direct_synergy', 'indirect_engine', 'uncertain'].includes(candidateBucket) &&
      coverageFor(candidateBucket) < BULK_CANDIDATE_POOL_DEFAULTS.bucketRanges[candidateBucket].max &&
      canSelect(card, candidateBucket),
    );
    if (!bucket) break;
    add(card, bucket);
  }

  fillBalanced(ESSENTIAL_ORDER, (bucket) => BULK_CANDIDATE_POOL_DEFAULTS.bucketRanges[bucket].min);

  fillBalanced(
    [...PROTECTED_ORDER, ...ESSENTIAL_ORDER],
    (bucket) => BULK_CANDIDATE_POOL_DEFAULTS.bucketRanges[bucket].max,
  );

  const bucketCounts = emptyBucketCounts();
  (Object.keys(bucketCounts) as CandidatePoolBucket[]).forEach((bucket) => {
    bucketCounts[bucket] = coverageFor(bucket);
  });
  return { cards: selected, bucketCounts };
}
