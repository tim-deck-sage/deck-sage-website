import { SanctumFeatureKey } from '../constants/sanctumFeatureContent';

export const SANCTUM_RETURN_INTENT_SCHEMA_VERSION = 2;

export const SANCTUM_RETURN_INTENT_TYPES = [
  'route_deck_analysis',
  'route_upgrade_my_deck',
  'route_bulk_deck_opportunities',
  'route_recommended_upgrade_detail',
  'create_deck',
  'reactivate_deck',
  'create_deck_from_bulk',
  'open_ai_batch_scan',
  'retry_ocr_recovery',
  'continue_bulk_import',
  'continue_single_scan',
  'open_avatar_settings',
  'open_friends_bulk_search',
  'open_connected_match_setup',
] as const;

export type SanctumReturnIntentType =
  (typeof SANCTUM_RETURN_INTENT_TYPES)[number];

export type SanctumReturnIntentPayload = {
  deckId?: string;
  deckName?: string;
  commanderName?: string;
  cardName?: string;
  rank?: string;
  category?: string;
  reason?: string;
  synergy?: string;
  imageUrl?: string;
  ownershipNote?: string;
  target?: string;
  mode?: string;
  joinCode?: string;
  sourceScreen?: string;
  scannerOrigin?: 'ai-batch' | 'single';
  featureKey?: SanctumFeatureKey;
};

export type SanctumReturnIntentInput = {
  intentType: SanctumReturnIntentType;
  sourceScreen: string;
  payload?: SanctumReturnIntentPayload;
  featureKey?: SanctumFeatureKey;
};

export type LegacySanctumReturnIntent = {
  intentType?: string;
  sourceScreen?: string;
  createdAt?: string;
  payload?: Record<string, string | number | boolean | null | undefined>;
};

export type SanctumReturnIntent = {
  schemaVersion: typeof SANCTUM_RETURN_INTENT_SCHEMA_VERSION;
  id: string;
  userId: string;
  sessionId: string;
  intentType: SanctumReturnIntentType;
  sourceScreen: string;
  featureKey?: SanctumFeatureKey;
  payload: SanctumReturnIntentPayload;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  dismissedAt: string | null;
};
