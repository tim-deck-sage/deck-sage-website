// app/app/types/entitlements.ts

export type EntitlementType =
  | 'free'
  | 'sanctum_paid'
  | 'sanctum_beta'
  | 'sanctum_admin'
  | 'store_owner';

export type DeckStatus =
  | 'active'
  | 'archived';

export interface EntitlementCapabilities {
  maxActiveDecks: number;
  maxAiRecoveriesPerMonth: number;
  maxBulkImportsPerMonth: number;
  maxSingleScansPerMonth: number;
  maxAiBatchScanCardsPerMonth: number;

  unlimitedDecks: boolean;

  canUseSanctumFeatures: boolean;
}

export interface EntitlementState {
  entitlementType: EntitlementType;

  aiRecoveriesUsedThisMonth: number;
  bulkImportsUsedThisMonth: number;

  lastResetMonth: string;
}

export interface DeckAccessState {
  deckId: string;
  status: DeckStatus;
}

export type EntitlementTier =
  | 'free'
  | 'sanctum'
  | 'store_owner';

export type EntitlementSnapshot = {
  tier: EntitlementTier;
  hasSanctum: boolean;
  hasStoreOwner: boolean;
  monthlyTokenGrant: number;
  status: string;
  currentPeriodEnd: string | null;
  accessSource:
    | 'free'
    | 'paid'
    | 'beta'
    | 'store_owner'
    | 'local_admin';
  betaExpiresAt: string | null;
  capabilities: Record<string, boolean>;
  limits: Record<string, number>;
};
