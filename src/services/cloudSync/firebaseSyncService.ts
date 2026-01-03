// src/services/cloudSync/firebaseSyncService.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import { db } from '../../db/dexie';
import type { SyncConfig, SyncStatus } from './types';
import { firebaseConfig, debugFirebaseConfig } from '../../config/firebase';

// Import the actual Product type from Dexie to ensure compatibility
import type { Product as DexieProduct, SalesOrder as DexieSalesOrder, PurchaseOrder as DexiePurchaseOrder, OrderStatus } from '../../db/dexie';

// Define interfaces that match the Dexie schema exactly
interface Product extends Omit<DexieProduct, 'id'> {
  id: number; // Ensure id is always a number, not undefined
}

interface SalesOrder extends Omit<DexieSalesOrder, 'id'> {
  id: number; // Ensure id is always a number, not undefined
  status: OrderStatus;
}

interface PurchaseOrder extends Omit<DexiePurchaseOrder, 'id'> {
  id: number; // Ensure id is always a number, not undefined
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
  private app: FirebaseApp | null = null;
  private firestore: Firestore | null = null;
  private auth: Auth | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private authReady = false;
  private authPromise: Promise<void>;
  private initializationError: string | null = null;

  public config: SyncConfig = {
    enabled: false,
    autoSync: false,
    syncInterval: 5,
    lastSync: null
  };

  public status: SyncStatus = {
    isSyncing: false,
    lastSuccess: null,
    lastError: null,
    pendingChanges: 0
  };

  constructor() {
    console.log('🔄 Initializing FirebaseSyncService...');
    debugFirebaseConfig(); // Debug the config
    
    try {
      // Check if config is valid
      if (!this.isConfigValid()) {
        throw new Error('Invalid Firebase configuration. Please check your environment variables.');
      }

      // Initialize Firebase only once
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
      } else {
        this.app = getApps()[0];
        console.log('✅ Using existing Firebase app');
      }

      this.firestore = getFirestore(this.app);
      this.auth = getAuth(this.app);
      
      // Create auth promise to wait for initialization
      this.authPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const error = 'Firebase auth timeout - check your configuration and internet connection';
          this.initializationError = error;
          reject(new Error(error));
        }, 15000); // 15 second timeout

        onAuthStateChanged(this.auth!, async (user: User | null) => {
          if (user) {
            console.log('✅ Firebase auth successful, user:', user.uid);
            this.authReady = true;
            this.initializationError = null;
            clearTimeout(timeout);
            resolve();
          } else {
            try {
              console.log('🔄 No user found, signing in anonymously...');
              const result = await signInAnonymously(this.auth!);
              console.log('✅ Anonymous auth successful:', result.user.uid);
              this.authReady = true;
              this.initializationError = null;
              clearTimeout(timeout);
              resolve();
            } catch (error: unknown) {
              console.error('❌ Anonymous auth failed:', error);
              this.initializationError = `Auth failed: ${error instanceof Error ? error.message : String(error)}`;
              this.status.lastError = this.initializationError;
              clearTimeout(timeout);
              reject(error);
            }
          }
        });

        // Immediate check for current user
        const currentUser = this.auth!.currentUser;
        if (currentUser) {
          console.log('✅ Already authenticated:', currentUser.uid);
          this.authReady = true;
          this.initializationError = null;
          clearTimeout(timeout);
          resolve();
        }
      });

    } catch (error: unknown) {
      console.error('❌ Firebase initialization failed:', error);
      this.initializationError = `Initialization failed: ${error instanceof Error ? error.message : String(error)}`;
      this.status.lastError = this.initializationError;
      this.authPromise = Promise.reject(error);
    }
  }

  private isConfigValid(): boolean {
    const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
    const missing = required.filter(key => 
      !firebaseConfig[key as keyof typeof firebaseConfig] || 
      firebaseConfig[key as keyof typeof firebaseConfig].includes('your-')
    );
    
    if (missing.length > 0) {
      console.error('❌ Missing Firebase config:', missing);
      return false;
    }
    return true;
  }

  // Wait for auth to be ready
  private async waitForAuth(): Promise<void> {
    if (this.authReady) {
      return;
    }
    await this.authPromise;
  }

  // Validate and sanitize user ID for Firebase
  private sanitizeUserId(userId: unknown): string {
    if (!userId) {
      console.warn('⚠️ No user ID provided, using anonymous ID');
      return this.auth?.currentUser?.uid || 'anonymous-user';
    }
    
    // Convert to string and remove any invalid characters
    const sanitized = String(userId).replace(/[^a-zA-Z0-9_-]/g, '-');
    console.log('🔧 Sanitized user ID:', { original: userId, sanitized });
    return sanitized;
  }

  async enableSync(userId: string) {
    console.log('🔄 Enabling sync for user:', userId);
    
    try {
      // Wait for auth to be ready
      await this.waitForAuth();
      
      if (!this.authReady) {
        throw new Error('Firebase authentication not ready: ' + this.initializationError);
      }

      this.config.enabled = true;
      await this.saveConfig(userId);
      
      console.log('✅ Cloud sync enabled for user:', userId);
      
      if (this.config.autoSync) {
        this.startAutoSync(userId);
      }

      // Start listening for remote changes
      this.startRemoteListener(userId);
      
    } catch (error) {
      console.error('❌ Failed to enable sync:', error);
      this.status.lastError = `Enable sync failed: ${error}`;
      throw error;
    }
  }

  async disableSync(userId: string) {
    console.log('🔄 Disabling sync for user:', userId);
    this.config.enabled = false;
    this.stopAutoSync();
    await this.saveConfig(userId);
    console.log('✅ Cloud sync disabled for user:', userId);
  }

  // Test connection method with better error reporting
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Firebase connection...');
      
      // Wait for auth to be ready
      await this.waitForAuth();
      
      if (!this.authReady) {
        throw new Error('Firebase not ready: ' + this.initializationError);
      }

      // Test Firestore operation
      const testDoc = doc(this.firestore!, '_connection_tests', 'test');
      await setDoc(testDoc, { 
        test: true, 
        timestamp: new Date(),
        message: 'Connection test successful',
        userId: this.auth!.currentUser?.uid || 'unknown'
      }, { merge: true });
      
      console.log('✅ Firebase connection test passed');
      return true;
      
    } catch (error: unknown) {
      console.error('❌ Firebase connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.status.lastError = `Connection test failed: ${errorMessage}`;
      
      // Provide specific error messages
      if (errorMessage.includes('permission') || (error as { code?: string }).code === 'permission-denied') {
        this.status.lastError = 'Firestore permission denied. Check security rules.';
      } else if (errorMessage.includes('quota')) {
        this.status.lastError = 'Firebase quota exceeded. Check your plan.';
      } else if (errorMessage.includes('network') || (error as { code?: string }).code === 'unavailable') {
        this.status.lastError = 'Network error. Check internet connection.';
      }
      
      return false;
    }
  }

  // Check if Firebase is ready
  isReady(): boolean {
    return this.authReady;
  }

  // Get current auth state
  getAuthState(): User | null {
    return this.auth?.currentUser || null;
  }

  // Get initialization error
  getInitializationError(): string | null {
    return this.initializationError;
  }

  // Main sync method
  async sync(userId: string): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('🔄 Sync skipped: Sync is not enabled');
      return false;
    }

    if (this.status.isSyncing) {
      console.log('🔄 Sync skipped: Already syncing');
      return false;
    }

    console.log('🔄 Starting sync for user:', userId);
    this.status.isSyncing = true;
    this.status.lastError = null;

    try {
      // Wait for auth to be ready
      await this.waitForAuth();
      
      if (!this.authReady) {
        throw new Error('Firebase authentication not ready');
      }

      // Get local changes
      const localData = await this.getLocalChanges();
      
      // Push to Firebase
      await this.pushToFirebase(userId, localData);
      
      // Pull from Firebase (to get any remote changes)
      const remoteData = await this.pullFromFirebase(userId);
      if (remoteData) {
        await this.applyRemoteChanges(remoteData);
      }

      // Update status - IMPORTANT: Update lastSuccess timestamp
      this.status.lastSuccess = new Date();
      this.status.isSyncing = false;
      this.status.lastError = null;
      this.config.lastSync = new Date();
      await this.saveConfig(userId);

      console.log('✅ Sync completed successfully at:', this.status.lastSuccess);
      return true;

    } catch (error: unknown) {
      console.error('❌ Sync failed:', error);
      this.status.isSyncing = false;
      this.status.lastError = `Sync failed: ${error instanceof Error ? error.message : String(error)}`;
      return false;
    }
  }

  // Debug database structure
  private async debugDatabase() {
    try {
      console.log('🔍 Debugging database structure...');
      
      // Check if tables exist and have data - using known table names from your schema
      const tables = ['products', 'salesOrders', 'purchaseOrders'] as const;
      
      for (const table of tables) {
        try {
          // Use type-safe table access
          const tableData = await db[table].toArray();
          console.log(`📊 ${table}: ${tableData.length} records`);
          if (tableData.length > 0) {
            console.log(`Sample ${table} record:`, tableData[0]);
          }
        } catch (error) {
          console.log(`❌ Error reading table ${table}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Database debug failed:', error);
    }
  }

  // Reset sync state
  async resetSyncState(userId: string) {
    console.log('🔄 Resetting sync state...');
    this.status = {
      isSyncing: false,
      lastSuccess: null,
      lastError: null,
      pendingChanges: 0
    };
    this.config.enabled = false;
    this.config.lastSync = null;
    await this.saveConfig(userId);
    console.log('✅ Sync state reset');
  }

  private async getLocalChanges(): Promise<SyncData> {
    try {
      console.log('🔍 Getting local changes from database...');
      
      // Debug first to see what's happening
      await this.debugDatabase();

      // Use proper typing for database access
      const products = await db.products.toArray();
      const salesOrders = await db.salesOrders.toArray();
      const purchaseOrders = await db.purchaseOrders.toArray();

      console.log(`📦 Found ${products.length} products`);
      console.log(`🛒 Found ${salesOrders.length} sales orders`);
      console.log(`📥 Found ${purchaseOrders.length} purchase orders`);

      // Filter out any items with undefined IDs and ensure all required fields are present
      const validProducts: Product[] = products
        .filter(p => p.id !== undefined)
        .map(p => ({
          id: p.id!,
          name: p.name || 'Unnamed Product',
          category: p.category || '',
          brand: p.brand || '',
          supplier: p.supplier || '',
          stock: p.stock || 0,
          costPrice: p.costPrice || 0,
          salePrice: p.salePrice || 0,
          lowStockThreshold: p.lowStockThreshold || 5, // Default value if missing
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
          userId: p.userId || 1
        }));

      const validSalesOrders: SalesOrder[] = salesOrders
        .filter(so => so.id !== undefined)
        .map(so => ({
          id: so.id!,
          customer: so.customer || '',
          date: so.date || new Date().toISOString(),
          items: so.items || [],
          total: so.total || 0,
          paymentStatus: so.paymentStatus || 'pending',
          status: so.status || 'pending',
          userId: so.userId || 1
        }));

      const validPurchaseOrders: PurchaseOrder[] = purchaseOrders
        .filter(po => po.id !== undefined)
        .map(po => ({
          id: po.id!,
          supplier: po.supplier || '',
          date: po.date || new Date().toISOString(),
          items: po.items || [],
          total: po.total || 0,
          status: po.status || 'pending',
          paymentStatus: po.paymentStatus || 'pending',
          userId: po.userId || 1
        }));

      const transformedData: SyncData = {
        products: validProducts,
        salesOrders: validSalesOrders,
        purchaseOrders: validPurchaseOrders,
        lastSync: new Date(),
        syncVersion: Date.now(),
        userId: this.sanitizeUserId(1) // Default user ID for now
      };

      console.log('✅ Local data prepared for sync:', {
        products: transformedData.products.length,
        salesOrders: transformedData.salesOrders.length,
        purchaseOrders: transformedData.purchaseOrders.length
      });

      return transformedData;

    } catch (error: unknown) {
      console.error('❌ Error getting local changes:', error);
      throw new Error(`Failed to get local data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async pushToFirebase(userId: string, data: SyncData) {
    try {
      // Sanitize the user ID to ensure it's a valid string
      const sanitizedUserId = this.sanitizeUserId(userId);
      console.log('📤 Pushing data to Firebase for user:', sanitizedUserId);
      
      const userDocRef = doc(this.firestore!, 'users', sanitizedUserId);
      const syncData = {
        ...data,
        lastSync: new Date(),
        syncVersion: Date.now(),
        userId: sanitizedUserId
      };

      console.log('📤 Pushing data to Firebase...');
      await setDoc(userDocRef, syncData, { merge: true });
      console.log('✅ Data pushed to Firebase successfully');
    } catch (error: unknown) {
      console.error('❌ Error pushing to Firebase:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        userId: userId
      });
      throw new Error(`Firebase push failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async pullFromFirebase(userId: string): Promise<SyncData | null> {
    try {
      // Sanitize the user ID to ensure it's a valid string
      const sanitizedUserId = this.sanitizeUserId(userId);
      const userDocRef = doc(this.firestore!, 'users', sanitizedUserId);
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
      throw new Error(`Firebase pull failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private startRemoteListener(userId: string) {
    try {
      // Sanitize the user ID to ensure it's a valid string
      const sanitizedUserId = this.sanitizeUserId(userId);
      const userDocRef = doc(this.firestore!, 'users', sanitizedUserId);
      
      console.log('👂 Starting remote change listener...');
      onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data() as SyncData;
          console.log('🔄 Remote changes detected, applying...');
          await this.applyRemoteChanges(remoteData);
          
          // Update last sync time when remote changes are applied
          this.status.lastSuccess = new Date();
          this.config.lastSync = new Date();
          await this.saveConfig(userId);
        }
      }, (error) => {
        console.error('❌ Remote listener error:', error);
        this.status.lastError = `Remote sync error: ${error.message}`;
      });
    } catch (error) {
      console.error('❌ Error starting remote listener:', error);
    }
  }

  private async applyRemoteChanges(remoteData: SyncData) {
    try {
      console.log('🔄 Applying remote changes to local database...');
      
      if (remoteData.products) {
        for (const product of remoteData.products) {
          // Convert back to Dexie Product type for database storage
          const dexieProduct: DexieProduct = {
            ...product,
            id: product.id
          };
          await db.products.put(dexieProduct);
        }
        console.log(`✅ Applied ${remoteData.products.length} product changes`);
      }
      
      if (remoteData.salesOrders) {
        for (const salesOrder of remoteData.salesOrders) {
          // Convert back to Dexie SalesOrder type for database storage
          const dexieSalesOrder: DexieSalesOrder = {
            ...salesOrder,
            id: salesOrder.id
          };
          await db.salesOrders.put(dexieSalesOrder);
        }
        console.log(`✅ Applied ${remoteData.salesOrders.length} sales order changes`);
      }
      
      if (remoteData.purchaseOrders) {
        for (const purchaseOrder of remoteData.purchaseOrders) {
          // Convert back to Dexie PurchaseOrder type for database storage
          const dexiePurchaseOrder: DexiePurchaseOrder = {
            ...purchaseOrder,
            id: purchaseOrder.id
          };
          await db.purchaseOrders.put(dexiePurchaseOrder);
        }
        console.log(`✅ Applied ${remoteData.purchaseOrders.length} purchase order changes`);
      }
      
      console.log('✅ Remote changes applied successfully');
    } catch (error) {
      console.error('❌ Error applying remote changes:', error);
      throw new Error(`Failed to apply remote changes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private startAutoSync(userId: string) {
    this.stopAutoSync();
    
    if (this.config.syncInterval > 0) {
      console.log(`🔄 Starting auto-sync every ${this.config.syncInterval} minutes`);
      this.syncInterval = setInterval(() => {
        if (this.config.enabled && !this.status.isSyncing) {
          this.sync(userId);
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
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
      return this.config;
    } catch (error) {
      console.error('❌ Error loading sync config:', error);
      return this.config;
    }
  }

  async updateConfig(userId: string, updates: Partial<SyncConfig>) {
    this.config = { ...this.config, ...updates };
    await this.saveConfig(userId);
    
    // Restart auto-sync if settings changed
    if (this.config.enabled && this.config.autoSync) {
      this.startAutoSync(userId);
    } else {
      this.stopAutoSync();
    }
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  // Cleanup method
  destroy() {
    this.stopAutoSync();
    this.config.enabled = false;
    console.log('🧹 FirebaseSyncService destroyed');
  }
}

export const firebaseSyncService = new FirebaseSyncService();