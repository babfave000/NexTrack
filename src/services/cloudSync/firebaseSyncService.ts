// src/services/cloudSync/firebaseSyncService.ts
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../db/dexie';
import type { SyncConfig, SyncStatus } from './types';
import { firebaseService } from '../firebaseService';

import type {
  Product as DexieProduct,
  SalesOrder as DexieSalesOrder,
  PurchaseOrder as DexiePurchaseOrder,
  OrderStatus,
} from '../../db/dexie';

interface Product extends Omit<DexieProduct, 'id'> {
  id: number;
}

interface SalesOrder extends Omit<DexieSalesOrder, 'id'> {
  id: number;
  status: OrderStatus;
}

interface PurchaseOrder extends Omit<DexiePurchaseOrder, 'id'> {
  id: number;
}

interface SyncData {
  products: Product[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  lastSync: Date;
  syncVersion: number;
  userId: string;
}

export class FirebaseSyncService {
  getAuthState() {
    throw new Error('Method not implemented.');
  }
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private authReady = false;
  private authPromise: Promise<void>;
  private initializationError: string | null = null;

  public config: SyncConfig = {
    enabled: false,
    autoSync: false,
    syncInterval: 5,
    lastSync: null,
  };

  public status: SyncStatus = {
    isSyncing: false,
    lastSuccess: null,
    lastError: null,
    pendingChanges: 0,
  };

  constructor() {
    console.log('🔄 Initializing FirebaseSyncService via shared FirebaseService...');

    this.authPromise = (async () => {
      const timeout = setTimeout(() => {
        const error = 'Firebase sync timeout - check your configuration and internet connection';
        this.initializationError = error;
      }, 15000);

      try {
        await firebaseService.initialize();
        const unsub = firebaseService.onUserChanged((user) => {
          if (user && !user.isAnonymous) {
            this.authReady = true;
            this.initializationError = null;
            clearTimeout(timeout);
          }
        });
        const current = firebaseService.currentUser;
        if (current && !current.isAnonymous) {
          this.authReady = true;
          this.initializationError = null;
          clearTimeout(timeout);
        } else if (!current) {
          // No signed-in user yet — auth flow will happen via AuthContext.
          this.authReady = false;
          clearTimeout(timeout);
        }
        // Keep unsubscribe around in memory? The listener is for the session.
        void unsub;
      } catch (error: unknown) {
        clearTimeout(timeout);
        const message = error instanceof Error ? error.message : String(error);
        this.initializationError = `Sync init failed: ${message}`;
        this.status.lastError = this.initializationError;
      }
    })();
  }

  private async waitForAuth(): Promise<void> {
    if (this.authReady) return;
    try {
      await this.authPromise;
    } catch {
      /* swallow — errors are surfaced via initializationError */
    }
    if (!this.authReady) {
      throw new Error(
        this.initializationError ||
          'Not authenticated with Firebase. Please sign in with email and password first.',
      );
    }
  }

  /**
   * Canonical Firestore document id builder for sync ops.
   * Priority (most to least):
   *   1. Firebase Auth currentUser.uid (strongest; always matches rules check).
   *   2. Explicit `firebaseUid` passed on a Dexie User object.
   *   3. Sanitized email address (for Dexie-only mode fallbacks; these writes
   *      are rejected by rules unless the user has a real Firebase sign-in,
   *      but using a stable identifier avoids garbage doc paths).
   *   4. Dexie numeric id stringified as `local-{id}`.
   */
  private getFirestoreUserId(
    userId: unknown,
  ): { firestoreId: string; hasRealFirebaseIdentity: boolean } {
    // 1. Real signed-in Firebase user → their uid is the canonical doc id.
    const fbUser = firebaseService.currentUser;
    if (fbUser && !fbUser.isAnonymous) {
      return { firestoreId: fbUser.uid, hasRealFirebaseIdentity: true };
    }

    if (userId && typeof userId === 'object') {
      const u = userId as { firebaseUid?: unknown; id?: unknown; email?: unknown };
      if (typeof u.firebaseUid === 'string' && u.firebaseUid.length > 0) {
        return { firestoreId: u.firebaseUid, hasRealFirebaseIdentity: true };
      }
      if (typeof u.email === 'string' && u.email) {
        return {
          firestoreId: this.sanitizeUserId(u.email),
          hasRealFirebaseIdentity: false,
        };
      }
      if (u.id !== undefined && u.id !== null) {
        return {
          firestoreId: `local-${this.sanitizeUserId(String(u.id))}`,
          hasRealFirebaseIdentity: false,
        };
      }
    }

    if (typeof userId === 'string') {
      // Looks like a Firebase uid already (Firebase uids are ~28 chars,
      // alnum + underscore/dash). Still pass through sanitize just in case.
      if (/^[a-zA-Z0-9_-]{20,}$/.test(userId)) {
        return { firestoreId: this.sanitizeUserId(userId), hasRealFirebaseIdentity: !!firebaseService.currentUser };
      }
      if (userId.includes('@')) {
        return { firestoreId: this.sanitizeUserId(userId), hasRealFirebaseIdentity: false };
      }
      return {
        firestoreId: `local-${this.sanitizeUserId(userId)}`,
        hasRealFirebaseIdentity: false,
      };
    }

    if (typeof userId === 'number') {
      return {
        firestoreId: `local-${userId}`,
        hasRealFirebaseIdentity: false,
      };
    }

    const fallbackId = fbUser?.uid || 'unknown-user';
    return {
      firestoreId: this.sanitizeUserId(fallbackId),
      hasRealFirebaseIdentity: !!fbUser && !fbUser.isAnonymous,
    };
  }

  private sanitizeUserId(userId: unknown): string {
    if (!userId) {
      const fb = firebaseService.currentUser;
      return fb ? fb.uid : 'anonymous-user';
    }
    const asString =
      typeof userId === 'string' || typeof userId === 'number'
        ? String(userId)
        : JSON.stringify(userId);
    const sanitized = asString.replace(/[^a-zA-Z0-9_-]/g, '-');
    console.log('🔧 Sanitized user ID:', { original: userId, sanitized });
    return sanitized;
  }

  async enableSync(userId: string) {
    const { firestoreId } = this.getFirestoreUserId(userId);
    console.log('🔄 Enabling sync for user:', firestoreId);
    try {
      await this.waitForAuth();
      this.config.enabled = true;
      await this.saveConfig(firestoreId);
      console.log('✅ Cloud sync enabled for user:', firestoreId);
      if (this.config.autoSync) this.startAutoSync(firestoreId);
      this.startRemoteListener(firestoreId);
    } catch (error) {
      console.error('❌ Failed to enable sync:', error);
      this.status.lastError = `Enable sync failed: ${error}`;
      throw error;
    }
  }

  async disableSync(userId: string) {
    const { firestoreId } = this.getFirestoreUserId(userId);
    console.log('🔄 Disabling sync for user:', firestoreId);
    this.config.enabled = false;
    this.stopAutoSync();
    await this.saveConfig(firestoreId);
    console.log('✅ Cloud sync disabled for user:', firestoreId);
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Firebase connection...');
      const fbUser = firebaseService.currentUser;
      if (!fbUser || fbUser.isAnonymous) {
        throw new Error(
          'No Firebase user signed in. Please sign in with a Firebase email/password account to use cloud sync. Local-only accounts (Dexie fallback) use offline-only storage.',
        );
      }
      await this.waitForAuth();
      const testDoc = doc(firebaseService.firestore, '_connection_tests', 'test');
      await setDoc(
        testDoc,
        {
          test: true,
          timestamp: new Date(),
          message: 'Connection test successful',
          userId: fbUser.uid,
        },
        { merge: true },
      );
      console.log('✅ Firebase connection test passed');
      return true;
    } catch (error: unknown) {
      console.error('❌ Firebase connection test failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('permission') ||
        (error as { code?: string }).code === 'permission-denied'
      ) {
        this.status.lastError =
          'Firestore permission denied. Check security rules (paste latest rules from setup guide into Firebase Console).';
      } else if (errorMessage.includes('quota')) {
        this.status.lastError = 'Firebase quota exceeded. Check your plan.';
      } else if (
        errorMessage.includes('network') ||
        (error as { code?: string }).code === 'unavailable'
      ) {
        this.status.lastError = 'Network error. Check internet connection.';
      } else {
        this.status.lastError = `Connection test failed: ${errorMessage}`;
      }
      return false;
    }
  }

  isReady(): boolean {
    return this.authReady;
  }

  getInitializationError(): string | null {
    return this.initializationError;
  }

  async sync(userId: string): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('🔄 Sync skipped: Sync is not enabled');
      return false;
    }
    if (this.status.isSyncing) {
      console.log('🔄 Sync skipped: Already syncing');
      return false;
    }

    const { firestoreId } = this.getFirestoreUserId(userId);
    console.log('🔄 Starting sync for user:', firestoreId);
    this.status.isSyncing = true;
    this.status.lastError = null;

    try {
      await this.waitForAuth();
      const localData = await this.getLocalChanges();
      await this.pushToFirebase(firestoreId, localData);
      const remoteData = await this.pullFromFirebase(firestoreId);
      if (remoteData) await this.applyRemoteChanges(remoteData);

      this.status.lastSuccess = new Date();
      this.status.isSyncing = false;
      this.status.lastError = null;
      this.config.lastSync = new Date();
      await this.saveConfig(firestoreId);
      console.log('✅ Sync completed successfully at:', this.status.lastSuccess);
      return true;
    } catch (error: unknown) {
      console.error('❌ Sync failed:', error);
      this.status.isSyncing = false;
      this.status.lastError = `Sync failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      return false;
    }
  }

  private async debugDatabase() {
    try {
      console.log('🔍 Debugging database structure...');
      const tables = ['products', 'salesOrders', 'purchaseOrders'] as const;
      for (const table of tables) {
        try {
          const tableData = await db[table].toArray();
          console.log(`📊 ${table}: ${tableData.length} records`);
          if (tableData.length > 0) console.log(`Sample ${table}:`, tableData[0]);
        } catch (error) {
          console.log(`❌ Error reading table ${table}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Database debug failed:', error);
    }
  }

  async resetSyncState(userId: string) {
    const { firestoreId } = this.getFirestoreUserId(userId);
    console.log('🔄 Resetting sync state...');
    this.status = { isSyncing: false, lastSuccess: null, lastError: null, pendingChanges: 0 };
    this.config.enabled = false;
    this.config.lastSync = null;
    await this.saveConfig(firestoreId);
    console.log('✅ Sync state reset');
  }

  private async getLocalChanges(): Promise<SyncData> {
    try {
      console.log('🔍 Getting local changes from database...');
      await this.debugDatabase();

      const products = await db.products.toArray();
      const salesOrders = await db.salesOrders.toArray();
      const purchaseOrders = await db.purchaseOrders.toArray();
      console.log(`📦 Found ${products.length} products`);
      console.log(`🛒 Found ${salesOrders.length} sales orders`);
      console.log(`📥 Found ${purchaseOrders.length} purchase orders`);

      const validProducts: Product[] = products
        .filter((p) => p.id !== undefined)
        .map((p) => ({
          id: p.id!,
          name: p.name || 'Unnamed Product',
          category: p.category || '',
          brand: p.brand || '',
          supplier: p.supplier || '',
          stock: p.stock || 0,
          costPrice: p.costPrice || 0,
          salePrice: p.salePrice || 0,
          lowStockThreshold: p.lowStockThreshold ?? 0,
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
          userId: p.userId || 1,
        }));

      const validSalesOrders: SalesOrder[] = salesOrders
        .filter((so) => so.id !== undefined)
        .map((so) => ({
          id: so.id!,
          customer: so.customer || '',
          date: so.date || new Date().toISOString(),
          items: so.items || [],
          total: so.total || 0,
          paymentStatus: so.paymentStatus || 'pending',
          status: (so.status as OrderStatus) || 'draft',
          userId: so.userId || 1,
        }));

      const validPurchaseOrders: PurchaseOrder[] = purchaseOrders
        .filter((po) => po.id !== undefined)
        .map((po) => ({
          id: po.id!,
          supplier: po.supplier || '',
          date: po.date || new Date().toISOString(),
          items: po.items || [],
          total: po.total || 0,
          status: (po.status as OrderStatus) || 'draft',
          paymentStatus: po.paymentStatus || 'unpaid',
          userId: po.userId || 1,
        }));

      const transformedData: SyncData = {
        products: validProducts,
        salesOrders: validSalesOrders,
        purchaseOrders: validPurchaseOrders,
        lastSync: new Date(),
        syncVersion: Date.now(),
        userId: this.sanitizeUserId(1),
      };
      console.log('✅ Local data prepared for sync:', {
        products: transformedData.products.length,
        salesOrders: transformedData.salesOrders.length,
        purchaseOrders: transformedData.purchaseOrders.length,
      });
      return transformedData;
    } catch (error: unknown) {
      console.error('❌ Error getting local changes:', error);
      throw new Error(
        `Failed to get local data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async pushToFirebase(userId: string, data: SyncData) {
    try {
      const { firestoreId } = this.getFirestoreUserId(userId);
      console.log('📤 Pushing data to Firebase for user:', firestoreId);
      const userDocRef = doc(firebaseService.firestore, 'users', firestoreId);
      const syncData = {
        ...data,
        lastSync: new Date(),
        syncVersion: Date.now(),
        userId: firestoreId,
      };
      console.log('📤 Pushing data to Firebase...');
      await setDoc(userDocRef, syncData, { merge: true });
      console.log('✅ Data pushed to Firebase successfully');
    } catch (error: unknown) {
      console.error('❌ Error pushing to Firebase:', error);
      throw new Error(
        `Firebase push failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async pullFromFirebase(userId: string): Promise<SyncData | null> {
    try {
      const { firestoreId } = this.getFirestoreUserId(userId);
      const userDocRef = doc(firebaseService.firestore, 'users', firestoreId);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as SyncData;
        console.log('📥 Pulled data from Firebase:', Object.keys(data));
        return data;
      } else {
        console.log('ℹ️ No data found in Firebase for user:', firestoreId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error pulling from Firebase:', error);
      throw new Error(
        `Firebase pull failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private startRemoteListener(userId: string) {
    try {
      const { firestoreId } = this.getFirestoreUserId(userId);
      const userDocRef = doc(firebaseService.firestore, 'users', firestoreId);
      console.log('👂 Starting remote change listener...');
      onSnapshot(
        userDocRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            const remoteData = docSnap.data() as SyncData;
            console.log('🔄 Remote changes detected, applying...');
            await this.applyRemoteChanges(remoteData);
            this.status.lastSuccess = new Date();
            this.config.lastSync = new Date();
            await this.saveConfig(firestoreId);
          }
        },
        (error) => {
          console.error('❌ Remote listener error:', error);
          this.status.lastError = `Remote sync error: ${error.message}`;
        },
      );
    } catch (error) {
      console.error('❌ Error starting remote listener:', error);
    }
  }

  private async applyRemoteChanges(remoteData: SyncData) {
    try {
      console.log('🔄 Applying remote changes to local database...');
      if (remoteData.products) {
        for (const product of remoteData.products) {
          const dexieProduct: DexieProduct = { ...product, id: product.id };
          await db.products.put(dexieProduct);
        }
        console.log(`✅ Applied ${remoteData.products.length} product changes`);
      }
      if (remoteData.salesOrders) {
        for (const salesOrder of remoteData.salesOrders) {
          const dexieSalesOrder: DexieSalesOrder = { ...salesOrder, id: salesOrder.id };
          await db.salesOrders.put(dexieSalesOrder);
        }
        console.log(`✅ Applied ${remoteData.salesOrders.length} sales order changes`);
      }
      if (remoteData.purchaseOrders) {
        for (const purchaseOrder of remoteData.purchaseOrders) {
          const dexiePurchaseOrder: DexiePurchaseOrder = {
            ...purchaseOrder,
            id: purchaseOrder.id,
          };
          await db.purchaseOrders.put(dexiePurchaseOrder);
        }
        console.log(`✅ Applied ${remoteData.purchaseOrders.length} purchase order changes`);
      }
      console.log('✅ Remote changes applied successfully');
    } catch (error) {
      console.error('❌ Error applying remote changes:', error);
      throw new Error(
        `Failed to apply remote changes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private startAutoSync(userId: string) {
    this.stopAutoSync();
    if (this.config.syncInterval > 0) {
      console.log(
        `🔄 Starting auto-sync every ${this.config.syncInterval} minutes`,
      );
      this.syncInterval = setInterval(() => {
        if (this.config.enabled && !this.status.isSyncing) {
          void this.sync(userId);
        }
      }, this.config.syncInterval * 60 * 1000);
    }
  }

  private stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Auto-sync stopped');
    }
  }

  private async saveConfig(userId: string) {
    try {
      const { firestoreId } = this.getFirestoreUserId(userId);
      const configKey = `nexTrack_syncConfig_${firestoreId}`;
      localStorage.setItem(configKey, JSON.stringify(this.config));
    } catch (error) {
      console.error('❌ Error saving sync config:', error);
    }
  }

  async loadConfig(userId: string): Promise<SyncConfig> {
    try {
      const { firestoreId } = this.getFirestoreUserId(userId);
      const configKey = `nexTrack_syncConfig_${firestoreId}`;
      const savedConfig = localStorage.getItem(configKey);
      if (savedConfig) this.config = { ...this.config, ...JSON.parse(savedConfig) };
      return this.config;
    } catch (error) {
      console.error('❌ Error loading sync config:', error);
      return this.config;
    }
  }

  async updateConfig(userId: string, updates: Partial<SyncConfig>) {
    const { firestoreId } = this.getFirestoreUserId(userId);
    this.config = { ...this.config, ...updates };
    await this.saveConfig(firestoreId);
    if (this.config.enabled && this.config.autoSync) {
      this.startAutoSync(firestoreId);
    } else {
      this.stopAutoSync();
    }
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  destroy() {
    this.stopAutoSync();
    this.config.enabled = false;
    console.log('🧹 FirebaseSyncService destroyed');
  }
}

export const firebaseSyncService = new FirebaseSyncService();
