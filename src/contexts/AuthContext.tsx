// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { db } from '../db/dexie';
import type { User, Session, UserProfile } from '../db/dexie';
import { initializeDatabase } from '../utils/dataMigration';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// ✅ FIXED: Database connection helper with better error handling
const ensureDbOpen = async (): Promise<void> => {
  try {
    if (!db.isOpen()) {
      await db.open();
    }
  } catch (error) {
    console.error('Failed to open database:', error);
    throw error;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Initialize database on component mount
  useEffect(() => {
    const initDb = async () => {
      try {
        await initializeDatabase();
        setDbInitialized(true);
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDbInitialized(true); // Still set to true to prevent blocking
      }
    };

    initDb();
  }, []);

  // Check for existing session when database is initialized
  const checkSession = useCallback(async (): Promise<boolean> => {
    if (!dbInitialized) {
      console.log('Database not initialized yet, skipping session check');
      return false;
    }

    // Prevent multiple simultaneous session checks
    if (isLoading && sessionChecked) {
      return !!user;
    }

    try {
      setIsLoading(true);
      
      // ✅ FIXED: Use the connection helper
      await ensureDbOpen();

      const currentSession = await db.sessions
        .orderBy('expiresAt')
        .reverse()
        .first();

      if (!currentSession) {
        setSession(null);
        setUser(null);
        setSessionChecked(true);
        return false;
      }

      // Check if session is expired
      if (new Date(currentSession.expiresAt) < new Date()) {
        await db.sessions.delete(currentSession.id!);
        setSession(null);
        setUser(null);
        setSessionChecked(true);
        return false;
      }

      const userData = await db.users.get(currentSession.userId);
      if (!userData) {
        await db.sessions.delete(currentSession.id!);
        setSession(null);
        setUser(null);
        setSessionChecked(true);
        return false;
      }

      setSession(currentSession);
      setUser(userData);
      setSessionChecked(true);
      console.log('Session check: User authenticated', userData.email);
      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      
      // Try to recover from database errors
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        ((error as { name?: string }).name === 'DatabaseClosedError' ||
        (error as { name?: string }).name === 'UpgradeError')
      ) {
        try {
          await db.open();
          console.log('Database reopened after error');
        } catch (reopenError) {
          console.error('Failed to reopen database:', reopenError);
        }
      }
      
      setSession(null);
      setUser(null);
      setSessionChecked(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dbInitialized, isLoading, sessionChecked, user]);

  // Only check session once when database is initialized
  useEffect(() => {
    if (dbInitialized && !sessionChecked) {
      checkSession();
    }
  }, [dbInitialized, sessionChecked, checkSession]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      // ✅ FIXED: Use the connection helper
      await ensureDbOpen();

      // ✅ FIXED: Use toArray with filter instead of collection methods
      const allUsers = await db.users.toArray();
      const user = allUsers.find(u => u.email === email);

      if (!user) {
        console.log('User not found');
        return { success: false, message: 'No account found with this email address. Please check your email or create a new account.' };
      }

      // In a real app, you'd use proper password hashing
      if (user.password !== password) {
        console.log('Invalid password');
        return { success: false, message: 'Incorrect password. Please try again or reset your password.' };
      }

      // ✅ FIXED: Ensure DB is still open before creating session
      await ensureDbOpen();

      // Create session
      const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const session: Omit<Session, 'id'> = {
        userId: user.id!,
        token: sessionToken,
        expiresAt,
        createdAt: new Date()
      };

      const sessionId = await db.sessions.add(session as Session);

      setUser(user);
      setSession({ ...session, id: sessionId } as Session);
      setSessionChecked(true);
      console.log('Login successful for user:', user.email);
      return { success: true, message: 'Login successful! Redirecting to dashboard...' };
    } catch (error) {
      console.error('Login failed:', error);
      
      // Try to reopen database on failure
      if (typeof error === 'object' && error !== null && 'name' in error && (error as { name?: string }).name === 'DatabaseClosedError') {
        try {
          await db.open();
          console.log('Database reopened, please try login again');
        } catch (reopenError) {
          console.error('Failed to reopen database:', reopenError);
        }
      }
      
      return { success: false, message: 'An unexpected error occurred during login. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      // ✅ FIXED: Use the connection helper
      await ensureDbOpen();

      // ✅ FIXED: Use toArray with filter for better reliability
      const allUsers = await db.users.toArray();
      const existingUser = allUsers.find(u => u.email === userData.email);

      if (existingUser) {
        console.log('User already exists');
        return { success: false, message: 'An account with this email already exists. Please use a different email or try logging in.' };
      }

      const now = new Date();
      const user: Omit<User, 'id'> = {
        ...userData,
        createdAt: now,
        updatedAt: now
      };

      // ✅ FIXED: Ensure DB is still open before adding user
      await ensureDbOpen();
      const userId = await db.users.add(user as User);
      
      // Create default organization for user
      await ensureDbOpen();
      const organizationId = await db.organizations.add({
        name: `${userData.name}'s Business`,
        ownerId: userId,
        createdAt: now,
        updatedAt: now
      });

      // Add user to organization
      await ensureDbOpen();
      await db.userOrganizations.add({
        userId,
        organizationId,
        role: userData.role,
        joinedAt: now
      });

      // Create default user profile with all required fields
      await ensureDbOpen();
      const userProfile: UserProfile = {
        id: `profile-${userId}`,
        businessName: `${userData.name}'s Business`,
        email: userData.email,
        lowStockThreshold: 10,
        showLowStockWarnings: true,
        autoBackupFrequency: 24,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        userId
      };

      await db.userProfile.put(userProfile);

      console.log('User registered successfully with ID:', userId);
      
      // Auto-login after registration
      const loginSuccess = await login(userData.email, userData.password);
      return loginSuccess;
    } catch (error) {
      console.error('Registration failed:', error);
      
      // Try to reopen database on failure
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as { name?: string }).name === 'DatabaseClosedError'
      ) {
        try {
          await db.open();
          console.log('Database reopened after registration error');
        } catch (reopenError) {
          console.error('Failed to reopen database:', reopenError);
        }
      }
      
      return { success: false, message: 'Registration failed due to an unexpected error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      if (session?.id) {
        await ensureDbOpen();
        await db.sessions.delete(session.id);
      }
      setUser(null);
      setSession(null);
      setSessionChecked(false);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if DB operation fails
      setUser(null);
      setSession(null);
      setSessionChecked(false);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    login,
    register,
    logout,
    checkSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;