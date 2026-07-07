import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { subscribeToUserList } from '../lib/firebase/userListStore';
import {
  dismissNotifications,
  markAllRead,
  peekNotificationState,
  setSeenEpisodes,
  subscribeToNotificationState,
} from '../lib/firebase/notificationStateStore';
import {
  baselineSeenEpisodes,
  buildSeenPatchFromNotifications,
  computeNotifications,
  filterUnconfirmedDismissed,
  mergeOptimisticState,
  shouldClearOptimisticReadAt,
} from '../lib/utils/notifications';

const EMPTY_STATE = { lastReadAt: null, dismissedIds: [], seenEpisodes: {} };

let dataCache = null;
let dataPromise = null;
let dataExpires = 0;
const DATA_TTL_MS = 5 * 60 * 1000;

const ensureNotificationData = (favoriteIds) => {
  const now = Date.now();
  if (dataCache && now < dataExpires) return Promise.resolve(dataCache);
  if (dataPromise) return dataPromise;
  const params = new URLSearchParams({ schedules: '1' });
  if (favoriteIds.length) params.set('favorites', favoriteIds.join(','));
  dataPromise = fetch(`/api/notifications-data?${params.toString()}`)
    .then((r) => (r.ok ? r.json() : { schedulesByDay: null, relationsByFavorite: {} }))
    .catch(() => ({ schedulesByDay: null, relationsByFavorite: {} }))
    .then((value) => {
      dataCache = value;
      dataExpires = Date.now() + DATA_TTL_MS;
      dataPromise = null;
      return value;
    });
  return dataPromise;
};

export default function useNotifications(uid) {
  const [listEntries, setListEntries] = useState([]);
  const [state, setState] = useState(EMPTY_STATE);
  const [remote, setRemote] = useState({ schedulesByDay: null, relationsByFavorite: {} });
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [optimisticDismissed, setOptimisticDismissed] = useState([]);
  const [optimisticReadAt, setOptimisticReadAt] = useState(null);
  const baselineRef = useRef(false);

  useEffect(() => {
    if (!uid) {
      setListEntries([]);
      return undefined;
    }
    return subscribeToUserList(uid, (data) => {
      setListEntries(Array.isArray(data) ? data : []);
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setState(EMPTY_STATE);
      baselineRef.current = false;
      return undefined;
    }
    return subscribeToNotificationState(uid, (data) => {
      setState(data || EMPTY_STATE);
    });
  }, [uid]);

  useEffect(() => {
    if (shouldClearOptimisticReadAt(state.lastReadAt, optimisticReadAt)) {
      setOptimisticReadAt(null);
    }
  }, [state.lastReadAt, optimisticReadAt]);

  useEffect(() => {
    if (optimisticDismissed.length === 0) return;
    const remaining = filterUnconfirmedDismissed(optimisticDismissed, state.dismissedIds);
    if (remaining.length !== optimisticDismissed.length) {
      setOptimisticDismissed(remaining);
    }
  }, [state.dismissedIds, optimisticDismissed]);

  const favoriteIds = useMemo(
    () =>
      listEntries
        .filter((e) => e?.isFavorite)
        .map((e) => Number(e?.id || e?.mal_id))
        .filter((id) => Number.isFinite(id) && id > 0)
        .slice(0, 12),
    [listEntries],
  );

  const ensureData = useCallback(() => {
    setLoadingRemote(true);
    ensureNotificationData(favoriteIds)
      .then((value) => setRemote(value))
      .finally(() => setLoadingRemote(false));
  }, [favoriteIds]);

  useEffect(() => {
    if (!uid || listEntries.length === 0) return;
    if (baselineRef.current) return;
    baselineRef.current = true;
    const patch = baselineSeenEpisodes(listEntries, state.seenEpisodes);
    if (Object.keys(patch).length > 0) {
      setSeenEpisodes(uid, patch, state.seenEpisodes).catch(() => {});
    }
  }, [uid, listEntries, state.seenEpisodes]);

  const effectiveState = useMemo(
    () => mergeOptimisticState(state, optimisticDismissed, optimisticReadAt),
    [state, optimisticDismissed, optimisticReadAt],
  );

  const notifications = useMemo(
    () =>
      computeNotifications({
        listEntries,
        schedulesByDay: remote.schedulesByDay,
        relationsByFavorite: remote.relationsByFavorite,
        state: effectiveState,
      }),
    [listEntries, remote, effectiveState],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const handleMarkAllRead = useCallback(() => {
    if (!uid) return Promise.resolve();
    setOptimisticReadAt(Date.now());
    return markAllRead(uid).catch((err) => {
      console.error('[notifications] markAllRead failed:', err);
      setOptimisticReadAt(null);
    });
  }, [uid]);

  const handleClearAll = useCallback(() => {
    if (!uid) return Promise.resolve();
    const current = peekNotificationState(uid)?.seenEpisodes || state.seenEpisodes || {};
    const ids = notifications.map((n) => n.id);
    const seenPatch = buildSeenPatchFromNotifications(notifications);
    setOptimisticDismissed((prev) => [...prev, ...ids]);
    const rollback = () => {
      setOptimisticDismissed((prev) => prev.filter((id) => !ids.includes(id)));
    };
    const promises = [
      dismissNotifications(uid, ids).catch((err) => {
        console.error('[notifications] dismissAll failed:', err);
        rollback();
      }),
    ];
    if (Object.keys(seenPatch).length > 0) {
      promises.push(
        setSeenEpisodes(uid, seenPatch, current).catch((err) => {
          console.error('[notifications] setSeenEpisodes failed:', err);
        }),
      );
    }
    return Promise.all(promises);
  }, [uid, notifications, state.seenEpisodes]);

  const handleDismiss = useCallback(
    (id) => {
      if (!uid || !id) return Promise.resolve();
      setOptimisticDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return dismissNotifications(uid, [id]).catch((err) => {
        console.error('[notifications] dismiss failed:', err);
        setOptimisticDismissed((prev) => prev.filter((x) => x !== id));
      });
    },
    [uid],
  );

  return {
    notifications,
    unreadCount,
    loading: loadingRemote,
    ensureData,
    markAllRead: handleMarkAllRead,
    clearAll: handleClearAll,
    dismiss: handleDismiss,
  };
}
