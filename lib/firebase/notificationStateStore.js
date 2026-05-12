import {
  arrayUnion,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { createSubscriberStore } from './createSubscriberStore';
import { getFirebaseClient } from './client';

const STATE_DOC_ID = 'current';

const { subscribe, peek } = createSubscriberStore((uid, onValue) => {
  const { db } = getFirebaseClient();
  if (!db) return () => {};
  const ref = doc(db, 'users', uid, 'notificationState', STATE_DOC_ID);
  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      onValue({ lastReadAt: null, dismissedIds: [], seenEpisodes: {} });
      return;
    }
    const data = snapshot.data();
    onValue({
      lastReadAt: data?.lastReadAt?.toMillis ? data.lastReadAt.toMillis() : null,
      dismissedIds: Array.isArray(data?.dismissedIds) ? data.dismissedIds : [],
      seenEpisodes:
        data?.seenEpisodes && typeof data.seenEpisodes === 'object'
          ? data.seenEpisodes
          : {},
    });
  });
});

export const subscribeToNotificationState = subscribe;
export const peekNotificationState = peek;

const stateRef = (db, uid) => doc(db, 'users', uid, 'notificationState', STATE_DOC_ID);

export const markAllReadIn = async (db, uid) => {
  if (!db || !uid) return;
  await setDoc(stateRef(db, uid), { lastReadAt: serverTimestamp() }, { merge: true });
};

export const markAllRead = (uid) => markAllReadIn(getFirebaseClient().db, uid);

export const dismissNotificationsIn = async (db, uid, ids) => {
  if (!db || !uid || !Array.isArray(ids) || ids.length === 0) return;
  const cleanIds = ids.map(String).filter(Boolean);
  if (cleanIds.length === 0) return;
  await setDoc(
    stateRef(db, uid),
    { dismissedIds: arrayUnion(...cleanIds) },
    { merge: true },
  );
};

export const dismissNotifications = (uid, ids) =>
  dismissNotificationsIn(getFirebaseClient().db, uid, ids);

export const setSeenEpisodesIn = async (db, uid, patch, currentSeen = {}) => {
  if (!db || !uid || !patch || typeof patch !== 'object') return;
  const merged = { ...currentSeen };
  let changed = false;
  for (const [malId, count] of Object.entries(patch)) {
    if (Number.isFinite(count)) {
      const key = String(malId);
      const next = Number(count);
      if (merged[key] !== next) {
        merged[key] = next;
        changed = true;
      }
    }
  }
  if (!changed) return;
  await setDoc(stateRef(db, uid), { seenEpisodes: merged }, { merge: true });
};

export const setSeenEpisodes = (uid, patch, currentSeen) =>
  setSeenEpisodesIn(getFirebaseClient().db, uid, patch, currentSeen);
