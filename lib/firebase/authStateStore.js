import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseClient } from './client';

const subscribers = new Set();
let cached = { user: null, loading: true };
let unsubscribe = null;

const start = () => {
  if (unsubscribe) return;
  const { auth } = getFirebaseClient();
  if (!auth) {
    cached = { user: null, loading: false };
    return;
  }
  unsubscribe = onAuthStateChanged(auth, (nextUser) => {
    cached = { user: nextUser, loading: false };
    subscribers.forEach((cb) => cb(cached));
  });
};

export const subscribeToAuthState = (cb) => {
  start();
  subscribers.add(cb);
  cb(cached);
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0 && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
};

export const peekAuthState = () => cached;
