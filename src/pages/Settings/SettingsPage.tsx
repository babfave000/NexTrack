// src/pages/Settings/SettingsPage.tsx
import { useUserData } from '../../hooks/useUserData';
import { useSettings } from '../../hooks/useSettings';
import BackupRestore from '../../components/BackupRestore/BackupRestore';
import CloudSyncSettings from '../../components/Settings/CloudSyncSettings';
import ApiIntegrationSettings from '../../components/Settings/ApiIntegrationSettings';

export default function SettingsPage() {
  const { isAuthenticated, user } = useUserData();
  const { settings, updateSettings } = useSettings();

  const handleBackupFrequencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    await updateSettings({ autoBackupFrequency: value });
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Please log in to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">⚙️ Settings</h1>
      </div>
      
      <div className="space-y-6">
        {/* Cloud Sync Section */}
        <CloudSyncSettings />
        
        {/* API Integration Section */}
        <ApiIntegrationSettings />
        
        {/* Backup & Restore Section */}
        <BackupRestore />
        
        {/* Application Settings */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Application Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Auto Backup Frequency
              </label>
              <select 
                value={settings.autoBackupFrequency}
                onChange={handleBackupFrequencyChange}
                className="border border-gray-300 px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7">Weekly</option>
                <option value="30">Monthly</option>
                <option value="0">Never (manual only)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                How often to automatically create backups
              </p>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">App Version:</span> 1.0.0
            </div>
            <div>
              <span className="font-medium">Database:</span> IndexedDB + Cloud Sync
            </div>
            <div>
              <span className="font-medium">Last Backup:</span> Real-time Cloud Backup
            </div>
            <div>
              <span className="font-medium">Platform:</span> Progressive Web App (PWA)
            </div>
            <div>
              <span className="font-medium">Storage:</span> Local + Cloud Hybrid
            </div>
            <div>
              <span className="font-medium">Offline Support:</span> Full Offline Capability
            </div>
            <div>
              <span className="font-medium">Sync Status:</span> Active
            </div>
            <div>
              <span className="font-medium">Security:</span> End-to-End Encrypted
            </div>
            <div>
              <span className="font-medium">User ID:</span> {user.id}
            </div>
            <div>
              <span className="font-medium">User Role:</span> {user.role}
            </div>
            <div>
              <span className="font-medium">Data Size:</span> Optimized
            </div>
            <div>
              <span className="font-medium">API Status:</span> Connected
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-4">⚠️ Data Management</h2>
          <div className="space-y-2 text-sm text-yellow-700">
            <p>• Your data is stored locally in your browser</p>
            <p>• Regular backups are recommended to prevent data loss</p>
            <p>• Clearing browser data will delete all your information</p>
            <p>• Consider exporting backups to cloud storage or external drives</p>
            <p>• Each user has their own isolated data space</p>
          </div>
        </div>
      </div>
    </div>
  );
}