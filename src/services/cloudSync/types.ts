// src/services/cloudSync/types.ts
export interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  lastSync: Date | null;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSuccess: Date | null;
  lastError: string | null;
  pendingChanges: number;
}

export interface SyncableEntity {
  id: string;
  lastModified: Date;
  syncVersion: number;
  isDeleted?: boolean;
}