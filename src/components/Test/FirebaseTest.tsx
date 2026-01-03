// src/components/Test/FirebaseTest.tsx
import { useState, useEffect } from 'react';
import { firebaseSyncService } from '../../services/cloudSync/firebaseSyncService';
import { useUserData } from '../../hooks/useUserData';

export default function FirebaseTest() {
  const { user } = useUserData();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState(firebaseSyncService.getStatus());
  const [isFirebaseReady, setIsFirebaseReady] = useState(firebaseSyncService.isReady());
  const [initError, setInitError] = useState(firebaseSyncService.getInitializationError());

  // Convert user ID to string for Firebase service
  const userId = user?.id ? String(user.id) : null;

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(firebaseSyncService.getStatus());
      setIsFirebaseReady(firebaseSyncService.isReady());
      setInitError(firebaseSyncService.getInitializationError());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const testFirebaseConnection = async () => {
    if (!userId) {
      setTestResult('❌ No user logged in');
      return;
    }
    
    setIsTesting(true);
    setTestResult('🧪 Testing Firebase connection...');
    
    try {
      // Step 1: Test Firebase connection
      setTestResult('🔄 Testing Firebase connection...');
      const connectionTest = await firebaseSyncService.testConnection();
      
      if (!connectionTest) {
        throw new Error('Firebase connection test failed');
      }
      
      setTestResult('✅ Firebase connection successful!');
      
      // Step 2: Load config
      setTestResult('🔄 Loading sync configuration...');
      await firebaseSyncService.loadConfig(userId);
      
      // Step 3: Enable sync
      setTestResult('🔄 Enabling cloud sync...');
      await firebaseSyncService.enableSync(userId);
      
      // Step 4: Test sync
      setTestResult('🔄 Testing data sync...');
      await firebaseSyncService.sync(userId);
      
      setTestResult('✅ Firebase connection and sync working correctly!');
      
    } catch (error: unknown) {
      console.error('Firebase test error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Firebase error: ${errorMessage}`);
    } finally {
      setIsTesting(false);
    }
  };

  const initializeFirebaseOnly = async () => {
    setIsTesting(true);
    setTestResult('🔄 Initializing Firebase only...');
    
    try {
      // Just test the connection without enabling sync
      const connectionTest = await firebaseSyncService.testConnection();
      
      if (connectionTest) {
        setTestResult('✅ Firebase initialized successfully! Ready for sync.');
      } else {
        setTestResult('❌ Firebase initialization failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Firebase init error: ${errorMessage}`);
    } finally {
      setIsTesting(false);
    }
  };

  const checkConfiguration = () => {
    setTestResult('🔧 Checking Firebase configuration...');
    
    // Open browser console to see debug output
    console.log('=== Firebase Configuration Check ===');
    // This will trigger the debug output from firebaseSyncService constructor
    
    setTestResult('🔧 Check browser console for Firebase configuration details.');
  };

  const debugDatabase = async () => {
    setTestResult('🔍 Debugging database structure... check console');
    // Trigger sync which will run the debug method
    if (userId) {
      await firebaseSyncService.sync(userId);
    } else {
      console.log('🔍 Manual database debug:');
      // Manually trigger debug
      const localData = await firebaseSyncService['getLocalChanges']();
      console.log('Debug completed:', localData);
    }
  };

  const resetSyncState = async () => {
    if (!userId) return;
    
    setIsTesting(true);
    setTestResult('🔄 Resetting sync state...');
    
    try {
      await firebaseSyncService.resetSyncState(userId);
      setTestResult('✅ Sync state reset successfully!');
      setSyncStatus(firebaseSyncService.getStatus());
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Error resetting sync: ${errorMessage}`);
    } finally {
      setIsTesting(false);
    }
  };

  const addTestData = async () => {
    if (!userId) return;
    
    try {
      // First make sure Firebase is ready
      if (!firebaseSyncService.isReady()) {
        setTestResult('❌ Firebase not ready. Please test connection first.');
        return;
      }

      // Add some test data to local database first
      const { db } = await import('../../db/dexie');
      
      // Add a test product - including all required properties from Product type
      await db.products.put({
        name: 'Test Product',
        brand: 'Test Brand',
        stock: 10,
        costPrice: 15.99,
        salePrice: 29.99,
        lowStockThreshold: 5, // Added the required property
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user?.id || 1 // Use user's ID or fallback to 1
        ,
        category: ''
      });

      setTestResult('✅ Test data added locally. Now syncing to Firebase...');
      
      // Sync to Firebase
      await firebaseSyncService.sync(userId);
      setTestResult('✅ Test data synced to Firebase! Check your Firestore database.');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Error adding test data: ${errorMessage}`);
    }
  };

  const viewFirestoreData = () => {
    window.open('https://console.firebase.google.com/project/_/firestore/data', '_blank');
  };

  const clearTestData = async () => {
    if (!userId) return;
    
    try {
      const { db } = await import('../../db/dexie');
      
      // Clear test products
      const allProducts = await db.products.toArray();
      const testProducts = allProducts.filter(p => p.name === 'Test Product');
      
      let deletedCount = 0;
      for (const product of testProducts) {
        // Only delete if product has a valid ID
        if (product.id) {
          await db.products.delete(product.id);
          deletedCount++;
        }
      }
      
      setTestResult(`✅ Cleared ${deletedCount} test products from local database.`);
      
      // Sync the deletion to Firebase
      await firebaseSyncService.sync(userId);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Error clearing test data: ${errorMessage}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">🔥 Firebase Connection Test</h3>
      
      {/* Firebase Status */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Firebase Status</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Firebase Ready:</div>
          <div className={`font-medium ${isFirebaseReady ? 'text-green-600' : 'text-red-600'}`}>
            {isFirebaseReady ? '✅ Yes' : '❌ No'}
          </div>
          
          <div>Auth State:</div>
          <div>{firebaseSyncService.getAuthState() ? '✅ Authenticated' : '❌ Not authenticated'}</div>
          
          <div>Sync Status:</div>
          <div className={`font-medium ${
            syncStatus.isSyncing ? 'text-yellow-600' : 
            syncStatus.lastError ? 'text-red-600' : 'text-green-600'
          }`}>
            {syncStatus.isSyncing ? '🔄 Syncing' : 
             syncStatus.lastError ? '❌ Error' : '✅ Ready'}
          </div>
          
          <div>Last Sync:</div>
          <div>{syncStatus.lastSuccess ? syncStatus.lastSuccess.toLocaleString() : 'Never'}</div>
          
          {initError && (
            <>
              <div>Init Error:</div>
              <div className="text-red-600 text-xs col-span-2">{initError}</div>
            </>
          )}
          
          {syncStatus.lastError && (
            <>
              <div>Last Error:</div>
              <div className="text-red-600 text-xs col-span-2">{syncStatus.lastError}</div>
            </>
          )}
        </div>
      </div>

      {/* Test Controls */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={checkConfiguration}
            className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
          >
            Check Config
          </button>

          <button
            type="button"
            onClick={initializeFirebaseOnly}
            disabled={isTesting}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
          >
            {isTesting ? '🔄 Testing...' : 'Test Connection'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={testFirebaseConnection}
            disabled={isTesting}
            className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-sm"
          >
            Full Test
          </button>

          <button
            type="button"
            onClick={debugDatabase}
            disabled={isTesting}
            className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium text-sm"
          >
            Debug DB
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={addTestData}
            disabled={isTesting || !isFirebaseReady}
            className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium text-sm"
          >
            Add Test Data
          </button>

          <button
            type="button"
            onClick={resetSyncState}
            disabled={isTesting}
            className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium text-sm"
          >
            Reset Sync
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={clearTestData}
            disabled={isTesting}
            className="bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium text-sm"
          >
            Clear Test Data
          </button>

          <button
            type="button"
            onClick={viewFirestoreData}
            className="bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors font-medium text-sm"
          >
            Firebase Console
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className={`mt-4 p-3 rounded-lg ${
          testResult.includes('✅') ? 'bg-green-50 border border-green-200 text-green-800' :
          testResult.includes('❌') ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          <p className="text-sm font-medium">{testResult}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">Troubleshooting Steps:</h4>
        <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
          <li><strong>First:</strong> Click "Check Config" and look in browser console (F12)</li>
          <li><strong>Then:</strong> Click "Test Connection" to initialize Firebase</li>
          <li><strong>If errors:</strong> Use "Debug DB" to check database structure</li>
          <li><strong>Finally:</strong> Click "Full Test" to enable sync and test data flow</li>
          <li><strong>Stuck?</strong> Use "Reset Sync" to clear sync state</li>
        </ol>
      </div>

      {/* Common Solutions */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Common Solutions:</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Make sure your Firebase project exists and is properly configured</li>
          <li>Check that Anonymous authentication is enabled in Firebase Console</li>
          <li>Verify your environment variables are set correctly</li>
          <li>Ensure Firestore database is created and rules allow read/write</li>
          <li>Use "Debug DB" to check if your local database structure matches expectations</li>
        </ul>
      </div>
    </div>
  );
}