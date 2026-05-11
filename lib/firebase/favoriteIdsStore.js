import { collection, onSnapshot } from 'firebase/firestore';
import { createSubscriberStore } from './createSubscriberStore';
import { getFirebaseClient } from './client';

const { subscribe, peek } = createSubscriberStore((key, onValue) => {
  const { db } = getFirebaseClient();
  if (!db) return () => {};
  const [uid, collectionName] = key.split('::');
  const ref = collection(db, 'users', uid, collectionName);
  return onSnapshot(ref, (snapshot) => {
    const ids = new Set(snapshot.docs.map((d) => String(d.id)));
    onValue(ids);
  });
});

export const subscribeToFavoriteIds = (uid, collectionName, cb) =>
  subscribe(`${uid}::${collectionName}`, cb);

export const peekFavoriteIds = (uid, collectionName) =>
  peek(`${uid}::${collectionName}`);
