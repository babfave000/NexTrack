// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { db } from '../db/dexie';
import type { User, Session, UserProfile } from '../db/dexie';
import { initializeDatabase } from '../utils/dataMigration';
import { firebaseService } from '../services/firebaseService';
import { firebaseSyncService } from '../services/cloudSync/firebaseSyncService';
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  authMode: 'firebase' | 'dexie' | 'unknown';
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'firebaseUid'>) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

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

const createDexieSession = async (userId: number): Promise<Session> => {
  await ensureDbOpen();
  const sessionToken =
    Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const sessionDraft: Omit<Session, 'id'> = {
    userId,
    token: sessionToken,
    expiresAt,
    createdAt: new Date(),
  };

  const sessionId = await db.sessions.add(sessionDraft as Session);
  return { ...sessionDraft, id: sessionId } as Session;
};

const provisionDexieUser = async (
  firebaseUser: FirebaseUser,
  meta?: { name?: string; role?: User['role']; password?: string },
): Promise<{ user: User; isNew: boolean }> => {
  await ensureDbOpen();
  const email = firebaseUser.email ?? meta?.name ?? firebaseUser.uid;
  const existing = (await db.users.toArray()).find(
    (u) =>
      (firebaseUser.email && u.email === email) ||
      (firebaseUser.isAnonymous === false && u.firebaseUid === firebaseUser.uid),
  );

  if (existing) {
    const patch: Partial<User> = { updatedAt: new Date() };
    if (!existing.firebaseUid && !firebaseUser.isAnonymous) {
      patch.firebaseUid = firebaseUser.uid;
    }
    if (Object.keys(patch).length > 0 && existing.id) {
      await db.users.update(existing.id, patch);
      Object.assign(existing, patch);
    }
    return { user: existing, isNew: false };
  }

  const now = new Date();
  const name = meta?.name || firebaseUser.displayName || email.split('@')[0] || 'User';
  const role = meta?.role || 'user';
  const password = meta?.password || `__fb_${firebaseUser.uid}`;

  const userDraft: Omit<User, 'id'> = {
    email,
    password,
    name,
    role,
    firebaseUid: firebaseUser.isAnonymous ? undefined : firebaseUser.uid,
    createdAt: now,
    updatedAt: now,
  };

  const userId = await db.users.add(userDraft as User);
  const user: User = { ...userDraft, id: userId } as User;

  const organizationId = await db.organizations.add({
    name: `${user.name}'s Business`,
    ownerId: userId,
    createdAt: now,
    updatedAt: now,
  });

  await db.userOrganizations.add({
    userId,
    organizationId,
    role: user.role,
    joinedAt: now,
  });

  const userProfile: UserProfile = {
    id: `profile-${userId}`,
    businessName: `${user.name}'s Business`,
    email: user.email,
    lowStockThreshold: 0,
    showLowStockWarnings: true,
    autoBackupFrequency: 24,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    userId,
  };
  await db.userProfile.put(userProfile);

  return { user, isNew: true };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [authMode, setAuthMode] = useState<'firebase' | 'dexie' | 'unknown'>('unknown');

  // Mutex + soft-debounce guard to prevent `onUserChanged` from running
  // `provisionDexieUser` at the same time as the in-flight `login()` / `register()`
  // mutation (Dexie blows up if two write paths collide mid-transaction).
  const authMutationInFlight = React.useRef(false);

  const checkSession = useCallback(async (): Promise<boolean> => {
    if (!dbInitialized) return false;

    try {
      setIsLoading(true);
      await ensureDbOpen();

      let resolvedFirebaseUser: FirebaseUser | null = null;
      try {
        await firebaseService.initialize();
        resolvedFirebaseUser = firebaseService.currentUser;
      } catch (err) {
        console.warn('Firebase not available, falling back to Dexie sessions:', err);
      }

      if (resolvedFirebaseUser && !resolvedFirebaseUser.isAnonymous) {
        const { user: dexieUser } = await provisionDexieUser(resolvedFirebaseUser);
        const newSession = await createDexieSession(dexieUser.id!);
        setUser(dexieUser);
        setSession(newSession);
        setAuthMode('firebase');
        console.log('Session check (Firebase): signed in as', dexieUser.email);
        return true;
      }

      const currentSession = await db.sessions
        .orderBy('expiresAt')
        .reverse()
        .first();

      if (!currentSession) {
        setSession(null);
        setUser(null);
        setAuthMode(resolvedFirebaseUser ? 'firebase' : 'dexie');
        return false;
      }

      if (new Date(currentSession.expiresAt) < new Date()) {
        await db.sessions.delete(currentSession.id!);
        setSession(null);
        setUser(null);
        setAuthMode('dexie');
        return false;
      }

      const userData = await db.users.get(currentSession.userId);
      if (!userData) {
        await db.sessions.delete(currentSession.id!);
        setSession(null);
        setUser(null);
        setAuthMode('dexie');
        return false;
      }

      setSession(currentSession);
      setUser(userData);
      setAuthMode(userData.firebaseUid ? 'firebase' : 'dexie');
      console.log('Session check (Dexie): authenticated as', userData.email);
      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      setSession(null);
      setUser(null);
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        ((error as { name?: string }).name === 'DatabaseClosedError' ||
          (error as { name?: string }).name === 'UpgradeError')
      ) {
        try {
          await db.open();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          /* noop */
        }
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dbInitialized]);

  useEffect(() => {
    const initDb = async () => {
      try {
        await initializeDatabase();
        setDbInitialized(true);
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDbInitialized(true);
      }
    };
    initDb();
  }, []);

  useEffect(() => {
    if (!dbInitialized) return;

    let unsubscribe: (() => void) | undefined;
    let mounted = true;
    let fbSubscriptionEstablished = false;

    (async () => {
      try {
        // Give Firebase SDK a short window to sync cached auth state. If
        // offline or not configured, fall through quickly to Dexie session
        // check instead of hanging the global loading spinner.
        const initTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firebase init timed out')), 3000),
        );
        await Promise.race([firebaseService.initialize(), initTimeout]);

        unsubscribe = firebaseService.onUserChanged(async (fbUser) => {
          if (!mounted) return;

          // If a manual login/register() is currently writing to Dexie on
          // this same tick, bail out — that code path already provisions the
          // user and session. We'd otherwise race on the same tables and
          // crash Dexie's internal cache-middleware.
          if (authMutationInFlight.current) return;

          if (fbUser && !fbUser.isAnonymous) {
            try {
              await ensureDbOpen();
              const { user: dexieUser, isNew } = await provisionDexieUser(fbUser);
              // If the user already exists AND we already have a matching
              // session active, don't clobber it (avoids churn of session
              // rows during the subscription's initial synchronous fire).
              const sessionStillValid =
                session &&
                session.userId === dexieUser.id &&
                new Date(session.expiresAt) > new Date();
              setUser(dexieUser);
              if (!sessionStillValid) {
                const newSession = await createDexieSession(dexieUser.id!);
                setSession(newSession);
              }
              setAuthMode('firebase');
              if (!isNew) {
                // Initial mount (existing user restored from cache) — log softly.
                console.debug('Restored existing Firebase mirror user:', dexieUser.email);
              }
              // Kick off cloud sync automatically for Firebase-backed users
              // so their inventories / profile / settings travel to other
              // devices. Dexie-only / anonymous users skip this path.
              void firebaseSyncService.autoEnableForFirebaseUser(fbUser.uid);
            } catch (err) {
              console.error('Failed to provision user from Firebase auth change:', err);
            }
          } else if (!fbUser) {
            // Firebase says no signed-in user. Only clear Dexie state if the
            // local Dexie session was previously firebase-backed AND expired.
            // Otherwise we'd wipe a valid offline Dexie session on every mount.
            setSession((prev) => {
              const stillValid =
                prev && prev.id && new Date(prev.expiresAt) > new Date();
              if (!stillValid) {
                setUser(null);
                setAuthMode('dexie');
                return null;
              }
              return prev;
            });
          }
        });
        fbSubscriptionEstablished = true;
      } catch (err) {
        console.warn('Firebase auth subscription unavailable, using Dexie-only mode:', err);
        if (mounted) setAuthMode('dexie');
      } finally {
        // Regardless of Firebase availability, always run the first session
        // check once (Dexie path handles both local-session and no-session).
        if (mounted) {
          void checkSession();
        }
      }
    })();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
      void fbSubscriptionEstablished;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbInitialized]);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      authMutationInFlight.current = true;
      setIsLoading(true);
      await ensureDbOpen();

      let fbUser: FirebaseUser | null = null;
      let fbError: unknown = null;
      let firebaseAvailable = false;

      try {
        await firebaseService.initialize();
        firebaseAvailable = true;
        fbUser = await firebaseService.signInEmail(email, password);
        console.log('✅ Firebase login successful for:', email);
      } catch (err) {
        fbError = err;
        console.warn('Firebase sign-in failed, checking Dexie fallback:', err);
      }

      if (firebaseAvailable && fbUser) {
        const { user: dexieUser } = await provisionDexieUser(fbUser, { password });
        const newSession = await createDexieSession(dexieUser.id!);
        setUser(dexieUser);
        setSession(newSession);
        setAuthMode('firebase');
        return { success: true, message: 'Login successful! Redirecting to dashboard...' };
      }

      // Dexie fallback (also handles users whose Firebase creds haven't been
      // created yet, or when Firebase isn't configured).
      const allUsers = await db.users.toArray();
      const dexieLookup = allUsers.find((u) => u.email === email);
      if (!dexieLookup) {
        if (firebaseAvailable && fbError) {
          return {
            success: false,
            message: firebaseService.mapFirebaseError(fbError),
          };
        }
        return {
          success: false,
          message:
            'No account found with this email address. Please check your email or create a new account.',
        };
      }

      if (dexieLookup.password !== password) {
        return {
          success: false,
          message: 'Incorrect password. Please try again or reset your password.',
        };
      }

      const newSession = await createDexieSession(dexieLookup.id!);
      setUser(dexieLookup);
      setSession(newSession);
      setAuthMode(dexieLookup.firebaseUid ? 'firebase' : 'dexie');
      console.log('Login successful (Dexie fallback) for user:', dexieLookup.email);
      return { success: true, message: 'Login successful! Redirecting to dashboard...' };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: 'An unexpected error occurred during login. Please try again.',
      };
    } finally {
      authMutationInFlight.current = false;
      setIsLoading(false);
    }
  };

  const register = async (
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'firebaseUid'>,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      authMutationInFlight.current = true;
      setIsLoading(true);
      await ensureDbOpen();

      const allUsers = await db.users.toArray();
      const existingUser = allUsers.find((u) => u.email === userData.email);
      if (existingUser) {
        return {
          success: false,
          message:
            'An account with this email already exists. Please use a different email or try logging in.',
        };
      }

      let fbUser: FirebaseUser | null = null;
      let fbError: unknown = null;
      let firebaseAvailable = false;

      try {
        await firebaseService.initialize();
        firebaseAvailable = true;
        fbUser = await firebaseService.signUpEmail(userData.email, userData.password);
        console.log('✅ Firebase sign-up successful for:', userData.email);
      } catch (err) {
        fbError = err;
        console.warn('Firebase sign-up failed, falling back to Dexie-only registration:', err);
      }

      if (firebaseAvailable && fbError && !fbUser) {
        const mapped = firebaseService.mapFirebaseError(fbError);
        return { success: false, message: mapped };
      }

      const now = new Date();
      const user: Omit<User, 'id'> = {
        ...userData,
        firebaseUid: fbUser ? fbUser.uid : undefined,
        createdAt: now,
        updatedAt: now,
      };

      const userId = await db.users.add(user as User);
      const savedUser: User = { ...user, id: userId } as User;

      const organizationId = await db.organizations.add({
        name: `${userData.name}'s Business`,
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      });

      await db.userOrganizations.add({
        userId,
        organizationId,
        role: userData.role,
        joinedAt: now,
      });

      const userProfile: UserProfile = {
        id: `profile-${userId}`,
        businessName: `${userData.name}'s Business`,
        email: userData.email,
        lowStockThreshold: 0,
        showLowStockWarnings: true,
        autoBackupFrequency: 24,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        userId,
      };
      await db.userProfile.put(userProfile);

      const newSession = await createDexieSession(userId);
      setUser(savedUser);
      setSession(newSession);
      setAuthMode(fbUser ? 'firebase' : 'dexie');

      console.log('User registered successfully with ID:', userId);
      return { success: true, message: 'Account created successfully! Redirecting to dashboard...' };
    } catch (error) {
      console.error('Registration failed:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        return { success: false, message: firebaseService.mapFirebaseError(error) };
      }
      return {
        success: false,
        message: 'Registration failed due to an unexpected error. Please try again.',
      };
    } finally {
      authMutationInFlight.current = false;
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
      try {
        await firebaseService.initialize();
        if (firebaseService.currentUser) {
          await firebaseService.signOut();
        }
      } catch (err) {
        console.warn('Firebase sign-out not available:', err);
      }
      setUser(null);
      setSession(null);
      setAuthMode('unknown');
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      setUser(null);
      setSession(null);
      setAuthMode('unknown');
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordResetEmail = async (
    email: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await firebaseService.initialize();
      await firebaseService.sendPasswordResetEmail(email);
      return {
        success: true,
        message: `Password reset email sent to ${email}. Please check your inbox to continue.`,
      };
    } catch (error) {
      console.error('Password reset failed:', error);
      return {
        success: false,
        message: firebaseService.mapFirebaseError(error),
      };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    authMode,
    login,
    register,
    logout,
    checkSession,
    sendPasswordResetEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
