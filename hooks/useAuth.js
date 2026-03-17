import { useCallback, useEffect, useState } from 'react';
import { getFirebaseClient } from '../lib/firebase/client';
import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  verifyPasswordResetCode,
} from 'firebase/auth';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { auth } = getFirebaseClient();
    if (!auth) {
      setLoading(false);
      return undefined;
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { auth, googleProvider, enabled } = getFirebaseClient();
    if (!enabled || !auth || !googleProvider) {
      const error = new Error('Firebase auth is not configured.');
      error.code = 'auth/not-configured';
      throw error;
    }
    return signInWithPopup(auth, googleProvider);
  }, []);

  const signOutUser = useCallback(async () => {
    const { auth } = getFirebaseClient();
    if (!auth) return;
    const uid = auth.currentUser?.uid;
    await signOut(auth);
    if (typeof window !== 'undefined') {
      const keys = ['animeLegacy.myList', uid ? `animeLegacy.myList.${uid}` : null].filter(Boolean);
      keys.forEach((key) => window.localStorage.removeItem(key));
    }
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    const { auth, enabled } = getFirebaseClient();
    if (!enabled || !auth) {
      const error = new Error('Firebase auth is not configured.');
      error.code = 'auth/not-configured';
      throw error;
    }
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    const { auth, enabled } = getFirebaseClient();
    if (!enabled || !auth) {
      const error = new Error('Firebase auth is not configured.');
      error.code = 'auth/not-configured';
      throw error;
    }
    return createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const sendPasswordReset = useCallback(async (email, actionCodeSettings) => {
    const { auth, enabled } = getFirebaseClient();
    if (!enabled || !auth) {
      const error = new Error('Firebase auth is not configured.');
      error.code = 'auth/not-configured';
      throw error;
    }
    return sendPasswordResetEmail(auth, email, actionCodeSettings);
  }, []);

  const verifyResetCode = useCallback(async (code) => {
    const { auth, enabled } = getFirebaseClient();
    if (!enabled || !auth) {
      const error = new Error('Firebase auth is not configured.');
      error.code = 'auth/not-configured';
      throw error;
    }
    return verifyPasswordResetCode(auth, code);
  }, []);

  const confirmResetPassword = useCallback(async (code, newPassword) => {
    const { auth, enabled } = getFirebaseClient();
    if (!enabled || !auth) {
      const error = new Error('Firebase auth is not configured.');
      error.code = 'auth/not-configured';
      throw error;
    }
    return confirmPasswordReset(auth, code, newPassword);
  }, []);

  return {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    verifyResetCode,
    confirmResetPassword,
    signOutUser,
  };
}
