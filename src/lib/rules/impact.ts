import type { Item } from '../types.ts';
import { MEALS_PER_DONATED_ITEM } from './surplus.ts';

export type MonthSummary = {
  /** YYYY-MM */
  month: string;
  rescued: number;
  donated: number;
  wasted: number;
  entries: Item[];
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date, not UTC — otherwise users east of UTC see yesterday's date. */
function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthKey(iso: string): string {
  return localDate(iso).slice(0, 7);
}

/** Resolved items grouped by the month they were resolved, newest month first. Counts are units. */
export function monthlyHistory(items: Item[]): MonthSummary[] {
  const months = new Map<string, MonthSummary>();
  const resolved = items
    .filter((item) => item.status !== 'active' && item.resolvedAt)
    .sort((a, b) => b.resolvedAt!.localeCompare(a.resolvedAt!));

  for (const item of resolved) {
    const key = monthKey(item.resolvedAt!);
    const summary = months.get(key) ?? { month: key, rescued: 0, donated: 0, wasted: 0, entries: [] };
    if (item.status === 'used') summary.rescued += item.quantity;
    if (item.status === 'donated') summary.donated += item.quantity;
    if (item.status === 'wasted') summary.wasted += item.quantity;
    summary.entries.push(item);
    months.set(key, summary);
  }
  return [...months.values()];
}

export function unitsToMeals(units: number): number {
  return Math.round(units * MEALS_PER_DONATED_ITEM);
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per resolved item — the Pro export. */
export function historyToCsv(items: Item[]): string {
  const header = ['date', 'item', 'category', 'quantity', 'outcome', 'drop_off'];
  const rows = monthlyHistory(items)
    .flatMap((m) => m.entries)
    .map((item) => [
      localDate(item.resolvedAt!),
      item.name,
      item.category,
      item.quantity,
      { used: 'rescued', donated: 'donated', wasted: 'wasted', active: '' }[item.status],
      item.donatedTo ?? '',
    ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
