// src/contexts/SettingsContext.tsx
import React, { createContext, useState, useEffect, type ReactNode } from 'react';
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
}

// Default settings - these are only used as fallback if no user profile exists
const defaultSettings: Settings = {
  lowStockThreshold: 5,
  showLowStockWarnings: true,
  autoBackupFrequency: 7
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper functions for UserProfile operations
const getUserProfile = async (userId: number): Promise<UserProfile | undefined> => {
  try {
    const profileId = `profile-${userId}`;
    return await db.userProfile.get(profileId);
  } catch (error) {
    console.error('Error getting user profile:', error);
    return undefined;
  }
};

const updateUserProfile = async (profile: UserProfile, userId: number): Promise<void> => {
  try {
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setIsLoading(false);
        setHasLoaded(true);
        return;
      }
      
      try {
        setIsLoading(true);
        const userProfile = await getUserProfile(user.id!);
        
        if (userProfile) {
          // Use the saved settings from user profile
          const loadedSettings = {
            lowStockThreshold: userProfile.lowStockThreshold || defaultSettings.lowStockThreshold,
            showLowStockWarnings: userProfile.showLowStockWarnings ?? defaultSettings.showLowStockWarnings,
            autoBackupFrequency: userProfile.autoBackupFrequency || defaultSettings.autoBackupFrequency
          };
          setSettings(loadedSettings);
          console.log('Settings loaded from user profile:', loadedSettings);
        } else {
          // No user profile exists yet, use default settings
          console.log('No user profile found, using default settings:', defaultSettings);
          setSettings(defaultSettings);
        }
        
        setHasLoaded(true);
      } catch (error) {
        console.error('Error loading settings:', error);
        // On error, use default settings
        setSettings(defaultSettings);
        setHasLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && user && !hasLoaded) {
      loadSettings();
    } else if (!isAuthenticated && !hasLoaded) {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [user, isAuthenticated, hasLoaded]);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!user) return;

    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      // Get current profile or create a new one if it doesn't exist
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
        // Update existing profile
        currentProfile = {
          ...currentProfile,
          lowStockThreshold: updatedSettings.lowStockThreshold,
          showLowStockWarnings: updatedSettings.showLowStockWarnings,
          autoBackupFrequency: updatedSettings.autoBackupFrequency,
          updatedAt: new Date().toISOString()
        };
      }

      await updateUserProfile(currentProfile, user.id!);
      console.log('Settings saved to user profile:', updatedSettings);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      // Revert on error
      setSettings(settings);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Export the context for use in the hook file
export { SettingsContext };