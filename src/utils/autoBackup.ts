import { exportData } from "./dataBackup";

// src/utils/autoBackup.ts
export const createAutoBackup = async () => {
  const lastBackup = localStorage.getItem('lastAutoBackup');
  const now = Date.now();
  
  // Backup every 7 days
  if (!lastBackup || (now - parseInt(lastBackup)) > 7 * 24 * 60 * 60 * 1000) {
    try {
      await exportData('json');
      localStorage.setItem('lastAutoBackup', now.toString());
    } catch (error) {
      console.warn('Auto backup failed:', error);
    }
  }
};

// Call this in your main App component or index.tsx