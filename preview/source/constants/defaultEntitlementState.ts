// app/constants/defaultEntitlementState.ts

import { EntitlementState } from '../app/types/entitlements';

function getCurrentMonthKey(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

export const DEFAULT_ENTITLEMENT_STATE: EntitlementState = {
  entitlementType: 'free',

  aiRecoveriesUsedThisMonth: 0,
  bulkImportsUsedThisMonth: 0,

  lastResetMonth: getCurrentMonthKey(),
};