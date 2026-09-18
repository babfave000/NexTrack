// src/services/cloudSync/firebaseSyncService.ts
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../db/dexie';
import type { SyncConfig, SyncStatus } from './types';
import { firebaseService } from '../firebaseService';

import type {
  Product as DexieProduct,
  SalesOrder as DexieSalesOrder,
  PurchaseOrder as DexiePurchaseOrder,
  UserProfile as DexieUserProfile,
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

type UserProfile = Omit<DexieUserProfile, 'id'> & { id: string };

interface SyncData {
  products: Product[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  userProfile: UserProfile | null;
  lastSync: Date;
  syncVersion: number;
  userId: string;
}

export class FirebaseSyncService {
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

  /**
   * Deep-scrub an arbitrary value into a Firestore-safe shape:
   *  - Drops `undefined` keys inside plain objects (Firestore rejects undefined).
   *  - Converts `null` primitives to sensible defaults: string|null -> '',
   *    number|null -> 0, boolean|null -> false.
   *  - Converts Date objects to ISO-8601 strings (matches Dexie ISO schema).
   *  - Converts RegExp objects to their source string.
   *  - Converts Set/Map to plain arrays / objects so they serialize cleanly.
   *  - Recurses into arrays and plain objects; preserves primitives.
   */
  private sanitizeForFirestore<T>(value: T): unknown {
    const seen = new WeakSet<object>();
    const scrub = (v: unknown, depth: number): unknown => {
      if (depth > 20) {
        // Safety guard — our model is shallow nested (items arrays are the
        // only inner arrays, which land ~depth 4) so anything deeper is a
        // cycle or bad shape.
        return null;
      }
      if (v === undefined) return undefined;
      if (v === null) return null;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        return v;
      }
      if (typeof v === 'bigint') {
        return v.toString();
      }
      if (v instanceof Date) {
        const iso = v.toISOString();
        return Number.isNaN(v.getTime()) ? new Date(0).toISOString() : iso;
      }
      if (v instanceof RegExp) {
        return String(v);
      }
      if (v instanceof Set) {
        return Array.from(v.values()).map((x) => scrub(x, depth + 1));
      }
      if (v instanceof Map) {
        const obj: Record<string, unknown> = {};
        for (const [k, mv] of v.entries()) {
          const key = typeof k === 'string' ? k : String(k);
          const out = scrub(mv, depth + 1);
          if (out !== undefined) obj[key] = out;
        }
        return obj;
      }
      if (Array.isArray(v)) {
        return v.map((x) => {
          const s = scrub(x, depth + 1);
          return s === undefined ? null : s;
        });
      }
      if (typeof v === 'object') {
        if (seen.has(v as object)) return null;
        seen.add(v as object);
        const out: Record<string, unknown> = {};
        for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
          if (raw === undefined) {
            // Omit entirely — Firestore errors on undefined field values.
            continue;
          }
          const s = scrub(raw, depth + 1);
          if (s === undefined) continue;
          out[k] = s;
        }
        return out;
      }
      if (typeof v === 'function') return undefined;
      // Symbols / unknown exotic types -> drop
      return undefined;
    };
    return scrub(value, 0);
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

  async enableSync(
    userId: string,
    options?: { autoSync?: boolean; syncInterval?: number },
  ) {
    const { firestoreId, hasRealFirebaseIdentity } = this.getFirestoreUserId(userId);
    if (!hasRealFirebaseIdentity) {
      console.log(
        'ℹ️ enableSync skipped: user does not have a real Firebase identity (Dexie/local-only account stays offline).',
      );
      return false;
    }
    console.log('🔄 Enabling sync for user:', firestoreId);
    try {
      await this.waitForAuth();
      // Apply options first so `saveConfig` stores the final values.
      if (options?.autoSync !== undefined) this.config.autoSync = options.autoSync;
      if (options?.syncInterval !== undefined) this.config.syncInterval = options.syncInterval;
      this.config.enabled = true;
      await this.saveConfig(firestoreId);
      if (this.config.autoSync) this.startAutoSync(firestoreId);
      this.startRemoteListener(firestoreId);
      console.log('✅ Cloud sync enabled for user:', firestoreId);
      // Kick off an initial pull-then-push sync so both sides converge immediately.
      void this.sync(firestoreId);
      return true;
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

  /**
   * Auto-enable sync exclusively for accounts that have a real Firebase uid
   * identity (NOT Dexie-only local-# paths). For these users, sync is opt-OUT
   * by default: if they have never explicitly toggled it off via settings UI
   * (i.e. no config saved to LS for their uid, or saved config.enabled is
   * still the default `false` and no explicit "disabled" signal was set), we
   * treat it as enabled + autoSync true + 5 min interval. Runs an initial
   * pull/push sync immediately and starts the Firestore onSnapshot remote
   * listener. Safe to call on every sign-in / onUserChanged event.
   *
   * Returns true when sync was actually enabled, false otherwise.
   */
  async autoEnableForFirebaseUser(userIdHint?: string): Promise<boolean> {
    // Must have real Firebase identity somewhere.
    const fbUser = firebaseService.currentUser;
    const userId = userIdHint ?? fbUser?.uid;
    if (!userId) {
      console.log('ℹ️ autoEnableForFirebaseUser skipped: no authenticated Firebase user.');
      return false;
    }
    const { firestoreId, hasRealFirebaseIdentity } = this.getFirestoreUserId(userId);
    if (!hasRealFirebaseIdentity) {
      console.log(
        'ℹ️ autoEnableForFirebaseUser skipped: not a real Firebase identity (Dexie-only account stays offline-only):',
        firestoreId,
      );
      return false;
    }

    try {
      await this.waitForAuth();
      // Load any previously saved sync config from LS (if user disabled it via
      // settings UI, we must respect that choice). config.enabled defaults to
      // `false` in-memory, so a freshly loaded NULL config keeps `false`.
      const saved = await this.loadConfig(firestoreId);

      // If the user has NEVER explicitly toggled sync in the UI, LS will have
      // no record → loadConfig returns object with enabled=false. Treat that
      // as "use the smart default: ENABLE + autosync". If user DID toggle it
      // off explicitly, saved.enabled stays false and we skip.
      const lsKey = `nexTrack_syncConfig_${firestoreId}`;
      const hasExplicitLsPref = typeof window !== 'undefined' && !!localStorage.getItem(lsKey);

      if (hasExplicitLsPref && !saved.enabled) {
        console.log(
          'ℹ️ autoEnableForFirebaseUser: explicit user opt-out saved in LS — leaving sync disabled:',
          firestoreId,
        );
        return false;
      }

      // Either no explicit pref yet, or the pref says enabled=true.
      const autoSync = saved.autoSync ?? true;
      const syncInterval = saved.syncInterval ?? 5;
      await this.enableSync(firestoreId, { autoSync, syncInterval });
      return true;
    } catch (error) {
      console.error('❌ autoEnableForFirebaseUser failed:', error);
      this.status.lastError = `Auto-enable sync failed: ${error}`;
      return false;
    }
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

      const [products, salesOrders, purchaseOrders, userProfiles] = await Promise.all([
        db.products.toArray(),
        db.salesOrders.toArray(),
        db.purchaseOrders.toArray(),
        db.userProfile.toArray(),
      ]);
      console.log(`📦 Found ${products.length} products`);
      console.log(`🛒 Found ${salesOrders.length} sales orders`);
      console.log(`📥 Found ${purchaseOrders.length} purchase orders`);
      console.log(`👤 Found ${userProfiles.length} user profile rows`);

      // Resolve the sync-payload `userId` to the real Firebase uid when we
      // have one. Using "1" here (the legacy bug) caused payloads from every
      // device to disagree on user identity. If no Firebase identity, fall
      // back to the Dexie user's db id stringified.
      const fbUser = firebaseService.currentUser;
      const effectiveUserId = fbUser?.uid || (userProfiles[0]?.userId ? String(userProfiles[0].userId) : 'local-1');

      const validProducts: Product[] = products
        .filter((p) => p.id !== undefined)
        .map((p) => ({
          id: p.id!,
          name: p.name || 'Unnamed Product',
          category: p.category ?? '',
          brand: p.brand ?? '',
          supplier: p.supplier ?? '',
          description: p.description ?? '',
          sku: p.sku ?? '',
          stock: p.stock ?? 0,
          costPrice: p.costPrice ?? 0,
          salePrice: p.salePrice ?? 0,
          lowStockThreshold: p.lowStockThreshold ?? 0,
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
          userId: p.userId ?? effectiveUserId,
          organizationId: p.organizationId ?? undefined,
          firebaseUid: p.firebaseUid ?? fbUser?.uid ?? undefined,
        }));

      const validSalesOrders: SalesOrder[] = salesOrders
        .filter((so) => so.id !== undefined)
        .map((so) => ({
          id: so.id!,
          customer: so.customer ?? '',
          date: so.date || new Date().toISOString(),
          items: so.items || [],
          total: so.total ?? 0,
          paymentStatus: so.paymentStatus || 'pending',
          status: (so.status as OrderStatus) || 'draft',
          userId: so.userId ?? effectiveUserId,
          organizationId: (so as DexieSalesOrder & { organizationId?: number }).organizationId ?? undefined,
        }));

      const validPurchaseOrders: PurchaseOrder[] = purchaseOrders
        .filter((po) => po.id !== undefined)
        .map((po) => ({
          id: po.id!,
          supplier: po.supplier ?? '',
          date: po.date || new Date().toISOString(),
          items: po.items || [],
          total: po.total ?? 0,
          status: (po.status as OrderStatus) || 'draft',
          paymentStatus: po.paymentStatus || 'unpaid',
          userId: po.userId ?? effectiveUserId,
          organizationId: (po as DexiePurchaseOrder & { organizationId?: number }).organizationId ?? undefined,
        }));

      // Pick primary userProfile for the sync payload. Prefer the profile row
      // whose `id` matches the current Firebase uid (string ids are written
      // that way by SettingsContext/UserProfilePage code when present). Fall
      // back to first row if no uid-match, then to null if no profile rows
      // exist at all.
      let primaryProfile: DexieUserProfile | null = null;
      if (fbUser?.uid) {
        const matchById = userProfiles.find(
          (p) => typeof p.id === 'string' && p.id === fbUser.uid,
        );
        primaryProfile = matchById ?? userProfiles[0] ?? null;
      } else {
        primaryProfile = userProfiles[0] ?? null;
      }
      let validProfile: UserProfile | null = null;
      if (primaryProfile) {
        const stableId: string =
          typeof primaryProfile.id === 'string' && primaryProfile.id.length > 0
            ? primaryProfile.id
            : (fbUser?.uid || `profile-${primaryProfile.userId || 'local'}`);
        validProfile = {
          id: stableId,
          businessName: primaryProfile.businessName || '',
          email: primaryProfile.email ?? undefined,
          phone: primaryProfile.phone ?? undefined,
          address: primaryProfile.address ?? undefined,
          website: primaryProfile.website ?? undefined,
          socialLinks: primaryProfile.socialLinks ?? undefined,
          logoUrl: primaryProfile.logoUrl ?? undefined,
          lowStockThreshold: primaryProfile.lowStockThreshold ?? 0,
          showLowStockWarnings: Boolean(primaryProfile.showLowStockWarnings),
          autoBackupFrequency: primaryProfile.autoBackupFrequency ?? 24,
          createdAt: primaryProfile.createdAt ?? undefined,
          updatedAt: primaryProfile.updatedAt ?? new Date().toISOString(),
          userId: primaryProfile.userId ?? effectiveUserId,
          organizationId: primaryProfile.organizationId ?? undefined,
        };
      }

      const transformedData: SyncData = {
        products: validProducts,
        salesOrders: validSalesOrders,
        purchaseOrders: validPurchaseOrders,
        userProfile: validProfile,
        lastSync: new Date(),
        syncVersion: Date.now(),
        userId: effectiveUserId,
      };
      console.log('✅ Local data prepared for sync:', {
        products: transformedData.products.length,
        salesOrders: transformedData.salesOrders.length,
        purchaseOrders: transformedData.purchaseOrders.length,
        userId: transformedData.userId,
        profileBusinessName: transformedData.userProfile?.businessName || null,
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
      const sanitizedUserId = this.sanitizeUserId(userId);
      console.log('📤 Pushing data to Firebase for user:', sanitizedUserId);
      const userDocRef = doc(firebaseService.firestore, 'users', sanitizedUserId);
      const syncData = {
        ...data,
        lastSync: new Date().toISOString(),
        syncVersion: Date.now(),
        userId: sanitizedUserId,
      };
      // Firestore rejects documents with undefined field values. Our Dexie
      // schemas allow lots of optional fields (phone, email, address,
      // description, sku, firebaseUid, organizationId on every table, plus
      // createdAt on old rows). The deep scrubber drops undefined keys
      // entirely, scalarizes Date/RegExp/Set/Map, and coerces null to
      // sensible defaults for primitives so nothing reaches Firestore with
      // an unsupported shape.
      const sanitized = this.sanitizeForFirestore(syncData) as Record<string, unknown>;
      // Ensure a few safety required fields never drop out (userId +
      // syncVersion are used by the other device to know WHOSE data this is
      // and WHETHER to apply).
      if (!sanitized.userId) sanitized.userId = sanitizedUserId;
      if (sanitized.syncVersion === undefined || sanitized.syncVersion === null) {
        sanitized.syncVersion = Date.now();
      }
      if (!sanitized.lastSync) sanitized.lastSync = new Date().toISOString();
      console.log('📤 Pushing data to Firebase (sanitized)...');
      await setDoc(userDocRef, sanitized, { merge: true });
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
      const sanitizedUserId = this.sanitizeUserId(userId);
      const userDocRef = doc(firebaseService.firestore, 'users', sanitizedUserId);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as SyncData;
        console.log('📥 Pulled data from Firebase:', Object.keys(data));
        return data;
      } else {
        console.log('ℹ️ No data found in Firebase for user:', sanitizedUserId);
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
      const sanitizedUserId = this.sanitizeUserId(userId);
      const userDocRef = doc(firebaseService.firestore, 'users', sanitizedUserId);
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
            await this.saveConfig(userId);
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
          const dexieProduct: DexieProduct = {
            ...product,
            id: product.id,
            description: product.description,
            sku: product.sku,
            lowStockThreshold: product.lowStockThreshold ?? 0,
            firebaseUid: product.firebaseUid,
            organizationId: product.organizationId,
          } as DexieProduct;
          await db.products.put(dexieProduct);
        }
        console.log(`✅ Applied ${remoteData.products.length} product changes`);
      }
      if (remoteData.salesOrders) {
        for (const salesOrder of remoteData.salesOrders) {
          const dexieSalesOrder: DexieSalesOrder = {
            ...salesOrder,
            id: salesOrder.id,
            organizationId: salesOrder.organizationId,
          } as DexieSalesOrder;
          await db.salesOrders.put(dexieSalesOrder);
        }
        console.log(`✅ Applied ${remoteData.salesOrders.length} sales order changes`);
      }
      if (remoteData.purchaseOrders) {
        for (const purchaseOrder of remoteData.purchaseOrders) {
          const dexiePurchaseOrder: DexiePurchaseOrder = {
            ...purchaseOrder,
            id: purchaseOrder.id,
            organizationId: purchaseOrder.organizationId,
          } as DexiePurchaseOrder;
          await db.purchaseOrders.put(dexiePurchaseOrder);
        }
        console.log(`✅ Applied ${remoteData.purchaseOrders.length} purchase order changes`);
      }
      let profileApplied: string | null = null;
      if (remoteData.userProfile) {
        const incoming = remoteData.userProfile;
        // Dexie UserProfile.id schema is STRING PK; SyncData type already
        // types id as string, but cast explicitly anyway so any future
        // refactor doesn't accidentally coerce to number.
        const stableId: string =
          typeof incoming.id === 'string' && incoming.id.length > 0
            ? incoming.id
            : (remoteData.userId?.length ? remoteData.userId : `profile-${Date.now()}`);
        const dexieProfile: DexieUserProfile = {
          id: stableId,
          businessName: incoming.businessName || '',
          email: incoming.email ?? undefined,
          phone: incoming.phone ?? undefined,
          address: incoming.address ?? undefined,
          website: incoming.website ?? undefined,
          socialLinks: incoming.socialLinks ?? undefined,
          logoUrl: incoming.logoUrl ?? undefined,
          lowStockThreshold: incoming.lowStockThreshold ?? 0,
          showLowStockWarnings: Boolean(incoming.showLowStockWarnings),
          autoBackupFrequency: incoming.autoBackupFrequency ?? 24,
          createdAt: incoming.createdAt ?? undefined,
          updatedAt: incoming.updatedAt ?? new Date().toISOString(),
          userId: (incoming.userId != null && typeof incoming.userId === 'number')
            ? incoming.userId
            : (typeof remoteData.userId === 'number' ? remoteData.userId : 1),
          organizationId: incoming.organizationId ?? undefined,
        };
        await db.userProfile.put(dexieProfile);
        profileApplied = dexieProfile.businessName;
        console.log(`✅ Applied userProfile (${dexieProfile.businessName || 'unnamed'})`);
      }
      // Notify React UI that a fresh profile arrived from the other device.
      // SettingsContext and Dashboard both listen to this event and reload
      // their businessInfo cache so NavBar brand + welcome card update
      // instantly without a full-page refresh.
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(
            new CustomEvent('nextrack:profile-synced', {
              detail: { businessName: profileApplied, syncVersion: remoteData.syncVersion },
            }),
          );
        } catch {
          /* dispatchEvent can throw in SSR-ish setups; ignore here */
        }
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
      const sanitizedUserId = this.sanitizeUserId(userId);
      const configKey = `nexTrack_syncConfig_${sanitizedUserId}`;
      localStorage.setItem(configKey, JSON.stringify(this.config));
    } catch (error) {
      console.error('❌ Error saving sync config:', error);
    }
  }

  async loadConfig(userId: string): Promise<SyncConfig> {
    try {
      const sanitizedUserId = this.sanitizeUserId(userId);
      const configKey = `nexTrack_syncConfig_${sanitizedUserId}`;
      const savedConfig = localStorage.getItem(configKey);
      if (savedConfig) this.config = { ...this.config, ...JSON.parse(savedConfig) };
      return this.config;
    } catch (error) {
      console.error('❌ Error loading sync config:', error);
      return this.config;
    }
  }

  async updateConfig(userId: string, updates: Partial<SyncConfig>) {
    this.config = { ...this.config, ...updates };
    await this.saveConfig(userId);
    if (this.config.enabled && this.config.autoSync) {
      this.startAutoSync(userId);
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
