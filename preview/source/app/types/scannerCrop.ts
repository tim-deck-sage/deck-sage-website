export const OFFLINE_CARD_CROP_WIDTH = 744;
export const OFFLINE_CARD_CROP_HEIGHT = 1040;

export type OfflineCardCropBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  source?: string;
  selectedVariant?: string;
  score?: number;
  confidence?: number;
  aspect?: number;
  areaRatio?: number;
  contourAreaRatio?: number;
};

export type OfflineCardCropCandidate = {
  index: number;
  source: string;
  mask: string;
  box: OfflineCardCropBox;
  contourArea: number;
  scores?: Record<string, number>;
  confidence: number;
  score: number;
  decision: 'conservative_crop' | 'reject' | 'warp';
};

export type OfflineCardDetectionDebug = {
  sourceWidth: number;
  sourceHeight: number;
  normalizedWidth: number;
  normalizedHeight: number;
  detectionWidth: number;
  detectionHeight: number;
  maskStrategy: string;
  selectedSource?:
    | 'physical_silhouette'
    | 'stage_one_physical'
    | 'silhouette_fallback'
    | 'expected_region_fallback';
  selectedVariant?: string;
  stageOneCandidateCount?: number;
  stageOneBestCandidate?: OfflineCardCropCandidate | null;
  stageOneRejectReason?: string;
  candidateCount: number;
  chosenBox?: OfflineCardCropBox;
  candidates: OfflineCardCropCandidate[];
  fallbackUsed: boolean;
  outputUri?: string;
  outputSource?: string;
  debugOutputDirectory?: string;
  debugImageUris?: Record<string, string>;
};

export type OfflineCardCropOptions = {
  scanId?: string;
  itemId?: string;
  selectedUri?: string;
  resultingCrop1Uri?: string;
};

export type OfflineCardCropResult = {
  ok: boolean;
  productionCardUri?: string;
  width?: number;
  height?: number;
  detectionDebug?: OfflineCardDetectionDebug;
  errorCode?: string;
  errorMessage?: string;
};
