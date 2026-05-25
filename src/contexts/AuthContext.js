import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

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
      } else {
        writeAuthHint(false);
        setUser(null);
        setUserData(null);
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      // Popup blockers, third-party cookie restrictions, or duplicate popup requests
      // all cause signInWithPopup to fail. Fall back to a redirect so sign-in still works
      // on iOS Safari / locked-down browsers.
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
    <AuthContext.Provider value={{ user, userData, signInWithGoogle, signOut, getIdToken, refreshUserData, hadAuthSession: readAuthHint() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
