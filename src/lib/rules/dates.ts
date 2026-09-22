const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Whole calendar days from `now` until `iso`. 0 = today, 1 = tomorrow, -1 = yesterday.
 * Rounds rather than floors so a DST shift can't knock a day off.
 */
export function daysUntil(iso: string, now: Date): number {
  return Math.round((startOfLocalDay(new Date(iso)) - startOfLocalDay(now)) / MS_PER_DAY);
}

export function daysSince(iso: string, now: Date): number {
  return -daysUntil(iso, now);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
