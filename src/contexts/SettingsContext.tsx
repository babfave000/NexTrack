// src/contexts/SettingsContext.tsx
import React, { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useUserData } from '../hooks/useUserData';
import { db } from '../db/dexie';
import type { UserProfile } from '../db/dexie';

interface Settings {
  lowStockThreshold: number;
  showLowStockWarnings: boolean;
  autoBackupFrequency: number;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  isLoading: boolean;
  businessInfo: Pick<UserProfile, 'businessName' | 'logoUrl' | 'email' | 'phone' | 'address' | 'website' | 'socialLinks'> | null;
  refreshBusinessInfo: () => Promise<void>;
}

type BusinessInfo = Pick<UserProfile, 'businessName' | 'logoUrl' | 'email' | 'phone' | 'address' | 'website' | 'socialLinks'> | null;

// Default settings - these are only used as fallback if no user profile exists
const defaultSettings: Settings = {
  lowStockThreshold: 0,
  showLowStockWarnings: true,
  autoBackupFrequency: 7
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const extractBusinessInfo = (p: UserProfile | undefined): BusinessInfo => {
  if (!p) return null;
  return {
    businessName: p.businessName || '',
    logoUrl: p.logoUrl || '',
    email: p.email || '',
    phone: p.phone || '',
    address: p.address || '',
    website: p.website || '',
    socialLinks: p.socialLinks || '',
  };
};

// Helper functions for UserProfile operations
const getUserProfile = async (userId: number): Promise<UserProfile | undefined> => {
  try {
    await db.ensureOpen();
    const profileId = `profile-${userId}`;
    return await db.userProfile.get(profileId);
  } catch (error) {
    console.error('Error getting user profile:', error);
    return undefined;
  }
};

const updateUserProfile = async (profile: UserProfile, userId: number): Promise<void> => {
  try {
    await db.ensureOpen();
    const profileId = `profile-${userId}`;
    await db.userProfile.put({
      ...profile,
      id: profileId
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useUserData();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadedUserIdRef = useRef<number | undefined>(undefined);

  const loadSettings = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      await db.ensureOpen();
      const userProfile = await getUserProfile(user.id!);

      if (userProfile) {
        const loadedSettings: Settings = {
          lowStockThreshold: userProfile.lowStockThreshold ?? defaultSettings.lowStockThreshold,
          showLowStockWarnings: userProfile.showLowStockWarnings ?? defaultSettings.showLowStockWarnings,
          autoBackupFrequency: userProfile.autoBackupFrequency ?? defaultSettings.autoBackupFrequency
        };
        setSettings(loadedSettings);
        setBusinessInfo(extractBusinessInfo(userProfile));
        console.log('Settings loaded from user profile:', loadedSettings);
      } else {
        console.log('No user profile found, using default settings:', defaultSettings);
        setSettings(defaultSettings);
        setBusinessInfo(null);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load: run whenever the authenticated user changes.
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSettings(defaultSettings);
      setBusinessInfo(null);
      setIsLoading(false);
      loadedUserIdRef.current = undefined;
      return;
    }
    if (loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;
    void loadSettings();
  }, [isAuthenticated, user, loadSettings]);

  // React to profile edits on the local device and to incoming cross-device syncs.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reload = () => { void loadSettings(); };
    window.addEventListener('nextrack:profile-saved', reload);
    window.addEventListener('nextrack:profile-synced', reload);
    return () => {
      window.removeEventListener('nextrack:profile-saved', reload);
      window.removeEventListener('nextrack:profile-synced', reload);
    };
  }, [loadSettings]);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!user) return;

    let updatedSettings: Settings = defaultSettings;
    setSettings(prev => {
      updatedSettings = { ...prev, ...newSettings };
      return updatedSettings;
    });
    
    try {
      // Get current profile or create a new one if it doesn't exist
      await db.ensureOpen();
            let currentProfile = await getUserProfile(user.id!);
      
      if (!currentProfile) {
        // Create a new user profile with the updated settings
        const now = new Date().toISOString();
        currentProfile = {
          id: `profile-${user.id}`,
          businessName: `${user.name}'s Business`,
          email: user.email,
          lowStockThreshold: updatedSettings.lowStockThreshold,
          showLowStockWarnings: updatedSettings.showLowStockWarnings,
          autoBackupFrequency: updatedSettings.autoBackupFrequency,
          createdAt: now,
          updatedAt: now,
          userId: user.id!
        };
      } else {
        // Update existing profile — patch only the preference fields so we
        // never clobber unrelated profile data (logo, address, etc.) that
        // the caller didn't intend to touch.
        currentProfile = {
          ...currentProfile,
          lowStockThreshold: updatedSettings.lowStockThreshold,
          showLowStockWarnings: updatedSettings.showLowStockWarnings,
          autoBackupFrequency: updatedSettings.autoBackupFrequency,
          updatedAt: new Date().toISOString()
        };
      }

      await db.ensureOpen();
      await updateUserProfile(currentProfile, user.id!);
      // Also refresh businessInfo cache so any derived displays stay in sync
      setBusinessInfo(extractBusinessInfo(currentProfile));
      console.log('Settings saved to user profile:', updatedSettings);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      // Revert on error (functional revert so we don't double-apply newSettings)
      setSettings(prev => {
        const reverted: Settings = { ...prev };
        (Object.keys(newSettings) as Array<keyof Settings>).forEach(() => {
          // We don't have the previous raw value handy; best-effort: just keep
          // the existing previous state.
        });
        return reverted;
      });
      throw error;
    }
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    isLoading,
    businessInfo,
    refreshBusinessInfo: loadSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Export the context for use in the hook file
export { SettingsContext };