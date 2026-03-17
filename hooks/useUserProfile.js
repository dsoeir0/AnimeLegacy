import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getFirebaseClient } from '../lib/firebase/client';

export default function useUserProfile(uid) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return undefined;
    }
    const { db } = getFirebaseClient();
    if (!db) return undefined;

    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(ref, (snapshot) => {
      setProfile(snapshot.exists() ? snapshot.data() : null);
    });
    return () => unsub();
  }, [uid]);

  return profile;
}
