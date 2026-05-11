import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { createSubscriberStore } from './createSubscriberStore';
import { getFirebaseClient } from './client';

const { subscribe, peek } = createSubscriberStore((uid, onValue) => {
  const { db } = getFirebaseClient();
  if (!db) return () => {};
  const listRef = collection(db, 'users', uid, 'list');
  const listQuery = query(listRef, orderBy('addedAt', 'desc'));
  return onSnapshot(listQuery, (snapshot) => {
    onValue(snapshot.docs.map((d) => d.data()));
  });
});

export const subscribeToUserList = subscribe;
export const peekUserList = peek;
