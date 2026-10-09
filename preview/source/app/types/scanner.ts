export type ScanCropStatus = 'success' | 'failed';
export type ScanOcrStatus = 'success' | 'empty' | 'unsupported' | 'failed';
export type ScanMatchStatus = 'matched' | 'needs_review' | 'not_found' | 'match_failed';

export type ScanMatchSource = 'exact' | 'normalized' | 'alias' | 'search_terms';

export type ScannedCardResult = {
  scanId: string;
  capturedAt: number;

  sourceImageUri: string;
  cardCropUri?: string;
  titleCropUri?: string;
  ocrImageUri?: string;
  sourceImageWidth?: number;
  sourceImageHeight?: number;
  cropOriginX?: number;
  cropOriginY?: number;
  cropWidth?: number;
  cropHeight?: number;

  cropStatus: ScanCropStatus;
  ocrStatus: ScanOcrStatus;
  ocrText: string;
  ocrConfidence?: number;

  matchStatus: ScanMatchStatus;
  matchConfidence?: number;
  matchSource?: ScanMatchSource;

  oracleId?: string;
  scryfallId?: string | null;
  canonicalName?: string;
  displayName?: string;
  detectedFaceName?: string;

  typeLine?: string | null;
  manaCost?: string | null;
  colorsJson?: string | null;
  colorIdentityJson?: string | null;

  errorCode?: string;
  errorMessage?: string;
};
