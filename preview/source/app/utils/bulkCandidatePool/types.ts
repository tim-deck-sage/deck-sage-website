import type { BulkCard } from '../../types/bulk';
import type { DiscoveredCommander } from '../bulkCommanderDiscovery/types';

export const BULK_CANDIDATE_POOL_SELECTION_VERSION = 'phase2-v1';

export const BULK_CANDIDATE_POOL_DEFAULTS = {
  targetSize: 50,
  commanderSpecificTarget: 24,
  genericOnlyCap: 14,
  utilityLandCap: 3,
  processingChunkSize: 300,
  bucketRanges: {
    direct_synergy: { min: 16, max: 20, target: 18 },
    indirect_engine: { min: 6, max: 10, target: 8 },
    ramp_fixing: { min: 5, max: 7, target: 6 },
    draw: { min: 4, max: 6, target: 5 },
    interaction: { min: 4, max: 6, target: 5 },
    protection: { min: 2, max: 4, target: 3 },
    payoff_finisher: { min: 3, max: 5, target: 4 },
    utility_land: { min: 0, max: 3, target: 2 },
    uncertain: { min: 2, max: 4, target: 3 },
  },
} as const;

export type CandidatePoolBucket = keyof typeof BULK_CANDIDATE_POOL_DEFAULTS.bucketRanges;

export type CandidatePoolEvidenceCode =
  | 'shared_creature_type'
  | 'commander_term_match'
  | 'commander_mechanic_match'
  | 'indirect_engine_support'
  | 'structural_role'
  | 'structural_fallback_sol_ring'
  | 'low_confidence_strategy';

export type CandidatePrintingSummary = Pick<
  BulkCard,
  'scryfallId' | 'setName' | 'cardVariant' | 'imageUrl' | 'imageUri'
> & { quantity: number };

export type NormalizedCandidateCard = {
  functionalId: string;
  name: string;
  normalizedName: string;
  oracleId?: string;
  scryfallId?: string;
  manaCost?: string;
  cmc?: number;
  typeLine?: string;
  oracleText?: string;
  colors?: string[];
  colorIdentity?: string[];
  colorIdentityKnown: boolean;
  power?: string;
  toughness?: string;
  keywords?: string[];
  imageUrl?: string;
  quantity: number;
  printings: CandidatePrintingSummary[];
  metadataIncomplete: boolean;
};

export type CandidateCardFeatures = {
  creatureTypes: string[];
  strategyFeatures: string[];
  structuralRoles: CandidatePoolBucket[];
  utilityLand: boolean;
  basicLand: boolean;
  usedStructuralFallback: boolean;
  evidence: CandidatePoolEvidenceCode[];
};

export type CommanderCandidateProfile = {
  functionalId: string;
  colorIdentity: string[];
  creatureTypes: string[];
  strategyFeatures: string[];
};

export type ScoredCandidateCard = {
  card: NormalizedCandidateCard;
  features: CandidateCardFeatures;
  directScore: number;
  indirectScore: number;
  structuralScore: number;
  totalScore: number;
  commanderSpecific: boolean;
  genericOnly: boolean;
  eligibleBuckets: CandidatePoolBucket[];
  evidence: CandidatePoolEvidenceCode[];
  reasons: string[];
};

export type SelectedCandidateCard = ScoredCandidateCard & {
  assignedBucket: CandidatePoolBucket;
};

export type CandidatePoolDiagnostics = {
  requestedTarget: number;
  actualOutputCount: number;
  bucketCounts: Record<CandidatePoolBucket, number>;
  bucketDeficits: Record<CandidatePoolBucket, number>;
  commanderSpecificCount: number;
  genericOnlyCount: number;
  utilityLandCount: number;
  excludedBasics: number;
  excludedWrongColor: number;
  excludedUnresolvedColor: number;
  metadataUnresolvedCandidates: number;
  duplicateIdentitiesConsolidated: number;
  cancellationStatus: 'not_cancelled' | 'cancelled';
  selectionFingerprint: string;
  selectionVersion: string;
  timingsMs: {
    normalization: number;
    offlineLookup: number;
    offlineMerge: number;
    classificationAndScoring: number;
    selection: number;
    total: number;
  };
};

export type CandidatePoolBuildResult =
  | {
      status: 'complete';
      commander: DiscoveredCommander;
      cards: SelectedCandidateCard[];
      diagnostics: CandidatePoolDiagnostics;
    }
  | {
      status: 'metadata_incomplete';
      commander: DiscoveredCommander;
      reason: 'missing_commander_color_identity';
      cards: [];
      diagnostics: CandidatePoolDiagnostics;
    }
  | {
      status: 'cancelled';
      commander: DiscoveredCommander;
      cards: [];
      diagnostics: CandidatePoolDiagnostics;
    };

export type CandidatePoolOfflineIdentity = {
  oracleId?: string;
  scryfallId?: string;
  name?: string;
};

export type CandidatePoolOfflineLookupResult = {
  key: string;
  identity: CandidatePoolOfflineIdentity;
  status: 'resolved' | 'not_found' | 'database_unavailable';
  cardData?: {
    id?: string;
    oracle_id?: string;
    name: string;
    mana_cost?: string;
    cmc?: number;
    type_line?: string;
    oracle_text?: string;
    colors?: string[];
    color_identity?: string[];
  };
};

export type BuildCandidatePoolOptions = {
  commander: DiscoveredCommander;
  bulk: readonly BulkCard[];
  resolveOffline?: (
    identities: CandidatePoolOfflineIdentity[],
  ) => Promise<CandidatePoolOfflineLookupResult[]>;
  isCancelled?: () => boolean;
  yieldControl?: () => Promise<void>;
};
