// src/components/Settings/CloudSyncSettings.tsx
import { useState, useEffect } from 'react';
import { useUserData } from '../../hooks/useUserData';
import { useAuth } from '../../hooks/useAuth';
import { firebaseSyncService } from '../../services/cloudSync/firebaseSyncService';

export default function CloudSyncSettings() {
  const { user } = useUserData();
  const { authMode } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(firebaseSyncService.getStatus());
  const [isFirebaseReady, setIsFirebaseReady] = useState(firebaseSyncService.isReady());
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Pass the FULL Dexie User object to sync entry points so the service can
  // extract firebaseUid when present. Falls back to local-id/local email or Dexie
  // numeric id when not (for localStorage config keys).
  const scopedUserId = (user ?? undefined) as unknown as string;

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      const config = await firebaseSyncService.loadConfig(scopedUserId);
      setIsEnabled(config.enabled);
      setAutoSync(config.autoSync);
      setSyncInterval(config.syncInterval);

      // Load last sync time from service
      const serviceStatus = firebaseSyncService.getStatus();
      setLastSyncTime(serviceStatus.lastSuccess);
    };

    loadSettings();

    // Update status periodically
    const interval = setInterval(() => {
      const currentStatus = firebaseSyncService.getStatus();
      setStatus(currentStatus);
      setIsFirebaseReady(firebaseSyncService.isReady());

      // Update last sync time if it changed
      if (currentStatus.lastSuccess?.getTime() !== lastSyncTime?.getTime()) {
        setLastSyncTime(currentStatus.lastSuccess);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user, scopedUserId, lastSyncTime]);

  // Helper function to safely extract error messages
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  };

  const isFirebaseBacked = authMode === 'firebase';

  const handleToggleSync = async () => {
    if (!user) {
      alert('❌ No user logged in');
      return;
    }
    if (!isFirebaseBacked) {
      alert(
        '⚠️ Firebase Sync requires a Firebase-created account (not a local Dexie fallback account). ' +
          'Please sign up using the email/password sign-up form to create a cloud identity, or ' +
          'link your existing local account by re-registering with the same email via Firebase.',
      );
      return;
    }

    console.log('🔍 Toggle sync - User ID:', {
      user,
      type: typeof user,
    });

    setIsLoading(true);
    try {
      if (isEnabled) {
        await firebaseSyncService.disableSync(scopedUserId);
        setIsEnabled(false);
      } else {
        // Test connection first before enabling
        setStatus({ ...status, isSyncing: true, lastError: null });
        const connectionTest = await firebaseSyncService.testConnection();

        if (!connectionTest) {
          throw new Error(
            status.lastError || 'Firebase connection test failed. Please check your configuration.',
          );
        }

        await firebaseSyncService.enableSync(scopedUserId);
        setIsEnabled(true);
      }
      const newStatus = firebaseSyncService.getStatus();
      setStatus(newStatus);
      setLastSyncTime(newStatus.lastSuccess);
    } catch (error: unknown) {
      console.error('Failed to toggle sync:', error);
      const errorMessage = getErrorMessage(error);
      setStatus({ ...status, lastError: errorMessage });
      alert(`Failed to ${isEnabled ? 'disable' : 'enable'} sync: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!user) {
      alert('❌ No user logged in');
      return;
    }
    if (!isFirebaseBacked) {
      alert(
        '⚠️ Manual Sync requires a Firebase account. ' +
          'Please register or sign in with Firebase to use cloud sync.',
      );
      return;
    }

    console.log('🔍 Manual sync - User ID:', {
      user,
      type: typeof user,
    });

    setIsLoading(true);
    setStatus({ ...status, isSyncing: true, lastError: null });

    try {
      await firebaseSyncService.sync(scopedUserId);
      const newStatus = firebaseSyncService.getStatus();
      setStatus(newStatus);
      setLastSyncTime(newStatus.lastSuccess);
    } catch (error: unknown) {
      console.error('Manual sync failed:', error);
      const errorMessage = getErrorMessage(error);
      setStatus({ ...status, isSyncing: false, lastError: errorMessage });
      alert(`Sync failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoSyncToggle = async () => {
    if (!user) return;

    const newAutoSync = !autoSync;
    setAutoSync(newAutoSync);

    try {
      await firebaseSyncService.updateConfig(scopedUserId, { autoSync: newAutoSync });
      const newStatus = firebaseSyncService.getStatus();
      setStatus(newStatus);
      setLastSyncTime(newStatus.lastSuccess);
    } catch (error: unknown) {
      console.error('Failed to update auto-sync:', error);
      // Revert on error
      setAutoSync(!newAutoSync);
    }
  };

  const handleIntervalChange = async (value: number) => {
    if (!user) return;

    setSyncInterval(value);

    try {
      await firebaseSyncService.updateConfig(scopedUserId, { syncInterval: value });
    } catch (error: unknown) {
      console.error('Failed to update sync interval:', error);
    }
  };

  const handleResetSync = async () => {
    if (!user) {
      alert('❌ No user logged in');
      return;
    }

    setIsLoading(true);
    try {
      await firebaseSyncService.resetSyncState(scopedUserId);
      const config = await firebaseSyncService.loadConfig(scopedUserId);
      setIsEnabled(config.enabled);
      setAutoSync(config.autoSync);
      const newStatus = firebaseSyncService.getStatus();
      setStatus(newStatus);
      setLastSyncTime(newStatus.lastSuccess);
      alert('✅ Sync state reset successfully!');
    } catch (error: unknown) {
      console.error('Failed to reset sync:', error);
      const errorMessage = getErrorMessage(error);
      alert(`❌ Failed to reset sync: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!user) {
      alert('❌ No user logged in');
      return;
    }
    if (!isFirebaseBacked) {
      alert(
        '⚠️ Connection test skipped: Your current session is using local/offline authentication. ' +
          'Please sign in with a Firebase email/password account to test cloud sync connectivity.',
      );
      return;
    }

    setIsLoading(true);
    setStatus({ ...status, isSyncing: true, lastError: null });

    try {
      const connectionTest = await firebaseSyncService.testConnection();
      if (connectionTest) {
        alert('✅ Firebase connection successful!');
        const newStatus = firebaseSyncService.getStatus();
        setStatus(newStatus);
        setLastSyncTime(newStatus.lastSuccess);
      } else {
        throw new Error(status.lastError || 'Connection test returned false');
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      setStatus({ ...status, isSyncing: false, lastError: errorMessage });
      alert(`❌ Connection test failed:\n${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (status.isSyncing) return 'text-yellow-600';
    if (status.lastError) return 'text-red-600';
    if (isFirebaseReady) return 'text-green-600';
    return 'text-gray-600';
  };

  const getStatusText = () => {
    if (status.isSyncing) return 'Syncing...';
    if (status.lastError) return 'Error';
    if (isFirebaseReady) return 'Ready';
    return 'Not Ready';
  };

  // Format the last sync time for display
  const formatLastSyncTime = () => {
    if (!lastSyncTime) return 'Never';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      return lastSyncTime.toLocaleString();
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">☁️ Cloud Sync (Firebase)</h2>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isFirebaseBacked
              ? 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200'
              : 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200'
          }`}
        >
          {isFirebaseBacked ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Auth: Firebase
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              Auth: Local / Dexie
            </>
          )}
        </span>
      </div>

      {!isFirebaseBacked && (
        <div className="mb-5 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
          <p className="font-semibold mb-1">
            ⚠️ Cloud sync requires a Firebase-authenticated account
          </p>
          <p className="text-sm leading-relaxed">
            Your current session is stored <strong>only locally on this device</strong>
            (Dexie fallback mode). To enable cross-device sync,{' '}
            <strong>log out</strong> and either{' '}
            <strong>sign up for a new account</strong> via the Firebase sign-up form,
            or re-register your existing email address to create the matching cloud
            identity. Local Dexie data is preserved.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Firebase Status */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-2">Firebase Status</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Firebase Ready:</span>
              <span className={`font-medium ${isFirebaseReady ? 'text-green-600' : 'text-red-600'}`}>
                {isFirebaseReady ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Auth Mode:</span>
              <span
                className={`font-medium ${
                  isFirebaseBacked ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {isFirebaseBacked ? 'Firebase Cloud' : 'Local Dexie'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sync Status:</span>
              <span className={`font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Sync:</span>
              <span className={lastSyncTime ? 'text-green-600 font-medium' : 'text-gray-500'}>
                {formatLastSyncTime()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Pending Changes:</span>
              <span>{status.pendingChanges}</span>
            </div>
            {status.lastError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <div className="text-red-700 text-xs">
                  <strong>Last Error:</strong> {status.lastError}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sync Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-700">Enable Cloud Sync</h3>
            <p className="text-sm text-gray-500">Sync your data across devices with Firebase</p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggleSync}
              disabled={isLoading || !isFirebaseBacked}
              className="sr-only"
              aria-label={isEnabled ? 'Disable Cloud Sync' : 'Enable Cloud Sync'}
            />
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isEnabled ? 'bg-blue-600' : 'bg-gray-200'
              } ${
                isLoading || !isFirebaseBacked
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
              title={
                !isFirebaseBacked
                  ? 'Sign in with a Firebase account to enable sync'
                  : isEnabled
                    ? 'Disable Cloud Sync'
                    : 'Enable Cloud Sync'
              }
            >
              <div
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                  isEnabled ? 'transform translate-x-5' : ''
                }`}
              />
            </div>
          </label>
        </div>

        {/* Auto Sync */}
        {isEnabled && isFirebaseBacked && (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-700">Auto Sync</h3>
              <p className="text-sm text-gray-500">Automatically sync changes</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={handleAutoSyncToggle}
                disabled={isLoading}
                className="sr-only"
                aria-label={autoSync ? 'Disable Auto Sync' : 'Enable Auto Sync'}
              />
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoSync ? 'bg-blue-600' : 'bg-gray-200'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={autoSync ? 'Disable Auto Sync' : 'Enable Auto Sync'}
              >
                <div
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    autoSync ? 'transform translate-x-5' : ''
                  }`}
                />
              </div>
            </label>
          </div>
        )}

        {/* Sync Interval */}
        {isEnabled && autoSync && isFirebaseBacked && (
          <div className="space-y-2">
            <label
              htmlFor="sync-interval-input"
              className="block text-sm font-medium text-gray-700"
            >
              Sync Interval (minutes)
            </label>
            <div className="flex items-center space-x-3">
              <input
                id="sync-interval-input"
                type="number"
                min="1"
                max="60"
                value={syncInterval}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                disabled={isLoading}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                aria-describedby="sync-interval-description"
                placeholder="Enter minutes between 1-60"
                title="Set sync interval in minutes. Minimum 1 minute, maximum 60 minutes."
                aria-required="true"
              />
              <span className="text-sm text-gray-500">minutes</span>
            </div>
            <p id="sync-interval-description" className="text-sm text-gray-500">
              How often to automatically sync your data (1-60 minutes)
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          {isEnabled && isFirebaseBacked && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isLoading || status.isSyncing || !isFirebaseReady}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              title="Manually sync your data now"
            >
              {status.isSyncing ? '🔄 Syncing...' : 'Sync Now'}
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isLoading}
              className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-sm"
              title="Test Firebase connection"
            >
              Test Connection
            </button>

            <button
              type="button"
              onClick={handleResetSync}
              disabled={isLoading}
              className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors font-medium text-sm"
              title="Reset sync state and configuration"
            >
              Reset Sync
            </button>
          </div>
        </div>

        {/* Information Sections */}
        {!isEnabled && isFirebaseBacked && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Firebase Integration:</strong> Enable cloud sync to backup your data securely and access it across multiple devices. Your data will be stored in Firebase Firestore.
            </p>
          </div>
        )}

        {!isFirebaseReady && isFirebaseBacked && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">Firebase Not Ready</h4>
            <p className="text-sm text-yellow-700">
              Firebase needs to be initialized before you can use cloud sync. Click "Test Connection" to initialize Firebase.
            </p>
          </div>
        )}

        {/* Troubleshooting Tips */}
        {status.lastError && (
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h4 className="font-medium text-orange-800 mb-2">Troubleshooting Tips</h4>
            <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
              <li>Check that Anonymous authentication is enabled in Firebase Console</li>
              <li>Verify your Firebase configuration in environment variables</li>
              <li>Ensure Firestore database is created and rules allow read/write</li>
              <li>Try "Reset Sync" to clear any corrupted state</li>
              <li>Check browser console (F12) for detailed error messages</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}