import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);     // undefined = still loading
  const [userData, setUserData] = useState(null);  // Firestore users/{uid} doc

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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
        setUser(null);
        setUserData(null);
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
    <AuthContext.Provider value={{ user, userData, signInWithGoogle, signOut, getIdToken, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
