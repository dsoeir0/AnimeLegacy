import { useEffect, useState } from 'react';
import useAuth from './useAuth';
import { getFirebaseClient } from '../lib/firebase/client';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ensureAnimeCatalog } from '../lib/services/animeCatalog';
import { addUserActivity, upsertUserAnime, updateUserAnime } from '../lib/services/userAnime';

export default function useMyList() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const canEdit = Boolean(user?.uid);

  useEffect(() => {
    let unsubscribe = null;

    const loadRemote = async () => {
      const { db } = getFirebaseClient();
      if (!db || !user?.uid) {
        setList([]);
        setHasLoaded(true);
        return;
      }
      const listRef = collection(db, 'users', user.uid, 'list');
      const listQuery = query(listRef, orderBy('addedAt', 'desc'));
      unsubscribe = onSnapshot(listQuery, (snapshot) => {
        const items = snapshot.docs.map((docItem) => docItem.data());
        setList(items);
        setHasLoaded(true);
      });
    };

    loadRemote();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid]);

  const addItem = async (item) => {
    if (!item?.id || !user?.uid) return false;
    const safeId = String(item.id);
    const { db } = getFirebaseClient();
    if (db) {
      const payload = { ...item, id: safeId, addedAt: serverTimestamp() };
      await setDoc(doc(db, 'users', user.uid, 'list', safeId), payload, { merge: true });
      await ensureAnimeCatalog(item);
      await upsertUserAnime({
        uid: user.uid,
        anime: item,
        overrides: {
          status: 'plan',
          addedAt: serverTimestamp(),
        },
      });
      await addUserActivity({
        uid: user.uid,
        activity: {
          animeId: safeId,
          title: item.title || 'Untitled',
          posterUrl: item.image || '',
          type: 'added_to_list',
          label: 'Added to Plan to Watch',
        },
      });
      return true;
    }
    return false;
  };

  const removeItem = async (id) => {
    if (!user?.uid) return false;
    const safeId = String(id);
    const { db } = getFirebaseClient();
    if (db) {
      await deleteDoc(doc(db, 'users', user.uid, 'list', safeId));
      await updateUserAnime({
        uid: user.uid,
        animeId: safeId,
        patch: { status: 'removed', removedAt: serverTimestamp() },
      });
      await addUserActivity({
        uid: user.uid,
        activity: {
          animeId: safeId,
          type: 'removed_from_list',
          label: 'Removed from list',
        },
      });
      return true;
    }
    return false;
  };

  const isInList = (id) => list.some((entry) => String(entry.id) === String(id));

  return { list, addItem, removeItem, isInList, hasLoaded, canEdit };
}
