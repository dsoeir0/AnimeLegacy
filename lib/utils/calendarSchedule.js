import { WEEKDAY_KEYS, jstToLocalSlot } from './time';

// Takes Jikan's `schedulesByDay` object (keys = Monday..Sunday, values =
// arrays of entries with `.broadcast.time` in JST) and rebuckets it to the
// viewer's local timezone.
//
// Returns:
//   slots         Map<"dayKey:hour", Array<{ item, minute, localTime }>>
//                   — entries within a slot are sorted by local minute
//   hours         number[] — sorted, distinct local hours that hold ≥1 entry
//   countsByDay   Record<dayKey, number> — count per local day (post-shift)
//   timeByJst     Map<jst "HH:MM", local "HH:MM"> — for tooltip cross-ref
//
// SSR-safe: returns `null` when called with a non-object, so callers can
// detect "not yet hydrated" vs "empty payload".
export const bucketizeSchedule = (schedulesByDay) => {
  if (!schedulesByDay || typeof schedulesByDay !== 'object') return null;

  const slots = new Map();
  const countsByDay = Object.fromEntries(WEEKDAY_KEYS.map((k) => [k, 0]));
  const timeByJst = new Map();
  const hourSet = new Set();

  for (let jstIdx = 0; jstIdx < WEEKDAY_KEYS.length; jstIdx += 1) {
    const items = schedulesByDay[WEEKDAY_KEYS[jstIdx]] || [];
    for (const item of items) {
      const jstTime = item?.broadcast?.time;
      const slot = jstToLocalSlot(jstIdx, jstTime);
      if (!slot) continue;
      const localDayKey = WEEKDAY_KEYS[slot.dayIdx];
      const key = `${localDayKey}:${slot.hour}`;
      if (!slots.has(key)) slots.set(key, []);
      slots.get(key).push({ item, minute: slot.minute, localTime: slot.display });
      countsByDay[localDayKey] += 1;
      hourSet.add(slot.hour);
      if (jstTime) timeByJst.set(jstTime, slot.display);
    }
  }

  for (const entries of slots.values()) {
    entries.sort((a, b) => a.minute - b.minute);
  }

  const hours = Array.from(hourSet).sort((a, b) => a - b);
  return { slots, hours, countsByDay, timeByJst };
};
