// Pure helpers used by the profile page to turn a raw activity feed into
// the shapes its UI pieces need (streak days, grouped-by-day, verb labels).
// Kept framework-free so they can be unit-tested without React.

export const MONTH_ABBR = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export const toJsDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const dateKey = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Maps the free-form activity label string (stored by useMyList) back to
// a canonical verb used for iconography and styling. The label is the only
// thing we can inspect — we don't store the verb separately.
export const deriveVerb = (entry) => {
  const label = String(entry?.label || '').toLowerCase();
  if (label.includes('review')) return 'review';
  if (label.includes('completed')) return 'complete';
  if (label.includes('rated')) return 'rate';
  return 'watch';
};

// Count consecutive days ending today (or yesterday if today is empty)
// where the user logged *any* activity. Breaks the streak at the first
// missing day.
export const computeStreak = (activityAll) => {
  if (!Array.isArray(activityAll) || activityAll.length === 0) return 0;
  const days = new Set();
  activityAll.forEach((entry) => {
    const date = toJsDate(entry?.createdAt);
    if (!date) return;
    days.add(dateKey(date));
  });
  if (days.size === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayKey = dateKey(today);
  const yesterdayKey = dateKey(yesterday);
  if (!days.has(todayKey) && !days.has(yesterdayKey)) return 0;
  let streak = 0;
  const cursor = new Date(days.has(todayKey) ? today : yesterday);
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

// Produce 7 dots ending on today — each tagged active/today/off for the
// streak strip. Stable order: oldest first, today last.
export const buildStreakDots = (activityAll) => {
  const days = new Set();
  activityAll.forEach((entry) => {
    const date = toJsDate(entry?.createdAt);
    if (!date) return;
    days.add(dateKey(date));
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dots = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKey(d);
    dots.push({ key, active: days.has(key), today: i === 0 });
  }
  return dots;
};

// Group activity entries by local calendar day. Preserves source order
// within each group.
export const groupActivityByDay = (activityAll) => {
  const groups = new Map();
  activityAll.forEach((entry) => {
    const date = toJsDate(entry?.createdAt);
    if (!date) return;
    const key = dateKey(date);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        day: String(date.getDate()).padStart(2, '0'),
        mo: MONTH_ABBR[date.getMonth()],
        items: [],
      });
    }
    groups.get(key).items.push(entry);
  });
  return Array.from(groups.values());
};

// Tally genres across watched/completed items, keeping the top 5 with a
// percentage relative to the leader. Used to render the genre-bar card.
export const computeGenreBars = (animeItems) => {
  if (!Array.isArray(animeItems)) return [];
  const tally = new Map();
  animeItems.forEach((item) => {
    const progress = Number(item?.progress ?? 0);
    if (!(progress > 0) && item?.status !== 'completed') return;
    if (!Array.isArray(item?.genres)) return;
    item.genres.forEach((genre) => {
      const key = String(genre);
      tally.set(key, (tally.get(key) || 0) + 1);
    });
  });
  const ranked = Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = ranked.length ? ranked[0][1] : 1;
  return ranked.map(([name, count]) => ({
    name,
    count,
    pct: Math.round((count / max) * 100),
  }));
};
