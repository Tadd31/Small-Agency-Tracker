import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let isSigningIn = false;
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutes (Google tokens last 60 minutes)

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem('ts_sheets_token');
  const storedAtStr = sessionStorage.getItem('ts_sheets_token_ts');
  if (!token || !storedAtStr) return null;

  const storedAt = parseInt(storedAtStr, 10);
  if (isNaN(storedAt) || Date.now() - storedAt > TOKEN_TTL_MS) {
    sessionStorage.removeItem('ts_sheets_token');
    sessionStorage.removeItem('ts_sheets_token_ts');
    return null;
  }
  return token;
};

let cachedAccessToken: string | null = getStoredToken();

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedAccessToken = getStoredToken();
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('ts_sheets_token');
        sessionStorage.removeItem('ts_sheets_token_ts');
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ts_sheets_token', cachedAccessToken);
      sessionStorage.setItem('ts_sheets_token_ts', Date.now().toString());
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  cachedAccessToken = getStoredToken();
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('ts_sheets_token', token);
      sessionStorage.setItem('ts_sheets_token_ts', Date.now().toString());
    } else {
      sessionStorage.removeItem('ts_sheets_token');
      sessionStorage.removeItem('ts_sheets_token_ts');
    }
  }
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('ts_sheets_token');
    sessionStorage.removeItem('ts_sheets_token_ts');
  }
};
