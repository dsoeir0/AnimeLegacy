import { WEEKDAY_KEYS, jstToLocalSlot } from './time';

export const flattenAiringList = (schedulesByDay, now = new Date()) => {
  if (!schedulesByDay || typeof schedulesByDay !== 'object') return [];

  const localTodayIdx = (now.getDay() + 6) % 7;
  const items = [];

  for (let jstIdx = 0; jstIdx < WEEKDAY_KEYS.length; jstIdx += 1) {
    const list = schedulesByDay[WEEKDAY_KEYS[jstIdx]];
    if (!Array.isArray(list)) continue;
    for (const anime of list) {
      const time = anime?.broadcast?.time;
      const slot = jstToLocalSlot(jstIdx, time);
      if (!slot) continue;
      const daysFromToday = (slot.dayIdx - localTodayIdx + 7) % 7;
      items.push({
        anime,
        localDayKey: WEEKDAY_KEYS[slot.dayIdx],
        localTime: slot.display,
        localHour: slot.hour,
        localMinute: slot.minute,
        daysFromToday,
      });
    }
  }

  items.sort((a, b) => {
    if (a.daysFromToday !== b.daysFromToday) return a.daysFromToday - b.daysFromToday;
    return a.localHour * 60 + a.localMinute - (b.localHour * 60 + b.localMinute);
  });

  return items;
};
