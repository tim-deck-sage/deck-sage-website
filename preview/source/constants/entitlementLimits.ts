// app/app/constants/entitlementLimits.ts

import {
  EntitlementCapabilities,
  EntitlementType,
} from '../app/types/entitlements';

export const ENTITLEMENT_LIMITS: Record<
  EntitlementType,
  EntitlementCapabilities
> = {
  free: {
    maxActiveDecks: 3,
    maxAiRecoveriesPerMonth: 500,
    maxBulkImportsPerMonth: 1000,
    maxSingleScansPerMonth: 500,
    maxAiBatchScanCardsPerMonth: 0,

    unlimitedDecks: false,

    canUseSanctumFeatures: false,
  },

  sanctum_paid: {
    maxActiveDecks: 999999,
    maxAiRecoveriesPerMonth: 10000,
    maxBulkImportsPerMonth: 20000,
    maxSingleScansPerMonth: 5000,
    maxAiBatchScanCardsPerMonth: 5000,

    unlimitedDecks: true,

    canUseSanctumFeatures: true,
  },

  sanctum_beta: {
    maxActiveDecks: 999999,
    maxAiRecoveriesPerMonth: 10000,
    maxBulkImportsPerMonth: 20000,
    maxSingleScansPerMonth: 5000,
    maxAiBatchScanCardsPerMonth: 5000,

    unlimitedDecks: true,

    canUseSanctumFeatures: true,
  },

  sanctum_admin: {
    maxActiveDecks: 999999,
    maxAiRecoveriesPerMonth: 999999,

    maxBulkImportsPerMonth: 999999,
    maxSingleScansPerMonth: 999999,
    maxAiBatchScanCardsPerMonth: 999999,

    unlimitedDecks: true,

    canUseSanctumFeatures: true,
  },

  store_owner: {
    maxActiveDecks: 999999,
    maxAiRecoveriesPerMonth: 10000,
    maxBulkImportsPerMonth: 20000,
    maxSingleScansPerMonth: 5000,
    maxAiBatchScanCardsPerMonth: 10000,

    unlimitedDecks: true,

    canUseSanctumFeatures: true,
  },
};

export const AI_BATCH_SCAN_MONTHLY_LIMITS = {
  free: 0,
  sanctum: 5000,
  storeOwner: 10000,
} as const;
