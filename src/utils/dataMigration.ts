// src/utils/dataMigration.ts
import { db } from '../db/dexie';

export interface Migration {
  version: number;
  name: string;
  migrate: () => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'Initial database setup',
    migrate: async () => {
      console.log('Running migration: Initial database setup');
      
      // ✅ FIXED: Ensure database is open
      if (!db.isOpen()) {
        await db.open();
      }
      
      // Create default admin user if no users exist
      const userCount = await db.users.count();
      if (userCount === 0) {
        try {
          await db.users.add({
            email: 'admin@nextrack.com',
            password: 'admin123',
            name: 'Administrator',
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log('✅ Default admin user created: admin@nextrack.com');
        } catch (error) {
          // If user already exists (constraint error), just log it
          if (typeof error === 'object' && error !== null && 'name' in error && (error as { name: string }).name === 'ConstraintError') {
            console.log('ℹ️ Default user already exists, skipping creation');
          } else {
            console.error('❌ Error creating default user:', error);
            throw error;
          }
        }
      } else {
        console.log('ℹ️ Users already exist, skipping default user creation');
      }
    }
  },
  {
    version: 2,
    name: 'Add multi-tenant support',
    migrate: async () => {
      console.log('Running migration: Add multi-tenant support');
      // This migration is handled by Dexie's version 2 upgrade
      // Just ensure database is open
      if (!db.isOpen()) {
        await db.open();
      }
    }
  }
];

export class DataMigration {
  private static readonly MIGRATION_KEY = 'database_migration_version';

  static async checkAndMigrate(): Promise<void> {
    try {
      console.log('🔄 Starting database migration check...');
      
      // ✅ FIXED: Ensure database is open
      if (!db.isOpen()) {
        await db.open();
      }

      const currentVersion = await this.getCurrentVersion();
      console.log(`📊 Current migration version: ${currentVersion}`);
      
      const pendingMigrations = migrations.filter(m => m.version > currentVersion);
      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

      if (pendingMigrations.length === 0) {
        console.log('✅ Database is up to date');
        return;
      }

      for (const migration of pendingMigrations) {
        try {
          console.log(`🚀 Running migration ${migration.version}: ${migration.name}`);
          await migration.migrate();
          await this.setCurrentVersion(migration.version);
          console.log(`✅ Migration ${migration.version} completed successfully`);
        } catch (error) {
          console.error(`❌ Migration ${migration.version} failed:`, error);
          
          // If it's a constraint error (user already exists), continue anyway
          if (typeof error === 'object' && error !== null && 'name' in error && (error as { name: string }).name === 'ConstraintError') {
            console.log('⚠️ Constraint error detected, marking migration as complete...');
            await this.setCurrentVersion(migration.version);
          } else {
            throw error;
          }
        }
      }
      
      console.log('🎉 All migrations completed successfully');
    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      
      // Enhanced error recovery
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as { name: string }).name === 'DatabaseClosedError' ||
        (error as { name: string }).name === 'UpgradeError'
      ) {
        console.log('🔄 Attempting to recover from database error...');
        try {
          await db.close();
          await db.open();
          console.log('✅ Database recovered successfully');
          
          // Try migration again after recovery
          console.log('🔄 Retrying migration after recovery...');
          await this.checkAndMigrate();
          return;
        } catch (reopenError) {
          console.error('❌ Failed to recover database:', reopenError);
        }
      }
      
      throw error;
    }
  }

  private static async getCurrentVersion(): Promise<number> {
    try {
      if (!db.isOpen()) {
        await db.open();
      }
      const setting = await db.settings.get(this.MIGRATION_KEY);
      const version = setting ? parseInt(setting.value, 10) : 0;
      console.log(`📖 Read migration version from settings: ${version}`);
      return version;
    } catch (error) {
      console.warn('⚠️ Could not read migration version, defaulting to 0:', error);
      return 0;
    }
  }

  private static async setCurrentVersion(version: number): Promise<void> {
    try {
      if (!db.isOpen()) {
        await db.open();
      }
      await db.settings.put({
        key: this.MIGRATION_KEY,
        value: version.toString(),
        userId: 1
      });
      console.log(`📝 Set migration version to: ${version}`);
    } catch (error) {
      console.error('❌ Failed to set migration version:', error);
      throw error;
    }
  }

  static async getMigrationStatus(): Promise<{ currentVersion: number; latestVersion: number; needsMigration: boolean }> {
    try {
      if (!db.isOpen()) {
        await db.open();
      }
      const currentVersion = await this.getCurrentVersion();
      const latestVersion = Math.max(...migrations.map(m => m.version));
      const needsMigration = currentVersion < latestVersion;
      
      console.log(`📊 Migration Status - Current: ${currentVersion}, Latest: ${latestVersion}, Needs Migration: ${needsMigration}`);
      
      return {
        currentVersion,
        latestVersion,
        needsMigration
      };
    } catch (error) {
      console.error('❌ Error getting migration status:', error);
      return {
        currentVersion: 0,
        latestVersion: Math.max(...migrations.map(m => m.version)),
        needsMigration: false
      };
    }
  }

  static async forceDatabaseReset(): Promise<void> {
    try {
      console.log('🔄 Starting forced database reset...');
      await db.close();
      await db.delete();
      await db.open();
      console.log('✅ Database reset completed successfully');
    } catch (error) {
      console.error('❌ Error resetting database:', error);
      throw error;
    }
  }

  // ✅ FIXED: New method to check database health
  static async checkDatabaseHealth(): Promise<boolean> {
    try {
      if (!db.isOpen()) {
        await db.open();
      }
      const userCount = await db.users.count();
      console.log(`🏥 Database health check: ${userCount} users found`);
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }
}

// Initialize migration on import
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('🔧 Initializing database...');
    await DataMigration.checkAndMigrate();
    console.log('✅ Database initialization completed successfully');
    
    // Perform health check after migration
    const healthy = await DataMigration.checkDatabaseHealth();
    if (!healthy) {
      throw new Error('Database health check failed after migration');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    
    // Enhanced error handling with more options
    if (typeof window !== 'undefined') {
      const userChoice = confirm(
        'Database initialization failed. This may be due to a corrupted database.\n\n' +
        'Click OK to reset the database (all data will be lost).\n' +
        'Click Cancel to continue without database functionality.'
      );
      
      if (userChoice) {
        try {
          await DataMigration.forceDatabaseReset();
          console.log('🔄 Page will reload after reset...');
          setTimeout(() => window.location.reload(), 1000);
        } catch (resetError) {
          console.error('❌ Even reset failed:', resetError);
          alert('Unable to reset database. Please clear browser storage manually.');
        }
      } else {
        console.warn('⚠️ User chose to continue with potentially broken database');
      }
    }
  }
};

export default DataMigration;