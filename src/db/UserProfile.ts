// src/db/userProfile.ts
import { db, type UserProfile } from './dexie';

export const getUserProfile = async (userId: string): Promise<UserProfile | undefined> => {
  try {
    await db.ensureOpen();
    return await db.userProfile.get(userId);
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (profile: UserProfile, userId: string): Promise<void> => {
  try {
    await db.ensureOpen();
    await db.userProfile.put(profile, userId);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const createUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await db.ensureOpen();
    await db.userProfile.add(profile);
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfileByUserId = async (userId: number): Promise<UserProfile | undefined> => {
  try {
    await db.ensureOpen();
    return await db.userProfile.where('userId').equals(userId).first();
  } catch (error) {
    console.error('Error getting user profile by user ID:', error);
    throw error;
  }
};