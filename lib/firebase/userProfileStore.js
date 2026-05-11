import { doc, onSnapshot } from 'firebase/firestore';
import { createSubscriberStore } from './createSubscriberStore';
import { getFirebaseClient } from './client';

const { subscribe, peek } = createSubscriberStore((uid, onValue) => {
  const { db } = getFirebaseClient();
  if (!db) return () => {};
  const ref = doc(db, 'users', uid);
  return onSnapshot(ref, (snapshot) => {
    onValue(snapshot.exists() ? snapshot.data() : null);
  });
});

export const subscribeToUserProfile = subscribe;
export const peekUserProfile = peek;
