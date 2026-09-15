// src/services/firebaseService.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  signInAnonymously,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig, debugFirebaseConfig } from '../config/firebase';

export class FirebaseService {
  private static instance: FirebaseService | null = null;
  private app: FirebaseApp | null = null;
  private authInstance: Auth | null = null;
  private firestoreInstance: Firestore | null = null;
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private initializationError: string | null = null;

  private constructor() {
    debugFirebaseConfig();
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  public isConfigValid(): boolean {
    const required = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
    const missing = required.filter(
      (key) =>
        !firebaseConfig[key] ||
        firebaseConfig[key].includes('your-'),
    );
    if (missing.length > 0) {
      console.error('❌ Missing Firebase config keys:', missing);
      return false;
    }
    return true;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      try {
        if (!this.isConfigValid()) {
          throw new Error('Invalid Firebase configuration. Please check your environment variables.');
        }

        if (getApps().length === 0) {
          this.app = initializeApp(firebaseConfig);
          console.log('✅ Firebase app initialized');
        } else {
          this.app = getApps()[0];
          console.log('✅ Using existing Firebase app');
        }

        this.authInstance = getAuth(this.app);
        this.firestoreInstance = getFirestore(this.app);
        this.initialized = true;
        this.initializationError = null;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.initializationError = message;
        console.error('❌ Firebase initialization failed:', message);
        throw error;
      } finally {
        this.initializing = null;
      }
    })();

    return this.initializing;
  }

  public isReady(): boolean {
    return this.initialized;
  }

  public getInitializationError(): string | null {
    return this.initializationError;
  }

  public get appInstance(): FirebaseApp {
    if (!this.app) throw new Error('Firebase app not initialized');
    return this.app;
  }

  public get auth(): Auth {
    if (!this.authInstance) throw new Error('Firebase Auth not initialized');
    return this.authInstance;
  }

  public get firestore(): Firestore {
    if (!this.firestoreInstance) throw new Error('Firestore not initialized');
    return this.firestoreInstance;
  }

  public get currentUser(): FirebaseUser | null {
    return this.authInstance?.currentUser ?? null;
  }

  public onUserChanged(callback: (user: FirebaseUser | null) => void): () => void {
    if (!this.authInstance) {
      throw new Error('Firebase Auth not initialized before subscribing');
    }
    return onAuthStateChanged(this.authInstance, callback);
  }

  public async signInEmail(email: string, password: string): Promise<FirebaseUser> {
    await this.initialize();
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    return cred.user;
  }

  public async signUpEmail(email: string, password: string): Promise<FirebaseUser> {
    await this.initialize();
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    return cred.user;
  }

  public async signInAnonymous(): Promise<FirebaseUser> {
    await this.initialize();
    const cred = await signInAnonymously(this.auth);
    return cred.user;
  }

  public async signOut(): Promise<void> {
    if (this.authInstance) {
      await firebaseSignOut(this.authInstance);
    }
  }

  public async sendPasswordResetEmail(email: string): Promise<void> {
    await this.initialize();
    await firebaseSendPasswordReset(this.auth, email);
  }

  public mapFirebaseError(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code;
      switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/invalid-password':
        case 'auth/user-not-found':
          return 'Invalid email or password. Please try again.';
        case 'auth/email-already-in-use':
          return 'An account with this email already exists. Please sign in instead.';
        case 'auth/invalid-email':
          return 'The email address you entered is not valid.';
        case 'auth/weak-password':
          return 'Password is too weak. Please use at least 6 characters.';
        case 'auth/operation-not-allowed':
          return 'This sign-in method is not enabled. Please contact support.';
        case 'auth/user-disabled':
          return 'This account has been disabled. Please contact support.';
        case 'auth/too-many-requests':
          return 'Too many requests. Please wait a moment and try again.';
        case 'auth/network-request-failed':
          return 'Network error. Please check your internet connection.';
        default:
          return `Authentication error (${code}). Please try again.`;
      }
    }
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred.';
  }
}

export const firebaseService = FirebaseService.getInstance();
