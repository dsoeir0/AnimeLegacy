import { useEffect, useState } from 'react';
import useAuth from './useAuth';
import {
  peekFavoriteIds,
  subscribeToFavoriteIds,
} from '../lib/firebase/favoriteIdsStore';

const EMPTY = new Set();

export default function useFavoriteIds(collectionName) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [ids, setIds] = useState(() => peekFavoriteIds(uid, collectionName) || EMPTY);

  useEffect(() => {
    if (!uid || !collectionName) {
      setIds(EMPTY);
      return undefined;
    }
    return subscribeToFavoriteIds(uid, collectionName, setIds);
  }, [uid, collectionName]);

  return {
    ids,
    isFavorite: (id) => ids.has(String(id)),
    count: ids.size,
    canEdit: Boolean(uid),
  };
}
