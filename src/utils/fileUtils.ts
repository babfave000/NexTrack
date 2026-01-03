// src/utils/fileUtils.ts

// Define interfaces for better type safety
interface DatabaseTable {
  toArray(): Promise<unknown[]>;
  clear(): Promise<void>;
  bulkAdd(items: unknown[]): Promise<void>;
}

interface Database {
  [key: string]: DatabaseTable;
}

interface BackupData {
  [tableName: string]: unknown[];
}

/**
 * Downloads a file with the given content, filename, and MIME type
 */
export const downloadFile = (content: string, filename: string, mimeType: string = 'application/octet-stream'): void => {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
};

/**
 * Reads a file and returns its content as a string
 */
export const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * Exports data to CSV format and downloads it
 */
export const exportToCSV = <T extends Record<string, unknown>>(data: T[], filename: string): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  try {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle null/undefined values
          if (value === null || value === undefined) {
            return '';
          }
          // Convert dates to ISO string
          if (value instanceof Date) {
            return value.toISOString();
          }
          // Handle values that might contain commas or quotes
          const stringValue = String(value);
          if (typeof value === 'string' && (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n'))) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    downloadFile(csvContent, `${filename}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export data to CSV');
  }
};

/**
 * Exports data to JSON format and downloads it
 */
export const exportToJSON = (data: unknown, filename: string): void => {
  if (!data) {
    console.warn('No data to export');
    return;
  }

  try {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `${filename}_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  } catch (error) {
    console.error('Error exporting to JSON:', error);
    throw new Error('Failed to export data to JSON');
  }
};

/**
 * Imports data from CSV file
 */
export const importFromCSV = async (file: File): Promise<Record<string, unknown>[]> => {
  try {
    const content = await readFile(file);
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header and one data row');
    }

    const headers = lines[0].split(',').map(header => header.trim());
    
    return lines.slice(1).map((line) => {
      const values = line.split(',').map(value => value.trim());
      const obj: Record<string, unknown> = {};
      
      headers.forEach((header, headerIndex) => {
        let value = values[headerIndex] || '';
        
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/""/g, '"');
        }
        
        // Try to parse numbers and dates
        if (!isNaN(Number(value)) && value !== '') {
          obj[header] = Number(value);
        } else if (!isNaN(Date.parse(value))) {
          obj[header] = new Date(value);
        } else {
          obj[header] = value;
        }
      });
      
      return obj;
    }).filter(row => Object.values(row).some(value => value !== ''));
  } catch (error) {
    console.error('Error importing from CSV:', error);
    throw new Error('Failed to import data from CSV');
  }
};

/**
 * Imports data from JSON file
 */
export const importFromJSON = async (file: File): Promise<unknown> => {
  try {
    const content = await readFile(file);
    return JSON.parse(content);
  } catch (error) {
    console.error('Error importing from JSON:', error);
    throw new Error('Failed to import data from JSON');
  }
};

/**
 * Validates if a file has a valid extension
 */
export const validateFileExtension = (file: File, allowedExtensions: string[]): boolean => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
};

/**
 * Validates if a file size is within limits
 */
export const validateFileSize = (file: File, maxSizeInMB: number = 10): boolean => {
  const maxSize = maxSizeInMB * 1024 * 1024; // Convert MB to bytes
  return file.size <= maxSize;
};

/**
 * Generates a backup of all database tables
 */
export const generateCompleteBackup = async (db: Database): Promise<BackupData> => {
  try {
    const tables = [
      'users', 'products', 'salesOrders', 'purchaseOrders', 'suppliers', 
      'categories', 'brands', 'inventoryHistory', 'userProfile', 'settings', 
      'sessions', 'organizations', 'userOrganizations'
    ];
    
    const backup: BackupData = {};
    
    for (const table of tables) {
      if (db[table]) {
        try {
          backup[table] = await db[table].toArray();
        } catch (error) {
          console.warn(`Could not backup table ${table}:`, error);
          backup[table] = [];
        }
      }
    }
    
    return backup;
  } catch (error) {
    console.error('Error generating complete backup:', error);
    throw new Error('Failed to generate complete backup');
  }
};

/**
 * Restores data from a backup object
 */
export const restoreFromBackup = async (db: Database, backup: BackupData): Promise<void> => {
  try {
    // Clear existing data first
    const tables = Object.keys(backup);
    
    for (const table of tables) {
      if (db[table]) {
        try {
          await db[table].clear();
          if (backup[table].length > 0) {
            await db[table].bulkAdd(backup[table]);
          }
        } catch (error) {
          console.error(`Error restoring table ${table}:`, error);
          throw new Error(`Failed to restore table ${table}`);
        }
      }
    }
  } catch (error) {
    console.error('Error restoring from backup:', error);
    throw new Error('Failed to restore from backup');
  }
};

/**
 * Calculates the size of data in bytes
 */
export const calculateDataSize = (data: unknown): number => {
  const jsonString = JSON.stringify(data);
  return new Blob([jsonString]).size;
};

/**
 * Formats file size to human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Creates a data URL from file for preview
 */
export const createDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to create data URL'));
    reader.readAsDataURL(file);
  });
};

/**
 * Compresses data using gzip (basic implementation)
 */
export const compressData = async (data: unknown): Promise<Blob> => {
  try {
    const jsonString = JSON.stringify(data);
    const stream = new Blob([jsonString]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    return await new Response(compressedStream).blob();
  } catch (error) {
    console.error('Error compressing data:', error);
    throw new Error('Failed to compress data');
  }
};

/**
 * Decompresses gzip data
 */
export const decompressData = async (blob: Blob): Promise<unknown> => {
  try {
    const stream = blob.stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const response = await new Response(decompressedStream);
    const text = await response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Error decompressing data:', error);
    throw new Error('Failed to decompress data');
  }
};

export default {
  downloadFile,
  readFile,
  exportToCSV,
  exportToJSON,
  importFromCSV,
  importFromJSON,
  validateFileExtension,
  validateFileSize,
  generateCompleteBackup,
  restoreFromBackup,
  calculateDataSize,
  formatFileSize,
  createDataURL,
  compressData,
  decompressData
};