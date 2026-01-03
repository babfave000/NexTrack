// src/utils/dataBackup.ts
import { db } from '../db/dexie';
import { downloadFile, readFile } from './fileUtils';

// Import proper types from Dexie
import type { 
  Product, 
  SalesOrder, 
  PurchaseOrder, 
  Supplier, 
  Category, 
  Brand, 
  UserProfile, 
  Setting, 
  InventoryHistory 
} from '../db/dexie';

export interface BackupData {
  version: string;
  exportedAt: string;
  data: {
    products: Product[];
    salesOrders: SalesOrder[];
    purchaseOrders: PurchaseOrder[];
    suppliers: Supplier[];
    categories: Category[];
    brands: Brand[];
    userProfile: UserProfile[];
    settings: Setting[];
    inventoryHistory: InventoryHistory[];
  };
}

export const exportData = async (format: 'json' | 'csv' = 'json'): Promise<void> => {
  try {
    // Get all data from database
    const [
      products,
      salesOrders,
      purchaseOrders,
      suppliers,
      categories,
      brands,
      userProfile,
      settings,
      inventoryHistory
    ] = await Promise.all([
      db.products.toArray(),
      db.salesOrders.toArray(),
      db.purchaseOrders.toArray(),
      db.suppliers.toArray(),
      db.categories.toArray(),
      db.brands.toArray(),
      db.userProfile.toArray(),
      db.settings.toArray(),
      db.inventoryHistory.toArray()
    ]);

    const backupData: BackupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        products,
        salesOrders,
        purchaseOrders,
        suppliers,
        categories,
        brands,
        userProfile,
        settings,
        inventoryHistory
      }
    };

    if (format === 'json') {
      const jsonStr = JSON.stringify(backupData, null, 2);
      downloadFile(jsonStr, `nexbackup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    } else {
      // CSV export for individual tables
      await exportTablesToCSV({
        products,
        salesOrders,
        purchaseOrders,
        suppliers,
        categories,
        brands,
        userProfile,
        settings,
        inventoryHistory
      });
    }

  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export data');
  }
};

export const importData = async (file: File): Promise<void> => {
  try {
    const content = await readFile(file);
    const backupData: BackupData = JSON.parse(content);

    // Validate backup file structure
    if (!backupData.version || !backupData.data) {
      throw new Error('Invalid backup file format');
    }

    // Show confirmation with data summary
    const summary = `
      Products: ${backupData.data.products?.length || 0}
      Sales Orders: ${backupData.data.salesOrders?.length || 0}
      Purchase Orders: ${backupData.data.purchaseOrders?.length || 0}
      Suppliers: ${backupData.data.suppliers?.length || 0}
      Exported: ${new Date(backupData.exportedAt).toLocaleDateString()}
    `;

    if (!window.confirm(`Import this backup?\n${summary}\n\nThis will replace all current data.`)) {
      return;
    }

    // Clear existing data and import
    await db.transaction('rw', [
      db.products,
      db.salesOrders,
      db.purchaseOrders,
      db.suppliers,
      db.categories,
      db.brands,
      db.userProfile,
      db.settings,
      db.inventoryHistory
    ], async () => {
      // Clear all tables
      await Promise.all([
        db.products.clear(),
        db.salesOrders.clear(),
        db.purchaseOrders.clear(),
        db.suppliers.clear(),
        db.categories.clear(),
        db.brands.clear(),
        db.userProfile.clear(),
        db.settings.clear(),
        db.inventoryHistory.clear()
      ]);

      // Import new data with proper typing
      await Promise.all([
        db.products.bulkAdd(backupData.data.products || []),
        db.salesOrders.bulkAdd(backupData.data.salesOrders || []),
        db.purchaseOrders.bulkAdd(backupData.data.purchaseOrders || []),
        db.suppliers.bulkAdd(backupData.data.suppliers || []),
        db.categories.bulkAdd(backupData.data.categories || []),
        db.brands.bulkAdd(backupData.data.brands || []),
        db.userProfile.bulkAdd(backupData.data.userProfile || []),
        db.settings.bulkAdd(backupData.data.settings || []),
        db.inventoryHistory.bulkAdd(backupData.data.inventoryHistory || [])
      ]);
    });

    alert('Data imported successfully!');
    window.location.reload(); // Refresh to show new data

  } catch (error) {
    console.error('Import failed:', error);
    throw new Error('Failed to import data. File may be corrupted.');
  }
};

// Interface for the data object used in CSV export
interface TableData {
  products: Product[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  categories: Category[];
  brands: Brand[];
  userProfile: UserProfile[];
  settings: Setting[];
  inventoryHistory: InventoryHistory[];
}

const exportTablesToCSV = async (data: TableData): Promise<void> => {
  // For now, CSV export is not implemented - using JSON as fallback
  console.log('CSV export requested with data:', {
    products: data.products.length,
    salesOrders: data.salesOrders.length,
    purchaseOrders: data.purchaseOrders.length
  });
  
  alert('CSV export would create multiple files. Using JSON format for single file export.');
  await exportData('json');
};