import { WEEKDAY_KEYS } from './time';

const KIND_PRIORITY = {
  airingToday: 0,
  airingTomorrow: 1,
  newEpisode: 2,
  sequel: 3,
  finished: 4,
};

const dayKeyOf = (date) => {
  const js = date.getDay();
  return WEEKDAY_KEYS[js === 0 ? 6 : js - 1];
};

const ymd = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const buildScheduleIndex = (schedulesByDay) => {
  const idx = new Map();
  if (!schedulesByDay) return idx;
  for (const key of WEEKDAY_KEYS) {
    const list = Array.isArray(schedulesByDay[key]) ? schedulesByDay[key] : [];
    for (const anime of list) {
      const id = anime?.mal_id;
      if (!id) continue;
      const existing = idx.get(id);
      if (existing) {
        existing.days.add(key);
      } else {
        idx.set(id, { anime, days: new Set([key]) });
      }
    }
  }
  return idx;
};

const isDismissed = (id, dismissedIds) =>
  Array.isArray(dismissedIds) && dismissedIds.includes(id);

const animeIdFrom = (entry) => Number(entry?.id || entry?.mal_id);
const titleFrom = (entry, fallback = '') =>
  entry?.title || entry?.title_english || fallback || 'Untitled';
const posterFrom = (entry) =>
  entry?.image || entry?.posterUrl || entry?.images?.webp?.image_url || null;

export const computeNotifications = ({
  listEntries = [],
  schedulesByDay = null,
  relationsByFavorite = {},
  state = {},
  now = new Date(),
} = {}) => {
  const dismissedIds = state?.dismissedIds || [];
  const seenEpisodes = state?.seenEpisodes || {};
  const lastReadAt = Number.isFinite(state?.lastReadAt) ? state.lastReadAt : 0;
  const scheduleIndex = buildScheduleIndex(schedulesByDay);

  const todayKey = dayKeyOf(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = dayKeyOf(tomorrow);
  const todayYmd = ymd(now);
  const tomorrowYmd = ymd(tomorrow);

  const out = [];
  const nowMs = now.getTime();

  for (const entry of listEntries) {
    const malId = animeIdFrom(entry);
    if (!malId) continue;
    const title = titleFrom(entry);
    const poster = posterFrom(entry);
    const total = Number.isFinite(entry?.episodesTotal) ? entry.episodesTotal : null;
    const progress = Number.isFinite(entry?.progress) ? entry.progress : 0;
    const status = entry?.status;
    const scheduleEntry = scheduleIndex.get(malId);
    const isScheduledThisWeek = Boolean(scheduleEntry);
    const isWatching = status === 'watching';
    const isPlan = status === 'plan';

    if (isWatching && scheduleEntry?.days.has(todayKey)) {
      const id = `airingToday:${malId}:${todayYmd}`;
      if (!isDismissed(id, dismissedIds)) {
        out.push({
          id,
          kind: 'airingToday',
          malId,
          title,
          poster,
          href: `/anime/${malId}`,
          createdAt: nowMs,
        });
      }
    } else if (isWatching && scheduleEntry?.days.has(tomorrowKey)) {
      const id = `airingTomorrow:${malId}:${tomorrowYmd}`;
      if (!isDismissed(id, dismissedIds)) {
        out.push({
          id,
          kind: 'airingTomorrow',
          malId,
          title,
          poster,
          href: `/anime/${malId}`,
          createdAt: nowMs,
        });
      }
    }

    if (isWatching && Number.isFinite(total)) {
      const seenCount = Number.isFinite(seenEpisodes[String(malId)])
        ? seenEpisodes[String(malId)]
        : null;
      if (seenCount !== null && total > seenCount) {
        const id = `newEpisode:${malId}:${total}`;
        if (!isDismissed(id, dismissedIds)) {
          out.push({
            id,
            kind: 'newEpisode',
            malId,
            title,
            poster,
            href: `/anime/${malId}`,
            createdAt: nowMs,
            extra: { episodes: total, since: seenCount },
          });
        }
      }
    }

    if (
      (isWatching || isPlan) &&
      Number.isFinite(total) &&
      progress < total &&
      !isScheduledThisWeek
    ) {
      const id = `finished:${malId}`;
      if (!isDismissed(id, dismissedIds)) {
        out.push({
          id,
          kind: 'finished',
          malId,
          title,
          poster,
          href: `/anime/${malId}`,
          createdAt: nowMs,
          extra: { remaining: total - progress },
        });
      }
    }
  }

  for (const [favoriteIdRaw, relations] of Object.entries(relationsByFavorite || {})) {
    const favoriteId = Number(favoriteIdRaw);
    if (!Number.isFinite(favoriteId)) continue;
    const sequels = Array.isArray(relations?.sequels) ? relations.sequels : [];
    for (const sequel of sequels) {
      const sequelId = Number(sequel?.mal_id);
      if (!Number.isFinite(sequelId)) continue;
      const id = `sequel:${favoriteId}:${sequelId}`;
      if (isDismissed(id, dismissedIds)) continue;
      const favoriteEntry = listEntries.find(
        (e) => animeIdFrom(e) === favoriteId,
      );
      out.push({
        id,
        kind: 'sequel',
        malId: sequelId,
        title: sequel.title || 'Untitled',
        poster: sequel.poster || null,
        href: `/anime/${sequelId}`,
        createdAt: nowMs,
        extra: {
          parentMalId: favoriteId,
          parentTitle: favoriteEntry ? titleFrom(favoriteEntry) : '',
        },
      });
    }
  }

  out.sort((a, b) => {
    const pa = KIND_PRIORITY[a.kind] ?? 99;
    const pb = KIND_PRIORITY[b.kind] ?? 99;
    if (pa !== pb) return pa - pb;
    return String(a.title).localeCompare(String(b.title));
  });

  for (const n of out) {
    n.read = lastReadAt > 0 && n.createdAt <= lastReadAt;
  }

  return out;
};

export const baselineSeenEpisodes = (listEntries, currentSeen = {}) => {
  const patch = {};
  for (const entry of listEntries || []) {
    const malId = animeIdFrom(entry);
    if (!malId) continue;
    const total = Number.isFinite(entry?.episodesTotal) ? entry.episodesTotal : null;
    if (total === null) continue;
    if (entry?.status !== 'watching') continue;
    if (!Number.isFinite(currentSeen[String(malId)])) {
      patch[String(malId)] = total;
    }
  }
  return patch;
};
