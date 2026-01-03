// src/components/BackupRestore/BackupRestore.tsx
import { useState } from 'react';
import { exportData, importData } from '../../utils/dataBackup';

export default function BackupRestore() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async (format: 'json' | 'csv' = 'json') => {
    setIsProcessing(true);
    try {
      await exportData(format);
      alert('Data exported successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert('Export failed: ' + errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON backup file');
      return;
    }

    setIsProcessing(true);
    try {
      await importData(file);
      alert('Data imported successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert('Import failed: ' + errorMessage);
    } finally {
      setIsProcessing(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Data Backup & Restore</h2>

      <div className="space-y-4">
        {/* Export Section */}
        <div className="border-b pb-4">
          <h3 className="font-semibold mb-2">Export Data</h3>
          <p className="text-sm text-gray-600 mb-3">
            Download a backup of all your data. Recommended before making major changes.
          </p>
          <button
            onClick={() => handleExport('json')}
            disabled={isProcessing}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isProcessing ? 'Exporting...' : 'Export to JSON'}
          </button>
        </div>

        {/* Import Section */}
        <div>
          <h3 className="font-semibold mb-2">Import Data</h3>
          <p className="text-sm text-gray-600 mb-3">
            Restore from a previous backup. This will replace all current data.
          </p>
          <label className="block mb-2">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isProcessing}
              className="hidden"
              id="backup-file"
            />
            <div className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50 text-center">
              {isProcessing ? 'Importing...' : 'Choose Backup File'}
            </div>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Only .json files exported from NexTrack are supported
          </p>
        </div>

        {/* Backup Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <h4 className="font-medium text-yellow-800 mb-1">⚠️ Important Notes</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Backup regularly to prevent data loss</li>
            <li>• Importing will replace ALL current data</li>
            <li>• Backups are stored locally on your device</li>
            <li>• Consider cloud storage for additional safety</li>
          </ul>
        </div>
      </div>
    </div>
  );
}