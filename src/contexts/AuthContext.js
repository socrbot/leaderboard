import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { registerPush, unregisterPush } from '../notifications/registerPush';
import {
  isNativePlatform,
  isIOS,
  nativeSignInWithGoogle,
  nativeSignInWithApple,
  nativeSignOut,
} from '../services/nativeAuth';

const AuthContext = createContext(null);

// localStorage hint used purely to predict the initial UI (landing vs app skeleton)
// before Firebase's onAuthStateChanged resolves. It does NOT authorize anything;
// the server still requires a valid ID token for protected endpoints.
const AUTH_HINT_KEY = 'hadAuthSession';
const readAuthHint = () => {
  try { return typeof window !== 'undefined' && window.localStorage.getItem(AUTH_HINT_KEY) === '1'; } catch { return false; }
};
const writeAuthHint = (signedIn) => {
  try {
    if (typeof window === 'undefined') return;
    if (signedIn) window.localStorage.setItem(AUTH_HINT_KEY, '1');
    else window.localStorage.removeItem(AUTH_HINT_KEY);
  } catch { /* storage may be disabled */ }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);     // undefined = still loading
  const [userData, setUserData] = useState(null);  // Firestore users/{uid} doc

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        writeAuthHint(true);
        setUser(firebaseUser);
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setUserData(snap.data());
        } else {
          // First sign-in — create user doc with role 'user'
          const newUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'user',
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, newUser);
          setUserData(newUser);
        }
        // Register for push (no-op on web). Fire-and-forget — must not block
        // the auth flow if FCM is unavailable.
        registerPush().catch(() => {});
      } else {
        writeAuthHint(false);
        setUser(null);
        setUserData(null);
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (isNativePlatform()) {
      // Use the Capacitor plugin on iOS/Android — avoids popup restrictions.
      await nativeSignInWithGoogle(auth, GoogleAuthProvider, signInWithCredential);
      return;
    }
    // Web flow: popup with redirect fallback.
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const fallbackCodes = new Set([
        'auth/popup-blocked',
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/operation-not-supported-in-this-environment',
      ]);
      if (e && fallbackCodes.has(e.code)) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw e;
    }
  };

  /**
   * Sign in with Apple.
   * - Native iOS: uses Capacitor plugin (no popup, best UX)
   * - Web / Android: falls back to Firebase OAuthProvider popup with redirect fallback
   * Apple Sign-In must be configured in Firebase Console → Authentication → Apple provider.
   */
  const signInWithApple = async () => {
    if (isNativePlatform()) {
      await nativeSignInWithApple(auth, OAuthProvider, signInWithCredential);
      return;
    }
    // Web flow — same popup + redirect fallback pattern used by Google
    const provider = new OAuthProvider('apple.com');
    provider.addScope('name');
    provider.addScope('email');
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const fallbackCodes = new Set([
        'auth/popup-blocked',
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/operation-not-supported-in-this-environment',
      ]);
      if (e && fallbackCodes.has(e.code)) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw e;
    }
  };

  const signOut = async () => {
    // Best-effort: remove this device's FCM token before clearing auth so the
    // backend can stop targeting it.
    try { await unregisterPush(); } catch { /* ignore */ }
    if (isNativePlatform()) {
      try { await nativeSignOut(); } catch { /* ignore */ }
    }
    await firebaseSignOut(auth);
  };

  const getIdToken = async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  const refreshUserData = async () => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      setUserData(snap.data());
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, signInWithGoogle, signInWithApple, signOut, getIdToken, refreshUserData, hadAuthSession: readAuthHint(), isIOS: isIOS() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
