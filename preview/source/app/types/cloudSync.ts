export type CloudSyncStatus = 'new' | 'dirty' | 'synced' | 'deleted';

export type CloudSyncMetadata = {
  cloudId?: string | null;
  localId?: string;
  syncStatus?: CloudSyncStatus;
  clientUpdatedAt?: string;
  lastSyncedAt?: string | null;
  deletedAt?: string | null;
};

export function createLocalSyncMetadata(
  localId: string,
  now = new Date().toISOString(),
): Required<CloudSyncMetadata> {
  return {
    cloudId: null,
    localId,
    syncStatus: 'dirty',
    clientUpdatedAt: now,
    lastSyncedAt: null,
    deletedAt: null,
  };
}

export function normalizeLocalSyncMetadata<T extends object>(
  record: T & CloudSyncMetadata,
  fallbackLocalId: string,
  now = new Date().toISOString(),
): T & Required<CloudSyncMetadata> {
  return {
    ...record,
    ...getLocalSyncMetadata(record, fallbackLocalId, now),
  };
}

export function getLocalSyncMetadata<T extends CloudSyncMetadata>(
  record: T,
  fallbackLocalId: string,
  now = new Date().toISOString(),
): Required<CloudSyncMetadata> {
  return {
    cloudId: record.cloudId ?? null,
    localId: record.localId || fallbackLocalId,
    syncStatus: record.syncStatus || 'dirty',
    clientUpdatedAt: record.clientUpdatedAt || now,
    lastSyncedAt: record.lastSyncedAt ?? null,
    deletedAt: record.deletedAt ?? null,
  };
}

export function markCloudSyncDirty<T extends object>(
  record: T & CloudSyncMetadata,
  now = new Date().toISOString(),
): T & CloudSyncMetadata {
  return {
    ...record,
    syncStatus: record.syncStatus === 'deleted' ? 'deleted' : 'dirty',
    clientUpdatedAt: now,
  };
}

export function markCloudSyncDeleted<T extends object>(
  record: T & CloudSyncMetadata,
  now = new Date().toISOString(),
): T & CloudSyncMetadata {
  return {
    ...record,
    syncStatus: 'deleted',
    clientUpdatedAt: now,
    deletedAt: record.deletedAt || now,
  };
}
